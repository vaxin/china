#!/usr/bin/env python3
"""Build a deterministic 4-direction × 8-frame walk-cycle pose guide."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw


ROWS = (
    ("south-east", 1, True),
    ("south-west", -1, True),
    ("north-west", -1, False),
    ("north-east", 1, False),
)

# (left foot travel, left lift, right foot travel, right lift, pelvis offset)
PHASES = (
    (34, 0, -27, 0, 0),
    (23, 0, -17, 4, 8),
    (2, 0, 2, 20, 4),
    (-18, 0, 24, 13, -4),
    (-27, 0, 34, 0, 0),
    (-17, 4, 23, 0, 8),
    (2, 20, 2, 0, 4),
    (24, 13, -18, 0, -4),
)


def joint(hip: tuple[int, int], foot: tuple[int, int], lift: int) -> tuple[int, int]:
    hx, hy = hip
    fx, fy = foot
    direction = 1 if fx >= hx else -1
    return (
        round((hx + fx) / 2 + direction * (8 + lift * 0.15)),
        round((hy + fy) / 2 - lift * 0.55),
    )


def draw_limb(
    draw: ImageDraw.ImageDraw,
    points: list[tuple[int, int]],
    color: tuple[int, int, int],
    width: int,
) -> None:
    draw.line(points, fill=(20, 20, 24), width=width + 5, joint="curve")
    draw.line(points, fill=color, width=width, joint="curve")
    radius = width // 2
    for x, y in points:
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=color)


def draw_pose(
    draw: ImageDraw.ImageDraw,
    origin: tuple[int, int],
    direction_sign: int,
    front: bool,
    phase: tuple[int, int, int, int, int],
) -> None:
    ox, oy = origin
    left_x, left_lift, right_x, right_lift, pelvis_offset = phase
    hip_y = oy + 142 + pelvis_offset
    ground_y = oy + 235
    shoulder_y = oy + 91 + pelvis_offset
    center_x = ox + 128
    facing_offset = direction_sign * 7

    # Directional torso: front rows have a visible V neckline; back rows have a plain back panel.
    torso = [
        (center_x - 21, shoulder_y),
        (center_x + 21, shoulder_y),
        (center_x + 15, hip_y),
        (center_x - 15, hip_y),
    ]
    draw.polygon(torso, fill=(66, 111, 160), outline=(20, 20, 24), width=5)
    if front:
        draw.line(
            (
                center_x - 12,
                shoulder_y + 4,
                center_x,
                shoulder_y + 24,
                center_x + 12,
                shoulder_y + 4,
            ),
            fill=(238, 205, 94),
            width=4,
        )
    else:
        draw.line(
            (center_x - 12, shoulder_y + 12, center_x + 12, shoulder_y + 12),
            fill=(34, 67, 103),
            width=4,
        )

    neck = (center_x + facing_offset // 2, shoulder_y - 13)
    head_center = (center_x + facing_offset, shoulder_y - 38)
    draw.line((center_x, shoulder_y, neck), fill=(20, 20, 24), width=10)
    draw.ellipse(
        (
            head_center[0] - 17,
            head_center[1] - 20,
            head_center[0] + 17,
            head_center[1] + 20,
        ),
        fill=(210, 164, 109),
        outline=(20, 20, 24),
        width=5,
    )
    draw.ellipse(
        (
            head_center[0] - 8,
            head_center[1] - 28,
            head_center[0] + 8,
            head_center[1] - 13,
        ),
        fill=(35, 26, 22),
        outline=(20, 20, 24),
        width=3,
    )
    if front:
        eye_x = head_center[0] + direction_sign * 8
        draw.ellipse((eye_x - 2, head_center[1] - 4, eye_x + 2, head_center[1]), fill=(15, 15, 15))
        draw.line(
            (
                head_center[0] + direction_sign * 12,
                head_center[1] + 2,
                head_center[0] + direction_sign * 20,
                head_center[1] + 5,
            ),
            fill=(20, 20, 24),
            width=4,
        )

    left_hip = (center_x - 6, hip_y)
    right_hip = (center_x + 6, hip_y)
    left_foot = (center_x + direction_sign * left_x, ground_y - left_lift)
    right_foot = (center_x + direction_sign * right_x, ground_y - right_lift)
    left_knee = joint(left_hip, left_foot, left_lift)
    right_knee = joint(right_hip, right_foot, right_lift)

    # Far limbs first (blue), near limbs second (orange); colors encode limb identity only.
    draw_limb(draw, [right_hip, right_knee, right_foot], (73, 142, 210), 10)
    draw_limb(draw, [left_hip, left_knee, left_foot], (230, 126, 64), 12)
    draw.line(
        (right_foot[0] - direction_sign * 5, right_foot[1], right_foot[0] + direction_sign * 13, right_foot[1]),
        fill=(73, 142, 210),
        width=10,
    )
    draw.line(
        (left_foot[0] - direction_sign * 5, left_foot[1], left_foot[0] + direction_sign * 13, left_foot[1]),
        fill=(230, 126, 64),
        width=12,
    )

    arm_swing = round((left_x - right_x) * 0.42)
    left_shoulder = (center_x - 18, shoulder_y + 5)
    right_shoulder = (center_x + 18, shoulder_y + 5)
    left_hand = (center_x - direction_sign * arm_swing, hip_y + 9)
    right_hand = (center_x + direction_sign * arm_swing, hip_y + 9)
    left_elbow = (
        round((left_shoulder[0] + left_hand[0]) / 2 - direction_sign * 7),
        round((left_shoulder[1] + left_hand[1]) / 2),
    )
    right_elbow = (
        round((right_shoulder[0] + right_hand[0]) / 2 + direction_sign * 7),
        round((right_shoulder[1] + right_hand[1]) / 2),
    )
    draw_limb(draw, [right_shoulder, right_elbow, right_hand], (73, 142, 210), 8)
    draw_limb(draw, [left_shoulder, left_elbow, left_hand], (230, 126, 64), 9)

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    image = Image.new("RGB", (2048, 1024), (255, 0, 255))
    draw = ImageDraw.Draw(image)
    for row, (_, direction_sign, front) in enumerate(ROWS):
        for col, phase in enumerate(PHASES):
            draw_pose(draw, (col * 256, row * 256), direction_sign, front, phase)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    image.save(args.output)


if __name__ == "__main__":
    main()
