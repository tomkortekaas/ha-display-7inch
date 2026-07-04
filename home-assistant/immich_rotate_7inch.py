#!/usr/bin/env python3
import io
import json
import os
import signal
import ssl
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime

import yaml
from PIL import Image, ImageOps

CONFIG_DIR = "/config" if os.path.exists("/config/secrets.yaml") else "/homeassistant"

with open(os.path.join(CONFIG_DIR, "secrets.yaml"), "r", encoding="utf-8") as f:
    SECRETS = yaml.safe_load(f) or {}

IMMICH_URL = str(SECRETS.get("immich_url", "")).rstrip("/")
IMMICH_KEY = str(SECRETS.get("immich_api_key", ""))
HA_TOKEN = str(SECRETS.get("immich_ha_token", ""))
PHOTO_BASE = str(SECRETS.get("immich_photo_base", "http://homeassistant.local:8123")).rstrip("/")
HA_API = str(SECRETS.get("immich_ha_api", "http://127.0.0.1:8123")).rstrip("/")
PHOTO_SWIPE_URL = str(SECRETS.get("photo_swipe_url", "")).rstrip("/")

OUT_DIR = os.path.join(CONFIG_DIR, "www", "immich")
STATE_JSON = os.path.join(OUT_DIR, "state.json")
OUT_JPG = os.path.join(OUT_DIR, "current.jpg")
NEXT_JPG = os.path.join(OUT_DIR, "next.jpg")
WIDTH = int(SECRETS.get("immich_photo_width", 1024))
HEIGHT = int(SECRETS.get("immich_photo_height", 600))
QUALITY = int(SECRETS.get("immich_photo_quality", 88))
TIMEOUT = 30
SCRIPT_TIMEOUT = 50
TRASH_CONFIRM_SECONDS = 5
MAX_HISTORY = 40

NL_MONTHS = [
    "",
    "januari",
    "februari",
    "maart",
    "april",
    "mei",
    "juni",
    "juli",
    "augustus",
    "september",
    "oktober",
    "november",
    "december",
]

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE


def request_json(url, method="GET", body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Accept", "application/json")
    if data is not None:
        req.add_header("Content-Type", "application/json")
    for key, value in (headers or {}).items():
        req.add_header(key, value)
    raw = urllib.request.urlopen(req, timeout=TIMEOUT, context=CTX).read()
    return json.loads(raw) if raw else {}


def immich(path, method="GET", body=None):
    return request_json(
        IMMICH_URL + path,
        method=method,
        body=body,
        headers={"x-api-key": IMMICH_KEY},
    )


def pick_asset():
    try:
        data = immich("/api/search/random", "POST", {"size": 1})
        if isinstance(data, list) and data:
            return data[0]
        if isinstance(data, dict):
            items = (data.get("assets") or {}).get("items") or data.get("items")
            if items:
                return items[0]
    except Exception as exc:
        sys.stderr.write(f"[immich] /api/search/random faalde, fallback: {exc}\n")

    data = immich("/api/assets/random?count=1")
    return data[0] if isinstance(data, list) else data


def get_asset(asset_id):
    return immich(f"/api/assets/{asset_id}")


def fetch_preview(asset_id):
    req = urllib.request.Request(f"{IMMICH_URL}/api/assets/{asset_id}/thumbnail?size=preview")
    req.add_header("x-api-key", IMMICH_KEY)
    raw = urllib.request.urlopen(req, timeout=TIMEOUT, context=CTX).read()
    img = Image.open(io.BytesIO(raw))
    return ImageOps.exif_transpose(img).convert("RGB")


def render_canvas(img, zoom=False):
    width, height = img.size
    portrait = height > width
    cover = zoom or not portrait
    canvas = Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0))

    if cover:
        scale = max(WIDTH / width, HEIGHT / height)
        new_size = (max(1, round(width * scale)), max(1, round(height * scale)))
        resized = img.resize(new_size, Image.LANCZOS)
        left = max(0, (new_size[0] - WIDTH) // 2)
        top = max(0, (new_size[1] - HEIGHT) // 2)
        return resized.crop((left, top, left + WIDTH, top + HEIGHT))

    scale = min(WIDTH / width, HEIGHT / height)
    new_size = (max(1, round(width * scale)), max(1, round(height * scale)))
    resized = img.resize(new_size, Image.LANCZOS)
    x = (WIDTH - new_size[0]) // 2
    y = (HEIGHT - new_size[1]) // 2
    canvas.paste(resized, (x, y))
    return canvas


def save_rendered(asset, path, zoom=False):
    img = fetch_preview(asset["id"])
    tmp = path + ".tmp"
    render_canvas(img, zoom=zoom).save(tmp, "JPEG", quality=QUALITY, optimize=True)
    os.replace(tmp, path)


def load_state():
    if not os.path.exists(STATE_JSON):
        return {"history": [], "index": -1, "next": None, "zoom": False}
    with open(STATE_JSON, "r", encoding="utf-8") as f:
        state = json.load(f)
    state.setdefault("history", [])
    state.setdefault("index", -1)
    state.setdefault("next", None)
    state.setdefault("zoom", False)
    state.setdefault("last_action", None)
    return state


def save_state(state):
    tmp = STATE_JSON + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)
    os.replace(tmp, STATE_JSON)


def first_text(*values):
    for value in values:
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return ""


def first_number(*values):
    for value in values:
        if value is None or value == "":
            continue
        try:
            return float(value)
        except (TypeError, ValueError):
            continue
    return None


def merge_asset_details(asset):
    if asset.get("_details_enriched"):
        return asset
    asset_id = asset.get("id")
    if not asset_id:
        return asset
    try:
        full = get_asset(asset_id)
    except Exception as exc:
        sys.stderr.write(f"[immich] volledige asset-details ophalen faalde: {exc}\n")
        return asset
    if not isinstance(full, dict):
        return asset
    merged = {**asset, **full}
    merged["exifInfo"] = {
        **(asset.get("exifInfo") or {}),
        **(full.get("exifInfo") or {}),
    }
    merged["_details_enriched"] = True
    return merged


def asset_summary(asset):
    asset = merge_asset_details(asset)
    return {
        "id": asset["id"],
        "originalFileName": asset.get("originalFileName") or asset.get("fileName") or "",
        "fileName": asset.get("fileName") or asset.get("originalFileName") or "",
        "localDateTime": asset.get("localDateTime") or asset.get("fileCreatedAt") or "",
        "fileCreatedAt": asset.get("fileCreatedAt") or "",
        "exifInfo": asset.get("exifInfo") or {},
        "originalPath": asset.get("originalPath") or "",
        "albumName": asset.get("albumName") or "",
        "libraryName": asset.get("libraryName") or "",
        "_details_enriched": bool(asset.get("_details_enriched")),
    }


def current_asset(state):
    idx = state.get("index", -1)
    history = state.get("history", [])
    if 0 <= idx < len(history):
        return history[idx]
    return None


def ensure_next(state):
    if state.get("next"):
        return
    try:
        next_asset = asset_summary(pick_asset())
        save_rendered(next_asset, NEXT_JPG, zoom=False)
        state["next"] = next_asset
    except Exception as exc:
        state["next"] = None
        try:
            if os.path.exists(NEXT_JPG):
                os.remove(NEXT_JPG)
        except OSError:
            pass
        sys.stderr.write(f"[immich] volgende foto voorladen faalde; probeer later opnieuw: {exc}\n")


def set_current(state, asset, already_rendered=False):
    history = state["history"][: state["index"] + 1]
    history.append(asset_summary(asset))
    if len(history) > MAX_HISTORY:
        history = history[-MAX_HISTORY:]
    state["history"] = history
    state["index"] = len(history) - 1
    state["zoom"] = False
    if already_rendered and os.path.exists(NEXT_JPG):
        os.replace(NEXT_JPG, OUT_JPG)
    else:
        save_rendered(state["history"][state["index"]], OUT_JPG, zoom=False)
    state["next"] = None
    state.pop("trash_pending_asset_id", None)
    state.pop("trash_pending_until", None)
    publish_current(state)
    ensure_next(state)
    save_state(state)


def fmt_place(asset):
    exif = asset.get("exifInfo") or {}
    parts = [
        first_text(exif.get("city"), exif.get("town"), exif.get("village")),
        first_text(exif.get("state"), exif.get("province"), exif.get("region")),
        first_text(exif.get("country"), exif.get("countryCode")),
    ]
    clean_parts = []
    seen = set()
    for part in parts:
        key = part.casefold()
        if part and key not in seen:
            clean_parts.append(part)
            seen.add(key)
    if clean_parts:
        return ", ".join(clean_parts)

    lat = first_number(exif.get("latitude"), asset.get("latitude"))
    lon = first_number(exif.get("longitude"), asset.get("longitude"))
    if lat is not None and lon is not None:
        return f"GPS {lat:.4f}, {lon:.4f}"

    return "Geen locatie"


def fmt_date(asset):
    exif = asset.get("exifInfo") or {}
    raw = exif.get("dateTimeOriginal") or asset.get("localDateTime") or asset.get("fileCreatedAt")
    if not raw:
        return "datum onbekend"
    try:
        dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        return f"{dt.day} {NL_MONTHS[dt.month]} {dt.year}"
    except Exception:
        return str(raw)[:10]


def fmt_album(asset):
    for key in ("albumName", "album", "libraryName"):
        value = asset.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    path = str(asset.get("originalPath") or "")
    if "/" in path:
        parent = path.rstrip("/").split("/")[-2]
        if parent:
            return parent[:80]
    return "Immich"


def set_state(entity, state, attrs=None):
    if not HA_TOKEN:
        raise RuntimeError(f"immich_ha_token ontbreekt in {CONFIG_DIR}/secrets.yaml")
    payload = {
        "state": str(state)[:255],
        "attributes": {
            "icon": "mdi:image",
            **(attrs or {}),
        },
    }
    req = urllib.request.Request(
        f"{HA_API}/api/states/{entity}",
        data=json.dumps(payload).encode(),
        method="POST",
    )
    req.add_header("Authorization", f"Bearer {HA_TOKEN}")
    req.add_header("Content-Type", "application/json")
    urllib.request.urlopen(req, timeout=10)


def publish_current(state, status="Immich foto actief"):
    asset = current_asset(state)
    if not asset:
        return
    if not asset.get("_details_enriched"):
        asset = asset_summary(asset)
        idx = state.get("index", -1)
        if 0 <= idx < len(state.get("history", [])):
            state["history"][idx] = asset
            save_state(state)
    photo_url = f"{PHOTO_BASE}/local/immich/current.jpg?v={int(time.time() * 1000)}"
    common_attrs = {
        "asset_id": asset["id"],
        "original_file_name": asset.get("originalFileName") or asset.get("fileName") or "",
        "photo_url": photo_url,
        "zoom": bool(state.get("zoom", False)),
        "trash_pending": bool(state.get("trash_pending_asset_id")),
    }
    set_state("sensor.immich_photo_url", photo_url, common_attrs)
    set_state("sensor.immich_place", fmt_place(asset), common_attrs)
    set_state("sensor.immich_date", fmt_date(asset), common_attrs)
    set_state("sensor.immich_album", fmt_album(asset), common_attrs)
    set_state("sensor.immich_status", status, common_attrs)
    print(photo_url)


def action_next(state):
    ensure_next(state)
    set_current(state, state["next"], already_rendered=True)


def action_prev(state):
    if state.get("index", -1) <= 0:
        publish_current(state, "Geen vorige foto")
        return
    state["index"] -= 1
    state["zoom"] = False
    save_rendered(current_asset(state), OUT_JPG, zoom=False)
    state.pop("trash_pending_asset_id", None)
    state.pop("trash_pending_until", None)
    publish_current(state, "Vorige foto")
    ensure_next(state)
    save_state(state)


def action_zoom(state):
    if not current_asset(state):
        action_next(state)
        return
    state["zoom"] = not state.get("zoom", False)
    save_rendered(current_asset(state), OUT_JPG, zoom=state["zoom"])
    publish_current(state, "Zoom aan" if state["zoom"] else "Zoom uit")
    ensure_next(state)
    save_state(state)


def trash_asset(asset_id):
    body = {"ids": [asset_id], "force": False}
    try:
        immich("/api/assets", "DELETE", body)
    except urllib.error.HTTPError as exc:
        if exc.code != 404:
            raise
        immich("/api/asset", "DELETE", body)


REVIEW_JPG = os.path.join(OUT_DIR, "review.jpg")
TOM_TAG = "voor-tom"
CHANEL_TAG = "voor-chanel"


def immich_replace_asset(asset_id, filepath):
    """Vervang de binary van een asset in Immich met een lokaal bestand (PUT /api/assets/{id})."""
    if not asset_id or not os.path.exists(filepath):
        return
    boundary = "ImmichRotateBoundary7inch"
    filename = os.path.basename(filepath)
    with open(filepath, "rb") as f:
        file_data = f.read()
    parts = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="assetData"; filename="{filename}"\r\n'
        f"Content-Type: image/jpeg\r\n\r\n"
    ).encode() + file_data + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(
        f"{IMMICH_URL}/api/assets/{asset_id}",
        data=parts,
        method="PUT",
    )
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    req.add_header("x-api-key", IMMICH_KEY)
    req.add_header("Accept", "application/json")
    try:
        urllib.request.urlopen(req, timeout=60, context=CTX).read()
    except Exception as exc:
        sys.stderr.write(f"[immich] replace_asset {asset_id} faalde: {exc}\n")


def notify_photo_swipe(asset_id, action, last_asset_id=None, add_tag=None):
    if not PHOTO_SWIPE_URL or not asset_id:
        return
    body = {"assetId": asset_id, "action": action}
    if last_asset_id:
        body["lastAssetId"] = last_asset_id
    if add_tag:
        body["addTag"] = add_tag
    try:
        request_json(f"{PHOTO_SWIPE_URL}/api/display-action", method="POST", body=body)
    except Exception:
        pass  # photo-swipe offline mag de display niet blokkeren


# ---------------------------------------------------------------------------
# Review modus — foto's van vandaag beoordelen
# ---------------------------------------------------------------------------

def review_asset_id(state):
    queue = state.get("review_queue", [])
    idx = state.get("review_idx", 0)
    return queue[idx] if 0 <= idx < len(queue) else None


def render_review_photo(asset_id):
    img = fetch_preview(asset_id)
    render_canvas(img).save(REVIEW_JPG + ".tmp", "JPEG", quality=QUALITY, optimize=True)
    os.replace(REVIEW_JPG + ".tmp", REVIEW_JPG)
    return get_asset(asset_id)


def publish_review(state, status="Aan het beoordelen"):
    asset_id = review_asset_id(state)
    queue = state.get("review_queue", [])
    idx = state.get("review_idx", 0)
    total = len(queue)

    if not asset_id or total == 0:
        for entity in ["sensor.immich_review_datum", "sensor.immich_review_locatie",
                       "sensor.immich_review_camera", "sensor.immich_review_bestand",
                       "sensor.immich_review_personen"]:
            set_state(entity, "")
        set_state("sensor.immich_review_voortgang", "0 / 0")
        set_state("sensor.immich_review_resterend", "0")
        set_state("sensor.immich_review_status", status)
        return

    asset = state.get("review_current_asset") or {}
    review_url = f"{PHOTO_BASE}/local/immich/review.jpg?v={int(time.time() * 1000)}"
    exif = asset.get("exifInfo") or {}
    make = (exif.get("make") or "").strip()
    model = (exif.get("model") or "").strip()
    camera = f"{make} {model}".strip() or "Onbekend"
    people = [p["name"] for p in (asset.get("people") or []) if p.get("name")]

    set_state("sensor.immich_review_url", review_url, {"asset_id": asset_id})
    set_state("sensor.immich_review_datum", fmt_date(asset))
    set_state("sensor.immich_review_locatie", fmt_place(asset))
    set_state("sensor.immich_review_camera", camera)
    set_state("sensor.immich_review_bestand", asset.get("originalFileName", ""))
    set_state("sensor.immich_review_personen", ", ".join(people) or "")
    set_state("sensor.immich_review_voortgang", f"{idx + 1} / {total}")
    set_state("sensor.immich_review_resterend", str(total - idx))
    set_state("sensor.immich_review_status", status)


def fetch_today_queue():
    if PHOTO_SWIPE_URL:
        try:
            result = request_json(f"{PHOTO_SWIPE_URL}/api/display-session/today",
                                  method="POST", body={})
            return result.get("assetIds", [])
        except Exception:
            pass
    # Fallback: Immich direct
    today = datetime.now()
    y, m, d = today.year, today.month, today.day
    result = immich("/api/search/metadata", "POST", {
        "takenAfter": f"{y}-{m:02d}-{d:02d}T00:00:00.000Z",
        "takenBefore": f"{y}-{m:02d}-{d:02d}T23:59:59.999Z",
        "size": 1000,
    })
    items = (result or {}).get("assets", {}).get("items", [])
    tags = immich("/api/tags")
    btag = next((t for t in (tags or []) if t["name"] == "beoordeeld"), None)
    if btag:
        reviewed_res = immich("/api/search/metadata", "POST", {
            "tagIds": [btag["id"]],
            "takenAfter": f"{y}-{m:02d}-{d:02d}T00:00:00.000Z",
            "takenBefore": f"{y}-{m:02d}-{d:02d}T23:59:59.999Z",
            "size": 1000,
        })
        reviewed = {a["id"] for a in (reviewed_res or {}).get("assets", {}).get("items", [])}
        items = [a for a in items if a["id"] not in reviewed]
    return [a["id"] for a in items]


def action_review_today(state):
    queue = fetch_today_queue()
    state["review_queue"] = queue
    state["review_idx"] = 0
    state["review_current_asset"] = None
    save_state(state)
    if not queue:
        set_state("sensor.immich_review_status", "Geen foto's meer vandaag")
        set_state("sensor.immich_review_voortgang", "0 / 0")
        set_state("sensor.immich_review_resterend", "0")
        return
    asset = render_review_photo(queue[0])
    state["review_current_asset"] = asset
    save_state(state)
    publish_review(state, "Review gestart")


def action_review_next(state):
    queue = state.get("review_queue", [])
    idx = state.get("review_idx", 0)
    if idx + 1 >= len(queue):
        set_state("sensor.immich_review_status", "Alle foto's beoordeeld!")
        set_state("sensor.immich_review_voortgang", f"{len(queue)} / {len(queue)}")
        set_state("sensor.immich_review_resterend", "0")
        return
    state["review_idx"] = idx + 1
    state["review_current_asset"] = None
    save_state(state)
    asset = render_review_photo(queue[state["review_idx"]])
    state["review_current_asset"] = asset
    save_state(state)
    publish_review(state)


def action_review_prev(state):
    idx = state.get("review_idx", 0)
    if idx <= 0:
        return
    state["review_idx"] = idx - 1
    state["review_current_asset"] = None
    queue = state.get("review_queue", [])
    save_state(state)
    asset = render_review_photo(queue[state["review_idx"]])
    state["review_current_asset"] = asset
    save_state(state)
    publish_review(state)


def _review_act(state, tags, ps_action, ps_tag=None, status="Bewaard"):
    asset_id = review_asset_id(state)
    if not asset_id:
        return
    add_tags(asset_id, tags)
    notify_photo_swipe(asset_id, ps_action, add_tag=ps_tag)
    action_review_next(state)


def action_review_keep(state):
    _review_act(state, ["beoordeeld"], "keep", status="Bewaard")


def action_review_trash(state):
    asset_id = review_asset_id(state)
    if not asset_id:
        return
    trash_asset(asset_id)
    notify_photo_swipe(asset_id, "trash")
    state["last_action"] = {"asset_id": asset_id, "action": "trash"}
    save_state(state)
    action_review_next(state)


def action_review_tom(state):
    _review_act(state, ["beoordeeld", TOM_TAG], "keep", ps_tag=TOM_TAG, status="Toegewezen aan Tom")


def action_review_chanel(state):
    _review_act(state, ["beoordeeld", CHANEL_TAG], "keep", ps_tag=CHANEL_TAG,
                status="Toegewezen aan Chanel")


def action_review_rotate(state):
    if not os.path.exists(REVIEW_JPG):
        return
    img = Image.open(REVIEW_JPG)
    img.rotate(-90, expand=True).save(REVIEW_JPG + ".tmp", "JPEG", quality=QUALITY, optimize=True)
    os.replace(REVIEW_JPG + ".tmp", REVIEW_JPG)
    asset = state.get("review_current_asset") or {}
    if asset.get("id"):
        immich_replace_asset(asset["id"], REVIEW_JPG)
    publish_review(state, "Geroteerd")


def action_review_count(state):
    """Update badge count zonder sessie aan te maken."""
    if PHOTO_SWIPE_URL:
        try:
            result = request_json(f"{PHOTO_SWIPE_URL}/api/display-session/today")
            set_state("sensor.immich_review_resterend", str(result.get("count", 0)))
            return
        except Exception:
            pass
    queue = fetch_today_queue()
    set_state("sensor.immich_review_resterend", str(len(queue)))


def get_or_create_tag(tag_name):
    tags = immich("/api/tags")
    tag = next((t for t in tags if t["name"] == tag_name), None)
    if not tag:
        tag = immich("/api/tags", "POST", {"name": tag_name})
    return tag


def add_tags(asset_id, tag_names):
    tag_ids = []
    for name in tag_names:
        tag = get_or_create_tag(name)
        if tag and tag.get("id"):
            tag_ids.append(tag["id"])
    if tag_ids:
        immich("/api/tags/assets", "PUT", {"assetIds": [asset_id], "tagIds": tag_ids})


def action_keep(state):
    asset = current_asset(state)
    if not asset:
        return
    asset_id = asset["id"]
    add_tags(asset_id, ["beoordeeld"])
    notify_photo_swipe(asset_id, "keep")
    state["last_action"] = {"asset_id": asset_id, "action": "keep"}
    action_next(state)
    publish_current(state, "Foto bewaard")


def action_skip(state):
    asset = current_asset(state)
    if not asset:
        return
    asset_id = asset["id"]
    add_tags(asset_id, ["beoordeeld", "twijfel"])
    notify_photo_swipe(asset_id, "skip")
    state["last_action"] = {"asset_id": asset_id, "action": "skip"}
    action_next(state)
    publish_current(state, "Foto overgeslagen")


def action_undo(state):
    last = state.get("last_action")
    last_asset_id = last["asset_id"] if last else None
    if last and last.get("action") == "trash":
        try:
            immich("/api/trash/assets/restore", "POST", {"ids": [last_asset_id]})
        except Exception:
            pass
    notify_photo_swipe(last_asset_id or "", "undo", last_asset_id)
    state["last_action"] = None
    action_prev(state)
    publish_current(state, "Laatste actie ongedaan")


def action_rotate(state):
    if not os.path.exists(OUT_JPG):
        return
    img = Image.open(OUT_JPG)
    rotated = img.rotate(-90, expand=True)
    tmp = OUT_JPG + ".tmp"
    rotated.save(tmp, "JPEG", quality=QUALITY, optimize=True)
    os.replace(tmp, OUT_JPG)
    asset = current_asset(state)
    if asset and asset.get("id"):
        immich_replace_asset(asset["id"], OUT_JPG)
    publish_current(state, "Foto geroteerd")


def action_trash(state, confirm=False):
    asset = current_asset(state)
    if not asset:
        publish_current(state, "Geen foto om te verwijderen")
        return
    now = time.time()
    pending_id = state.get("trash_pending_asset_id")
    pending_until = float(state.get("trash_pending_until", 0))
    if not confirm and pending_id == asset["id"] and now <= pending_until:
        confirm = True
    if not confirm:
        state["trash_pending_asset_id"] = asset["id"]
        state["trash_pending_until"] = now + TRASH_CONFIRM_SECONDS
        save_state(state)
        publish_current(state, "Tik nogmaals op prullenbak om te bevestigen")
        return
    if pending_id != asset["id"] or now > pending_until:
        state.pop("trash_pending_asset_id", None)
        state.pop("trash_pending_until", None)
        save_state(state)
        publish_current(state, "Prullenbak bevestiging verlopen")
        return
    asset_id = asset["id"]
    trash_asset(asset_id)
    notify_photo_swipe(asset_id, "trash")
    state["last_action"] = {"asset_id": asset_id, "action": "trash"}
    state.pop("trash_pending_asset_id", None)
    state.pop("trash_pending_until", None)
    action_next(state)
    publish_current(state, "Foto naar Immich prullenbak")


def main():
    if not IMMICH_URL or not IMMICH_KEY:
        raise RuntimeError(f"immich_url en immich_api_key ontbreken in {CONFIG_DIR}/secrets.yaml")
    if hasattr(signal, "SIGALRM"):
        def script_timeout(_signum, _frame):
            raise TimeoutError(f"script duurde langer dan {SCRIPT_TIMEOUT} seconden")

        signal.signal(signal.SIGALRM, script_timeout)
        signal.alarm(SCRIPT_TIMEOUT)
    os.makedirs(OUT_DIR, exist_ok=True)
    try:
        state = load_state()
        action = sys.argv[1] if len(sys.argv) > 1 else "next"

        if action == "next":
            action_next(state)
        elif action == "prev":
            action_prev(state)
        elif action == "zoom":
            action_zoom(state)
        elif action == "trash":
            action_trash(state, confirm=False)
        elif action == "confirm-trash":
            action_trash(state, confirm=True)
        elif action == "keep":
            action_keep(state)
        elif action == "skip":
            action_skip(state)
        elif action == "undo":
            action_undo(state)
        elif action == "rotate":
            action_rotate(state)
        elif action == "review-today":
            action_review_today(state)
        elif action == "review-next":
            action_review_next(state)
        elif action == "review-prev":
            action_review_prev(state)
        elif action == "review-keep":
            action_review_keep(state)
        elif action == "review-trash":
            action_review_trash(state)
        elif action == "review-tom":
            action_review_tom(state)
        elif action == "review-chanel":
            action_review_chanel(state)
        elif action == "review-rotate":
            action_review_rotate(state)
        elif action == "review-count":
            action_review_count(state)
        elif action == "refresh":
            if current_asset(state):
                save_rendered(current_asset(state), OUT_JPG, zoom=state.get("zoom", False))
                publish_current(state)
                ensure_next(state)
                save_state(state)
            else:
                action_next(state)
        else:
            raise RuntimeError(f"Onbekende actie: {action}")
    finally:
        if hasattr(signal, "SIGALRM"):
            signal.alarm(0)


if __name__ == "__main__":
    main()
