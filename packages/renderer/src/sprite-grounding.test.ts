import { describe, expect, it } from "vitest";

import { groundSpritePosition } from "./sprite-grounding";

describe("手绘建筑素材地面锚点", () => {
  it("2×2 素材把前角沿相机方向移动一格，使画面地基中心回到逻辑中心", () => {
    expect(
      groundSpritePosition(
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 10, z: -10 },
        { x: 0, y: 0, z: 0 },
        2,
        4,
      ),
    ).toEqual({ x: 4, y: 0, z: -4 });
  });

  it("相机旋转后锚点随朝向旋转，不固定偏向某个世界坐标轴", () => {
    expect(
      groundSpritePosition(
        { x: 12, y: 0, z: 8 },
        { x: -10, y: 10, z: -10 },
        { x: 0, y: 0, z: 0 },
        2,
        4,
      ),
    ).toEqual({ x: 8, y: 0, z: 4 });
  });

  it("相机平移不改变相对锚点，退化方向则保持逻辑中心", () => {
    expect(
      groundSpritePosition(
        { x: 2, y: 0.5, z: 3 },
        { x: 20, y: 10, z: 10 },
        { x: 10, y: 0, z: 20 },
        1,
        4,
      ),
    ).toEqual({ x: 4, y: 0.5, z: 1 });
    expect(
      groundSpritePosition(
        { x: 2, y: 0.5, z: 3 },
        { x: 1, y: 5, z: 1 },
        { x: 1, y: 0, z: 1 },
        2,
        4,
      ),
    ).toEqual({ x: 2, y: 0.5, z: 3 });
  });
});
