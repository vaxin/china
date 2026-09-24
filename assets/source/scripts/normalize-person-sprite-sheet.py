#!/usr/bin/env python3
"""Align sprite cells to a shared ground baseline and stable body pivot."""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage


def body_axis_x(alpha: np.ndarray) -> float:
    """Estimate the stable torso/pelvis axis while ignoring swinging limbs."""
    mask = alpha > 16
    ys, _ = np.nonzero(mask)
    if not len(ys):
        raise ValueError("empty sprite")
    top, bottom = int(ys.min()), int(ys.max())
    height = bottom - top + 1
    band_top = max(0, round(top + height * 0.20))
    band_bottom = min(mask.shape[0], round(top + height * 0.55) + 1)
    scanline_centers: list[float] = []
    for scanline in mask[band_top:band_bottom]:
        xs = np.flatnonzero(scanline)
        if len(xs) < 8:
            continue
        inner_left, inner_right = np.quantile(xs, (0.18, 0.82))
        scanline_centers.append(float((inner_left + inner_right) / 2))
    if not scanline_centers:
        _, xs = np.nonzero(mask)
        return float(np.median(xs))
    return float(np.median(scanline_centers))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("sheet", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--rows", type=int, default=4)
    parser.add_argument("--columns", type=int, default=8)
    parser.add_argument("--baseline", type=int, default=243)
    parser.add_argument("--scale", type=float, default=1.0)
    parser.add_argument("--target-height", type=int)
    parser.add_argument("--keep-largest-component", action="store_true")
    parser.add_argument(
        "--align-body-axis",
        action="store_true",
        help="align the trimmed upper-body axis instead of the changing alpha bounding box",
    )
    parser.add_argument(
        "--anchor-x",
        type=float,
        help="target horizontal pivot in cell pixels; defaults to the cell center",
    )
    args = parser.parse_args()

    source = Image.open(args.sheet).convert("RGBA")
    width, height = source.size
    if width % args.columns or height % args.rows:
        raise SystemExit(
            f"sheet dimensions {width}x{height} are not divisible by "
            f"{args.columns}x{args.rows}"
        )
    cell_width, cell_height = width // args.columns, height // args.rows
    if not 0 <= args.baseline < cell_height:
        raise SystemExit(f"baseline must be between 0 and {cell_height - 1}")
    if not 0 < args.scale <= 1:
        raise SystemExit("scale must be greater than 0 and no larger than 1")

    output = Image.new("RGBA", source.size, (0, 0, 0, 0))
    for row in range(args.rows):
        for column in range(args.columns):
            left, top = column * cell_width, row * cell_height
            cell = source.crop((left, top, left + cell_width, top + cell_height))
            if args.keep_largest_component:
                rgba = np.asarray(cell).copy()
                original_mask = rgba[:, :, 3] > 16
                labels, count = ndimage.label(ndimage.binary_dilation(original_mask, iterations=1))
                if count:
                    sizes = np.bincount(labels.ravel())
                    sizes[0] = 0
                    largest_label = int(sizes.argmax())
                    keep = labels == largest_label
                    rgba[~keep] = 0
                    cell = Image.fromarray(rgba, "RGBA")
            if args.scale < 1:
                scaled_size = (
                    round(cell_width * args.scale),
                    round(cell_height * args.scale),
                )
                scaled = cell.resize(scaled_size, Image.Resampling.LANCZOS)
                scaled_cell = Image.new("RGBA", (cell_width, cell_height), (0, 0, 0, 0))
                scaled_cell.alpha_composite(
                    scaled,
                    (
                        (cell_width - scaled_size[0]) // 2,
                        (cell_height - scaled_size[1]) // 2,
                    ),
                )
                cell = scaled_cell
            if args.target_height is not None:
                alpha = np.asarray(cell.getchannel("A"))
                ys, _ = np.nonzero(alpha > 16)
                if not len(ys):
                    raise SystemExit(f"empty cell at row {row}, column {column}")
                current_height = int(ys.max() - ys.min() + 1)
                height_scale = args.target_height / current_height
                scaled_size = (
                    max(1, round(cell_width * height_scale)),
                    max(1, round(cell_height * height_scale)),
                )
                scaled = cell.resize(scaled_size, Image.Resampling.LANCZOS)
                normalized_cell = Image.new("RGBA", (cell_width, cell_height), (0, 0, 0, 0))
                normalized_cell.alpha_composite(
                    scaled,
                    (
                        (cell_width - scaled_size[0]) // 2,
                        (cell_height - scaled_size[1]) // 2,
                    ),
                )
                cell = normalized_cell
            alpha = np.asarray(cell.getchannel("A"))
            ys, _ = np.nonzero(alpha > 16)
            if not len(ys):
                raise SystemExit(f"empty cell at row {row}, column {column}")
            current_baseline = int(ys.max())
            offset_y = args.baseline - current_baseline
            aligned = Image.new("RGBA", (cell_width, cell_height), (0, 0, 0, 0))
            aligned.alpha_composite(cell, (0, offset_y))
            if args.align_body_axis:
                anchor_x = args.anchor_x if args.anchor_x is not None else cell_width / 2
                current_axis = body_axis_x(np.asarray(aligned.getchannel("A")))
                offset_x = round(anchor_x - current_axis)
                pivot_aligned = Image.new(
                    "RGBA", (cell_width, cell_height), (0, 0, 0, 0)
                )
                pivot_aligned.alpha_composite(aligned, (offset_x, 0))
                aligned = pivot_aligned
            output.alpha_composite(aligned, (left, top))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    output.save(args.output)


if __name__ == "__main__":
    main()
