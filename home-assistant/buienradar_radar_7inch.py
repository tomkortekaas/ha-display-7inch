#!/usr/bin/env python3
"""Fetch Buienradar rain radar frames for the 7-inch ESPHome display."""

from __future__ import annotations

import io
import os
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageSequence


RADAR_URL = (
    "https://image.buienradar.nl/2.0/image/animation/RadarMapRainNL"
    "?height=402&width=268&renderBackground=True&renderBranding=False"
    "&renderText=True&History=0&Forecast=12"
)
STILL_URL = (
    "https://image.buienradar.nl/2.0/image/single/RadarMapRainNL"
    "?height=402&width=268&renderBackground=True&renderBranding=False"
    "&renderText=True"
)
OUT_DIR = Path("/config/www/ha-display-radar")
FRAME_COUNT = 9

# Doelformaat op het display (zie img_buienradar in ha-display-7.yaml).
# Vroeger schaalde het ESP32 de 268x402 bron zelf op (~1.8x, interpolatie op
# elke decode) en sneed daarna bij naar dit formaat. Dat opschalen bleek de
# echte oorzaak van de blauwe flits bij elke radarverversing — niet de timing.
# Nu doet Home Assistant (PIL) het schalen+bijsnijden vooraf, zodat het ESP32
# alleen nog een 1:1 decode van een al-passend plaatje hoeft te doen.
TARGET_WIDTH = 240
TARGET_HEIGHT = 225
# Verticale crop-offset binnen de op breedte geschaalde bron (zelfde framing
# als de vorige on-device resize_mode: COVER met offset 0,-67).
CROP_TOP = 67


def fit_for_display(image: Image.Image) -> Image.Image:
    scale = TARGET_WIDTH / image.width
    scaled_height = round(image.height * scale)
    scaled = image.resize((TARGET_WIDTH, scaled_height), Image.LANCZOS)
    top = min(CROP_TOP, max(0, scaled_height - TARGET_HEIGHT))
    return scaled.crop((0, top, TARGET_WIDTH, top + TARGET_HEIGHT))


def atomic_save_jpeg(image: Image.Image, path: Path) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    fit_for_display(image).convert("RGB").save(
        tmp, format="JPEG", quality=88, optimize=True
    )
    os.replace(tmp, path)


def download(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "ha-display-7/1.0"})
    with urllib.request.urlopen(req, timeout=20) as response:
        return response.read()


def write_still_frames() -> None:
    with Image.open(io.BytesIO(download(STILL_URL))) as image:
        still = image.copy()

    for out_index in range(FRAME_COUNT):
        atomic_save_jpeg(still, OUT_DIR / f"radar_{out_index}.jpg")


def write_animation_frames() -> None:
    with Image.open(io.BytesIO(download(RADAR_URL))) as gif:
        frames = [frame.copy() for frame in ImageSequence.Iterator(gif)]


    if not frames:
        raise RuntimeError("Buienradar returned no frames")

    if len(frames) >= FRAME_COUNT:
        indices = [
            round(i * (len(frames) - 1) / (FRAME_COUNT - 1))
            for i in range(FRAME_COUNT)
        ]
    else:
        indices = list(range(len(frames))) + [len(frames) - 1] * (FRAME_COUNT - len(frames))

    for out_index, frame_index in enumerate(indices):
        atomic_save_jpeg(frames[frame_index], OUT_DIR / f"radar_{out_index}.jpg")


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    try:
        write_animation_frames()
        source = "animation"
    except Exception as exc:
        print(f"Buienradar animation failed, using still image: {exc}", file=sys.stderr)
        write_still_frames()
        source = "still"

    print(f"Wrote {FRAME_COUNT} Buienradar {source} frames to {OUT_DIR}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Buienradar frame update failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
