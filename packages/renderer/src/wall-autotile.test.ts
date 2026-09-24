import { describe, expect, it } from "vitest";

import {
  WALL_EAST,
  WALL_NORTH,
  WALL_SOUTH,
  WALL_WEST,
  rotateWallMaskForHeading,
  wallConnectionMask,
  wallConnectionMasks,
} from "./wall-autotile";

describe("城墙四邻接自动拼接", () => {
  it("按北东南西相邻墙段生成四位连接掩码", () => {
    const walls = [
      { x: 4, y: 4 },
      { x: 4, y: 3 },
      { x: 5, y: 4 },
      { x: 4, y: 5 },
      { x: 3, y: 4 },
    ];

    expect(wallConnectionMask({ x: 4, y: 4 }, walls)).toBe(
      WALL_NORTH | WALL_EAST | WALL_SOUTH | WALL_WEST,
    );
  });

  it("城门作为虚拟墙邻居连接上下两个边界墙段", () => {
    const masks = wallConnectionMasks(
      [
        { x: 0, y: 14 },
        { x: 0, y: 16 },
      ],
      { width: 32, height: 32 },
      { x: 0, y: 15 },
    );

    expect(masks.get(14 * 32)).toBe(WALL_SOUTH);
    expect(masks.get(16 * 32)).toBe(WALL_NORTH);
  });

  it("相机每转九十度时图集掩码同步旋转而世界掩码不变", () => {
    const corner = WALL_NORTH | WALL_EAST;

    expect(rotateWallMaskForHeading(corner, 0)).toBe(WALL_NORTH | WALL_EAST);
    expect(rotateWallMaskForHeading(corner, 90)).toBe(WALL_EAST | WALL_SOUTH);
    expect(rotateWallMaskForHeading(corner, 180)).toBe(WALL_SOUTH | WALL_WEST);
    expect(rotateWallMaskForHeading(corner, 270)).toBe(WALL_WEST | WALL_NORTH);
  });

  it("越界和重复墙格不会制造额外连接", () => {
    expect(
      wallConnectionMask(
        { x: 0, y: 0 },
        [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: -1, y: 0 },
        ],
        { width: 32, height: 32 },
      ),
    ).toBe(WALL_EAST);
  });

  it("负坐标直墙在扩展地形原点下保持世界轴方向", () => {
    const bounds = { originX: -32, originY: -32, width: 96, height: 96 };
    const masks = wallConnectionMasks(
      [
        { x: -20, y: 15 },
        { x: -20, y: 16 },
        { x: -20, y: 17 },
      ],
      bounds,
    );
    const key = (x: number, y: number) =>
      (y - bounds.originY) * bounds.width + x - bounds.originX;

    expect(masks.get(key(-20, 16))).toBe(WALL_NORTH | WALL_SOUTH);
  });
});
