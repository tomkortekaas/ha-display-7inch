#!/usr/bin/env python3
"""Build one Buienradar rain-radar sheet for the 7-inch ESPHome display.

Buienradar serves every frame of the forecast side by side in one sprite. This
script stacks those frames vertically into a single JPEG, so the display does one
download and one decode per update and animates by shifting the image offset.

The last stdout line is the metadata the display needs for its labels:
``<epoch of frame 0>|<frame count>|<step in seconds>``. The automation stores it
in ``input_text.ha_display_radar_meta``. On failure the previous sheet stays in
place and the script exits non-zero, so the display keeps its last good radar.
"""

from __future__ import annotations

import io
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image


FRAME_WIDTH = 550  # Buienradar's maximum width/height for this map
FRAME_HEIGHT = 512
FRAME_COUNT = 12  # nu t/m +110 min
STEP_SECONDS = 600  # Buienradar forecast frames are 10 minutes apart

SPRITE_URL = (
    "https://image.buienradar.nl/2.0/image/sprite/RadarMapRainNL"
    f"?width={FRAME_WIDTH}&height={FRAME_HEIGHT}"
    "&renderBackground=True&renderBranding=False&renderText=False"
    f"&History=0&Forecast={FRAME_COUNT}"
)
OUT_DIR = Path(os.environ.get("RADAR_OUT_DIR", "/config/www/ha-display-radar"))
SHEET_NAME = "radar_sheet.jpg"

# The CDN redirect names the issue time (UTC) of frame 0, e.g.
# .../RadarMapRainNL/Sprite/202610020840__550x512_..._run202610020830.png
ISSUE_RE = re.compile(r"/Sprite/(\d{12})__")


def download() -> tuple[bytes, str]:
    req = urllib.request.Request(SPRITE_URL, headers={"User-Agent": "ha-display-7/2.0"})
    with urllib.request.urlopen(req, timeout=20) as response:
        return response.read(), response.geturl()


def issue_epoch(final_url: str) -> int:
    match = ISSUE_RE.search(final_url)
    if not match:
        raise RuntimeError(f"no issue time in Buienradar URL: {final_url}")
    issued = datetime.strptime(match.group(1), "%Y%m%d%H%M").replace(tzinfo=timezone.utc)
    return int(issued.timestamp())


def build_sheet(sprite: Image.Image) -> Image.Image:
    if sprite.height != FRAME_HEIGHT or sprite.width % FRAME_WIDTH:
        raise RuntimeError(f"unexpected sprite size {sprite.width}x{sprite.height}")
    available = sprite.width // FRAME_WIDTH
    if available == 0:
        raise RuntimeError("Buienradar returned no frames")

    # The display decodes a fixed 550x(512*12) buffer: repeat the last frame if
    # Buienradar ever returns fewer frames than asked for.
    rgb = sprite.convert("RGB")
    sheet = Image.new("RGB", (FRAME_WIDTH, FRAME_HEIGHT * FRAME_COUNT))
    for index in range(FRAME_COUNT):
        source = min(index, available - 1) * FRAME_WIDTH
        frame = rgb.crop((source, 0, source + FRAME_WIDTH, FRAME_HEIGHT))
        sheet.paste(frame, (0, index * FRAME_HEIGHT))
    return sheet


def atomic_save_jpeg(image: Image.Image, path: Path) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    # 4:4:4 keeps the thin yellow borders crisp on the saturated map colours.
    image.save(tmp, format="JPEG", quality=88, subsampling=0, optimize=True)
    os.replace(tmp, path)


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    data, final_url = download()
    first_frame = issue_epoch(final_url)
    with Image.open(io.BytesIO(data)) as sprite:
        sheet = build_sheet(sprite)
    atomic_save_jpeg(sheet, OUT_DIR / SHEET_NAME)

    for stale in OUT_DIR.glob("radar_[0-9]*.jpg"):  # frames of the old per-frame loader
        stale.unlink(missing_ok=True)

    print(f"{first_frame}|{FRAME_COUNT}|{STEP_SECONDS}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Buienradar sheet update failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
