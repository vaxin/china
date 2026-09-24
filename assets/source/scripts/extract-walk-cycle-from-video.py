#!/usr/bin/env python3
"""Detect one repeated walk cycle in an I2V clip and extract runtime frames."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw


def decode_video(path: Path) -> tuple[list[np.ndarray], float]:
    capture = cv2.VideoCapture(str(path))
    fps = float(capture.get(cv2.CAP_PROP_FPS))
    frames: list[np.ndarray] = []
    while True:
        ok, bgr = capture.read()
        if not ok:
            break
        frames.append(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
    capture.release()
    if not frames or fps <= 0:
        raise SystemExit(f"could not decode video: {path}")
    return frames, fps


def smoothstep(value: np.ndarray, low: float, high: float) -> np.ndarray:
    progress = np.clip((value - low) / (high - low), 0.0, 1.0)
    return progress * progress * (3.0 - 2.0 * progress)


def background_color(rgb: np.ndarray) -> np.ndarray:
    """Estimate the encoded chroma color from the outer video border."""
    border = np.concatenate(
        (rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]), axis=0
    ).astype(np.float32)
    return np.median(border, axis=0)


def chroma_alpha(rgb: np.ndarray) -> np.ndarray:
    """Key magenta, including compressed purple spill around the character."""
    pixels = rgb.astype(np.float32)
    red, green, blue = pixels[:, :, 0], pixels[:, :, 1], pixels[:, :, 2]
    magenta_excess = np.minimum(red, blue) - green
    magenta_brightness = (red + blue) * 0.5
    chroma_strength = smoothstep(magenta_excess, 24.0, 148.0)
    chroma_strength *= smoothstep(magenta_brightness, 48.0, 168.0)
    return 1.0 - chroma_strength


def descriptor(rgb: np.ndarray, size: int = 120) -> np.ndarray:
    small = cv2.resize(rgb, (size, size), interpolation=cv2.INTER_AREA)
    alpha = chroma_alpha(small)
    foreground = small.astype(np.float32) / 255.0 * alpha[:, :, None]
    return np.concatenate((foreground, alpha[:, :, None]), axis=2)


def difference(first: np.ndarray, second: np.ndarray) -> float:
    return float(np.mean(np.square(first - second)))


def detect_cycle(
    descriptors: np.ndarray,
    fps: float,
    min_seconds: float,
    max_seconds: float,
) -> tuple[int, int, dict[int, float]]:
    minimum = max(2, round(fps * min_seconds))
    maximum = min(len(descriptors) // 2, round(fps * max_seconds))
    if maximum <= minimum:
        raise SystemExit("video is too short for the requested cycle range")

    period_scores: dict[int, float] = {}
    for period in range(minimum, maximum + 1):
        errors = np.mean(
            np.square(descriptors[:-period] - descriptors[period:]),
            axis=(1, 2, 3),
        )
        period_scores[period] = float(np.mean(errors))
    period = min(period_scores, key=period_scores.get)

    seam_errors = np.mean(
        np.square(descriptors[:-period] - descriptors[period:]),
        axis=(1, 2, 3),
    )
    # Avoid the seeded first frame when another equally good repeated cycle is
    # available; video models often spend the first few frames easing in.
    warmup = min(round(fps * 0.5), max(0, len(seam_errors) - 1))
    eligible = seam_errors[warmup:]
    start = warmup + int(np.argmin(eligible)) if len(eligible) else int(np.argmin(seam_errors))
    return period, start, period_scores


def rgba_from_chroma(rgb: np.ndarray) -> Image.Image:
    alpha = chroma_alpha(rgb)
    safe_alpha = np.maximum(alpha[:, :, None], 1e-3)
    chroma = background_color(rgb)
    foreground = (
        rgb.astype(np.float32) - (1.0 - alpha[:, :, None]) * chroma
    ) / safe_alpha
    foreground = np.clip(foreground, 0.0, 255.0)
    foreground[alpha < 0.01] = 0
    rgba = np.concatenate(
        (foreground, np.round(alpha[:, :, None] * 255.0)), axis=2
    ).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def fit_to_cell(frame: Image.Image, cell_size: int) -> Image.Image:
    frame.thumbnail((cell_size, cell_size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (cell_size, cell_size), (0, 0, 0, 0))
    canvas.alpha_composite(
        frame,
        ((cell_size - frame.width) // 2, (cell_size - frame.height) // 2),
    )
    return canvas


def foreground_bounds(frame: Image.Image) -> list[int] | None:
    alpha = np.asarray(frame.getchannel("A"))
    ys, xs = np.nonzero(alpha > 16)
    if not len(xs):
        return None
    return [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("video", type=Path)
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--frames", type=int, default=8)
    parser.add_argument("--cell-size", type=int, default=256)
    parser.add_argument("--min-cycle-seconds", type=float, default=0.65)
    parser.add_argument("--max-cycle-seconds", type=float, default=1.5)
    args = parser.parse_args()

    source_frames, fps = decode_video(args.video)
    descriptors = np.stack([descriptor(frame) for frame in source_frames])
    period, start, period_scores = detect_cycle(
        descriptors, fps, args.min_cycle_seconds, args.max_cycle_seconds
    )
    selected_indices = [
        start + round(index * period / args.frames) for index in range(args.frames)
    ]
    if selected_indices[-1] >= len(source_frames):
        raise SystemExit("detected cycle extends beyond the video")

    args.out_dir.mkdir(parents=True, exist_ok=True)
    frames_dir = args.out_dir / "frames"
    frames_dir.mkdir(exist_ok=True)
    extracted: list[Image.Image] = []
    bounds: list[list[int] | None] = []
    for output_index, source_index in enumerate(selected_indices):
        rgba = fit_to_cell(
            rgba_from_chroma(source_frames[source_index]), args.cell_size
        )
        rgba.save(frames_dir / f"frame-{output_index:02d}.png")
        extracted.append(rgba)
        bounds.append(foreground_bounds(rgba))

    sheet = Image.new(
        "RGBA", (args.cell_size * args.frames, args.cell_size), (0, 0, 0, 0)
    )
    for index, frame in enumerate(extracted):
        sheet.alpha_composite(frame, (index * args.cell_size, 0))
    sheet_path = args.out_dir / "cycle-1x8.png"
    sheet.save(sheet_path)

    preview_frames: list[Image.Image] = []
    contact = Image.new(
        "RGB",
        (args.cell_size * 4, (args.cell_size + 28) * math.ceil(args.frames / 4)),
        (44, 44, 44),
    )
    draw = ImageDraw.Draw(contact)
    for index, frame in enumerate(extracted):
        preview = Image.new("RGB", frame.size, (210, 210, 210))
        preview.paste(frame, mask=frame.getchannel("A"))
        preview_frames.append(preview)
        column, row = index % 4, index // 4
        x, y = column * args.cell_size, row * (args.cell_size + 28)
        contact.paste(preview, (x, y))
        draw.text((x + 8, y + args.cell_size + 6), f"{index + 1:02d} / src {selected_indices[index]:03d}", fill=(255, 255, 255))
    contact_path = args.out_dir / "contact.png"
    contact.save(contact_path)
    gif_path = args.out_dir / "cycle.gif"
    preview_frames[0].save(
        gif_path,
        save_all=True,
        append_images=preview_frames[1:],
        duration=round(1000 * period / fps / args.frames),
        loop=0,
        disposal=2,
    )

    selected_descriptors = descriptors[selected_indices]
    adjacent_differences = [
        difference(selected_descriptors[index], selected_descriptors[(index + 1) % args.frames])
        for index in range(args.frames)
    ]
    ranked_periods = sorted(period_scores.items(), key=lambda item: item[1])
    report = {
        "video": str(args.video),
        "sourceFrameCount": len(source_frames),
        "fps": fps,
        "cycleStartFrame": start,
        "cyclePeriodFrames": period,
        "cycleDurationSeconds": period / fps,
        "selectedSourceFrames": selected_indices,
        "bestPeriodScore": ranked_periods[0][1],
        "nextBestPeriod": {
            "frames": ranked_periods[1][0],
            "score": ranked_periods[1][1],
        },
        "adjacentFrameDifferences": adjacent_differences,
        "foregroundBounds": bounds,
        "outputs": {
            "sheet": str(sheet_path),
            "contact": str(contact_path),
            "gif": str(gif_path),
        },
    }
    (args.out_dir / "cycle.json").write_text(
        json.dumps(report, indent=2) + "\n"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
