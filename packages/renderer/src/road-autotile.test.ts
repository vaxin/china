import { describe, expect, it } from "vitest";

import {
  ROAD_EAST,
  ROAD_NORTH,
  ROAD_SOUTH,
  ROAD_WEST,
  roadConnectionMask,
  roadConnectionMasks,
  roadVariantName,
} from "./road-autotile";

describe("道路四邻接自动拼接", () => {
  it("按北东南西相邻道路生成稳定的四位连接掩码", () => {
    const roads = [
      { x: 4, y: 4 },
      { x: 4, y: 3 },
      { x: 5, y: 4 },
      { x: 4, y: 5 },
      { x: 3, y: 4 },
    ];

    expect(roadConnectionMask({ x: 4, y: 4 }, roads)).toBe(
      ROAD_NORTH | ROAD_EAST | ROAD_SOUTH | ROAD_WEST,
    );
    expect(roadConnectionMask({ x: 4, y: 3 }, roads)).toBe(ROAD_SOUTH);
  });

  it("孤立、终点、直线、拐角、T 形和十字都有明确变体", () => {
    expect(
      Array.from({ length: 16 }, (_, mask) => roadVariantName(mask)),
    ).toEqual([
      "isolated",
      "n",
      "e",
      "ne",
      "s",
      "ns",
      "es",
      "nes",
      "w",
      "nw",
      "ew",
      "new",
      "sw",
      "nsw",
      "esw",
      "nesw",
    ]);
  });

  it("重复坐标和越界邻居不会制造额外出口", () => {
    expect(
      roadConnectionMask(
        { x: 0, y: 0 },
        [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: -1, y: 0 },
        ],
        { width: 32, height: 32 },
      ),
    ).toBe(ROAD_EAST);
  });

  it("一次构建邻接集合即可批量得到所有道路掩码", () => {
    const masks = roadConnectionMasks(
      [
        { x: 2, y: 2 },
        { x: 2, y: 1 },
        { x: 3, y: 2 },
      ],
      { width: 32, height: 32 },
    );

    expect(masks.get(2 * 32 + 2)).toBe(ROAD_NORTH | ROAD_EAST);
    expect(masks.get(1 * 32 + 2)).toBe(ROAD_SOUTH);
    expect(masks.get(2 * 32 + 3)).toBe(ROAD_WEST);
  });
});
