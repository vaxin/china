#!/usr/bin/env python3
"""Verify and preview an 8-column × 4-row chroma-key person sprite sheet."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage


ROWS = ("south-east", "south-west", "north-west", "north-east")
COLS = 8
KEY = np.array([255, 0, 255], dtype=np.int16)


def foreground_mask(rgb: np.ndarray, alpha: np.ndarray | None = None) -> np.ndarray:
    if alpha is not None and alpha.min() < 255:
        return alpha > 16
    distance = np.linalg.norm(rgb.astype(np.int16) - KEY, axis=2)
    return distance > 48


def bbox(mask: np.ndarray) -> tuple[int, int, int, int] | None:
    ys, xs = np.nonzero(mask)
    if not len(xs):
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def mask_iou(a: np.ndarray, b: np.ndarray) -> float:
    union = np.logical_or(a, b).sum()
    return float(np.logical_and(a, b).sum() / union) if union else 1.0


def rgb_difference(a: np.ndarray, b: np.ndarray, union: np.ndarray) -> float:
    if not union.any():
        return 0.0
    delta = np.abs(a.astype(np.int16) - b.astype(np.int16)).mean(axis=2) / 255.0
    return float(delta[union].mean())


def body_axis_x(mask: np.ndarray) -> float | None:
    ys, _ = np.nonzero(mask)
    if not len(ys):
        return None
    top, bottom = int(ys.min()), int(ys.max())
    height = bottom - top + 1
    band_top = max(0, round(top + height * 0.20))
    band_bottom = min(mask.shape[0], round(top + height * 0.55) + 1)
    centers: list[float] = []
    for scanline in mask[band_top:band_bottom]:
        xs = np.flatnonzero(scanline)
        if len(xs) < 8:
            continue
        inner_left, inner_right = np.quantile(xs, (0.18, 0.82))
        centers.append(float((inner_left + inner_right) / 2))
    return float(np.median(centers)) if centers else None


def lower_body_mask(mask: np.ndarray) -> np.ndarray:
    ys, _ = np.nonzero(mask)
    if not len(ys):
        return mask.copy()
    top, bottom = int(ys.min()), int(ys.max())
    cutoff = round(top + (bottom - top + 1) * 0.48)
    result = mask.copy()
    result[:cutoff] = False
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("sheet", type=Path)
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--rows", type=int, default=4)
    parser.add_argument("--columns", type=int, default=COLS)
    args = parser.parse_args()

    source_rgba = Image.open(args.sheet).convert("RGBA")
    source = source_rgba.convert("RGB")
    width, height = source.size
    errors: list[str] = []
    warnings: list[str] = []
    if width % args.columns or height % args.rows:
        errors.append(
            f"sheet dimensions {width}x{height} are not divisible by "
            f"{args.columns}x{args.rows}"
        )
        report = {"passed": False, "errors": errors, "warnings": warnings}
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 1

    cell_width, cell_height = width // args.columns, height // args.rows
    args.out_dir.mkdir(parents=True, exist_ok=True)
    frames_dir = args.out_dir / "frames"
    frames_dir.mkdir(exist_ok=True)

    frame_data: list[list[dict[str, object]]] = []
    frame_rgbs: list[list[np.ndarray]] = []
    frame_masks: list[list[np.ndarray]] = []
    baselines: list[int] = []
    heights: list[int] = []
    body_axes: list[float] = []

    for row in range(args.rows):
        row_data: list[dict[str, object]] = []
        row_rgbs: list[np.ndarray] = []
        row_masks: list[np.ndarray] = []
        direction = ROWS[row] if row < len(ROWS) else f"row-{row}"
        for col in range(args.columns):
            frame_rgba = source_rgba.crop(
                (
                    col * cell_width,
                    row * cell_height,
                    (col + 1) * cell_width,
                    (row + 1) * cell_height,
                )
            )
            frame = frame_rgba.convert("RGB")
            frame_path = frames_dir / f"{direction}-{col}.png"
            frame_rgba.save(frame_path)
            rgb = np.asarray(frame)
            alpha = np.asarray(frame_rgba)[:, :, 3]
            mask = foreground_mask(rgb, alpha)
            bounds = bbox(mask)
            coverage = float(mask.mean())
            axis_x = body_axis_x(mask)
            if axis_x is not None:
                body_axes.append(axis_x)
            if bounds is None:
                errors.append(f"{direction} frame {col}: empty cell")
                baseline = -1
                sprite_height = 0
            else:
                left, top, right, bottom = bounds
                baseline = bottom - 1
                sprite_height = bottom - top
                baselines.append(baseline)
                heights.append(sprite_height)
                if left <= 2 or right >= cell_width - 2 or top <= 2 or bottom >= cell_height - 2:
                    errors.append(f"{direction} frame {col}: sprite touches cell safety edge")
            if coverage < 0.025:
                errors.append(f"{direction} frame {col}: foreground coverage too small ({coverage:.3f})")
            if coverage > 0.48:
                errors.append(f"{direction} frame {col}: foreground coverage too large ({coverage:.3f})")
            labels, count = ndimage.label(ndimage.binary_dilation(mask, iterations=1))
            if count > 1:
                component_sizes = sorted(
                    (int(value) for value in np.bincount(labels.ravel())[1:] if value > 48),
                    reverse=True,
                )
                if len(component_sizes) > 1:
                    errors.append(
                        f"{direction} frame {col}: detached foreground components "
                        f"{component_sizes[:4]}"
                    )
            row_data.append(
                {
                    "direction": direction,
                    "frame": col,
                    "file": str(frame_path),
                    "coverage": round(coverage, 4),
                    "bbox": list(bounds) if bounds else None,
                    "baseline": baseline,
                    "height": sprite_height,
                    "bodyAxisX": round(axis_x, 2) if axis_x is not None else None,
                }
            )
            row_rgbs.append(rgb)
            row_masks.append(mask)
        frame_data.append(row_data)
        frame_rgbs.append(row_rgbs)
        frame_masks.append(row_masks)

    median_baseline = float(np.median(baselines)) if baselines else 0.0
    baseline_deviation = max((abs(value - median_baseline) for value in baselines), default=0.0)
    if baseline_deviation > 5:
        errors.append(f"maximum baseline deviation is {baseline_deviation:.1f}px; limit is 5px")

    median_height = float(np.median(heights)) if heights else 0.0
    height_deviation = (
        max((abs(value - median_height) / median_height for value in heights), default=0.0)
        if median_height
        else math.inf
    )
    if height_deviation > 0.04:
        errors.append(f"maximum sprite-height drift is {height_deviation:.1%}; limit is 4%")
    elif height_deviation > 0.03:
        warnings.append(f"sprite-height drift is {height_deviation:.1%}; preferred limit is 3%")

    median_body_axis = float(np.median(body_axes)) if body_axes else 0.0
    body_axis_deviation = max(
        (abs(value - median_body_axis) for value in body_axes), default=math.inf
    )
    if body_axis_deviation > 2:
        errors.append(
            f"maximum body-axis drift is {body_axis_deviation:.1f}px; limit is 2px"
        )

    motion: list[dict[str, object]] = []
    for row in range(args.rows):
        direction = ROWS[row] if row < len(ROWS) else f"row-{row}"
        similarities: list[float] = []
        lower_body_similarities: list[float] = []
        rgb_differences: list[float] = []
        lower_body_rgb_differences: list[float] = []
        for col in range(args.columns):
            next_col = (col + 1) % args.columns
            a_mask, b_mask = frame_masks[row][col], frame_masks[row][next_col]
            union = np.logical_or(a_mask, b_mask)
            iou = mask_iou(a_mask, b_mask)
            lower_iou = mask_iou(lower_body_mask(a_mask), lower_body_mask(b_mask))
            difference = rgb_difference(frame_rgbs[row][col], frame_rgbs[row][next_col], union)
            lower_union = np.logical_or(lower_body_mask(a_mask), lower_body_mask(b_mask))
            lower_difference = rgb_difference(
                frame_rgbs[row][col], frame_rgbs[row][next_col], lower_union
            )
            similarities.append(iou)
            lower_body_similarities.append(lower_iou)
            rgb_differences.append(difference)
            lower_body_rgb_differences.append(lower_difference)
            if iou > 0.965 and difference < 0.035:
                errors.append(
                    f"{direction} frames {col}->{next_col}: near-duplicate pose "
                    f"(IoU {iou:.3f}, RGB diff {difference:.3f})"
                )
        motion.append(
            {
                "direction": direction,
                "adjacentMaskIoU": [round(value, 4) for value in similarities],
                "adjacentLowerBodyIoU": [
                    round(value, 4) for value in lower_body_similarities
                ],
                "adjacentRgbDifference": [round(value, 4) for value in rgb_differences],
                "adjacentLowerBodyRgbDifference": [
                    round(value, 4) for value in lower_body_rgb_differences
                ],
                "meanMaskIoU": round(float(np.mean(similarities)), 4),
                "meanRgbDifference": round(float(np.mean(rgb_differences)), 4),
            }
        )

        for first in range(args.columns):
            for second in range(first + 1, args.columns):
                a_mask, b_mask = frame_masks[row][first], frame_masks[row][second]
                union = np.logical_or(a_mask, b_mask)
                iou = mask_iou(a_mask, b_mask)
                lower_iou = mask_iou(
                    lower_body_mask(a_mask), lower_body_mask(b_mask)
                )
                difference = rgb_difference(frame_rgbs[row][first], frame_rgbs[row][second], union)
                lower_union = np.logical_or(
                    lower_body_mask(a_mask), lower_body_mask(b_mask)
                )
                lower_difference = rgb_difference(
                    frame_rgbs[row][first], frame_rgbs[row][second], lower_union
                )
                if iou > 0.965 and difference < 0.035:
                    errors.append(
                        f"{direction} frames {first} and {second}: duplicated pose "
                        f"(IoU {iou:.3f}, RGB diff {difference:.3f})"
                    )
                cycle_distance = min(second - first, args.columns - (second - first))
                if cycle_distance >= 2 and (
                    lower_iou > 0.985
                    or (lower_iou > 0.965 and lower_difference < 0.035)
                ):
                    errors.append(
                        f"{direction} frames {first} and {second}: lower-body gait "
                        f"is not distinct (IoU {lower_iou:.3f}, "
                        f"RGB diff {lower_difference:.3f})"
                    )

    # Direction rows should not be copies of one another.
    direction_similarity: list[dict[str, object]] = []
    for first in range(args.rows):
        for second in range(first + 1, args.rows):
            similarities = [
                mask_iou(frame_masks[first][col], frame_masks[second][col])
                for col in range(args.columns)
            ]
            mean_similarity = float(np.mean(similarities))
            direction_similarity.append(
                {
                    "rows": [ROWS[first], ROWS[second]],
                    "meanMaskIoU": round(mean_similarity, 4),
                }
            )
            if mean_similarity > 0.91:
                errors.append(
                    f"direction rows {ROWS[first]} and {ROWS[second]} are too similar "
                    f"(mean IoU {mean_similarity:.3f})"
                )

    # Produce one looping GIF per row for human motion review.
    gif_paths: list[str] = []
    for row in range(args.rows):
        direction = ROWS[row] if row < len(ROWS) else f"row-{row}"
        frames = [
            Image.open(frames_dir / f"{direction}-{col}.png").convert("RGB")
            for col in range(args.columns)
        ]
        gif_path = args.out_dir / f"{direction}.gif"
        frames[0].save(
            gif_path,
            save_all=True,
            append_images=frames[1:],
            duration=120,
            loop=0,
            disposal=2,
        )
        gif_paths.append(str(gif_path))

    # Overlay cell boundaries and frame coordinates for inspection only.
    contact = Image.new("RGB", source.size, (255, 0, 255))
    contact.paste(source_rgba, mask=source_rgba.getchannel("A"))
    draw = ImageDraw.Draw(contact)
    for col in range(1, args.columns):
        draw.line((col * cell_width, 0, col * cell_width, height), fill=(32, 255, 255), width=1)
    for row in range(1, args.rows):
        draw.line((0, row * cell_height, width, row * cell_height), fill=(32, 255, 255), width=1)
    contact_path = args.out_dir / "contact-sheet.png"
    contact.save(contact_path)

    report = {
        "passed": not errors,
        "sheet": str(args.sheet),
        "sheetSize": [width, height],
        "grid": {"rows": args.rows, "columns": args.columns},
        "cellSize": [cell_width, cell_height],
        "medianBaseline": median_baseline,
        "maximumBaselineDeviation": baseline_deviation,
        "medianSpriteHeight": median_height,
        "maximumHeightDrift": height_deviation,
        "medianBodyAxisX": median_body_axis,
        "maximumBodyAxisDeviation": body_axis_deviation,
        "frames": frame_data,
        "motion": motion,
        "directionSimilarity": direction_similarity,
        "previews": {"contactSheet": str(contact_path), "gifs": gif_paths},
        "errors": errors,
        "warnings": warnings,
    }
    report_path = args.out_dir / "report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
