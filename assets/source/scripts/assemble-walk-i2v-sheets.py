#!/usr/bin/env python3
"""Assemble two generated east-facing cycles into a four-direction sheet."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


ROLES = ("farmer", "artisan", "merchant", "official")
CELL_SIZE = 256
FRAME_COUNT = 8


def load_row(path: Path) -> list[Image.Image]:
    sheet = Image.open(path).convert("RGBA")
    expected = (CELL_SIZE * FRAME_COUNT, CELL_SIZE)
    if sheet.size != expected:
        raise SystemExit(f"unexpected row size for {path}: {sheet.size}, expected {expected}")
    return [
        sheet.crop((column * CELL_SIZE, 0, (column + 1) * CELL_SIZE, CELL_SIZE))
        for column in range(FRAME_COUNT)
    ]


def mirrored(frames: list[Image.Image]) -> list[Image.Image]:
    # Flip each frame independently so animation time still runs left-to-right.
    return [frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT) for frame in frames]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input_dir", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    for role in ROLES:
        south_east = load_row(
            args.input_dir / role / "south-east/extracted/cycle-1x8-normalized.png"
        )
        north_east = load_row(
            args.input_dir / role / "north-east/extracted/cycle-1x8-normalized.png"
        )
        rows = (south_east, mirrored(south_east), mirrored(north_east), north_east)
        output = Image.new(
            "RGBA", (CELL_SIZE * FRAME_COUNT, CELL_SIZE * len(rows)), (0, 0, 0, 0)
        )
        for row_index, frames in enumerate(rows):
            for frame_index, frame in enumerate(frames):
                output.alpha_composite(
                    frame, (frame_index * CELL_SIZE, row_index * CELL_SIZE)
                )
        output.save(args.output_dir / f"{role}-walk-4x8.png")


if __name__ == "__main__":
    main()
