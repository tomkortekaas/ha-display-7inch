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


def atomic_save_jpeg(image: Image.Image, path: Path) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    image.convert("RGB").save(tmp, format="JPEG", quality=88, optimize=True)
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
