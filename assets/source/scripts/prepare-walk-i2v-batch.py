#!/usr/bin/env python3
"""Prepare one-direction anchors and prompts for walk-cycle I2V jobs."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


ROLES = ("farmer", "artisan", "merchant", "official")
DIRECTIONS = {
    "south-east": (0, "down-right", "southeast"),
    "north-east": (3, "up-right", "northeast"),
}


def prompt(screen_direction: str, direction_name: str) -> str:
    return (
        f"Animate this single character into a simple {direction_name}-facing "
        "in-place walk cycle for an isometric top-down 2D game. "
        f"Keep the character facing {screen_direction} for the entire clip. "
        "Preserve the exact identity, proportions, palette, costume, silhouette, "
        "carried equipment, and sprite-like rendering of the input. Use a locked "
        "camera and unchanged framing. Keep the character centered on the same "
        "flat magenta background. Show steady alternating left and right leg "
        "steps, a small readable stride, subtle vertical bobbing, minimal arm "
        "swing, and light cloth sway. Feet remain fully visible. The walk must "
        "repeat smoothly without pausing. Do not translate, turn, pivot, rotate, "
        "zoom, add scenery, ground shadows, text, props, effects, or extra "
        "characters.\n"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_dir", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--anchor-column", type=int, default=2)
    parser.add_argument("--cell-size", type=int, default=256)
    args = parser.parse_args()

    for role in ROLES:
        sheet_path = args.source_dir / f"{role}-walk-4x8.png"
        sheet = Image.open(sheet_path).convert("RGBA")
        expected_size = (args.cell_size * 8, args.cell_size * 4)
        if sheet.size != expected_size:
            raise SystemExit(
                f"unexpected sheet size for {sheet_path}: {sheet.size}, "
                f"expected {expected_size}"
            )
        for direction, (row, screen_direction, direction_name) in DIRECTIONS.items():
            left = args.anchor_column * args.cell_size
            top = row * args.cell_size
            cell = sheet.crop(
                (left, top, left + args.cell_size, top + args.cell_size)
            )
            anchor = Image.new("RGB", cell.size, (255, 0, 255))
            anchor.paste(cell.convert("RGB"), mask=cell.getchannel("A"))

            job_dir = args.output_dir / role / direction
            job_dir.mkdir(parents=True, exist_ok=True)
            anchor.save(job_dir / "anchor.png")
            (job_dir / "prompt.txt").write_text(
                prompt(screen_direction, direction_name), encoding="utf-8"
            )


if __name__ == "__main__":
    main()
