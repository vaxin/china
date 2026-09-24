import { describe, expect, it } from "vitest";

import {
  applyCommand,
  createWorld,
  evaluateHousePlacement,
  evaluateRoadPlacement,
  evaluateWallPlacement,
  snapshotWorld,
} from "./index";

describe("城墙修筑", () => {
  it("连续墙路径原子落地并只增加一次 revision", () => {
    const world = createWorld();
    const application = applyCommand(world, {
      seq: 1,
      type: "build-wall-path",
      tiles: [
        { x: 0, y: 14 },
        { x: 1, y: 14 },
        { x: 2, y: 14 },
      ],
    });

    expect(application.result).toMatchObject({ accepted: true, revision: 1 });
    expect(application.snapshot.walls).toEqual([
      { x: 0, y: 14 },
      { x: 1, y: 14 },
      { x: 2, y: 14 },
    ]);
  });

  it.each([
    [
      "断裂",
      [
        { x: 1, y: 1 },
        { x: 3, y: 1 },
      ],
      "invalid-path",
    ],
    [
      "重复",
      [
        { x: 1, y: 1 },
        { x: 1, y: 1 },
      ],
      "invalid-path",
    ],
    [
      "越界",
      [
        { x: 63, y: 1 },
        { x: 64, y: 1 },
      ],
      "out-of-bounds",
    ],
  ] as const)("%s路径整段拒绝", (_name, tiles, reasonCode) => {
    const world = createWorld();
    const before = snapshotWorld(world);
    const application = applyCommand(world, {
      seq: 2,
      type: "build-wall-path",
      tiles: [...tiles],
    });

    expect(application.result).toEqual({
      seq: 2,
      accepted: false,
      reasonCode,
    });
    expect(application.snapshot).toEqual(before);
  });

  it("城墙不能压城门、道路、建筑或已有墙段", () => {
    const world = createWorld();
    applyCommand(world, {
      seq: 1,
      type: "build-road-path",
      tiles: [{ x: 2, y: 2 }],
    });
    applyCommand(world, {
      seq: 2,
      type: "build",
      buildingTypeId: "house",
      x: 4,
      y: 4,
      rotation: 0,
    });
    applyCommand(world, {
      seq: 3,
      type: "build-wall-path",
      tiles: [{ x: 8, y: 8 }],
    });

    for (const [seq, tile] of [
      [4, { x: 0, y: 15 }],
      [5, { x: 2, y: 2 }],
      [6, { x: 4, y: 4 }],
      [7, { x: 8, y: 8 }],
    ] as const) {
      expect(
        applyCommand(world, {
          seq,
          type: "build-wall-path",
          tiles: [tile],
        }).result,
      ).toEqual({ seq, accepted: false, reasonCode: "occupied" });
    }
    expect(snapshotWorld(world).walls).toEqual([{ x: 8, y: 8 }]);
  });

  it("道路和建筑不能反向覆盖墙段，预览与权威结果一致", () => {
    const world = createWorld();
    applyCommand(world, {
      seq: 1,
      type: "build-wall-path",
      tiles: [{ x: 10, y: 10 }],
    });
    const snapshot = snapshotWorld(world);

    expect(evaluateWallPlacement(snapshot, 11, 10)).toBe("valid");
    expect(evaluateWallPlacement(snapshot, 10, 10)).toBe("occupied");
    expect(evaluateRoadPlacement(snapshot, 10, 10)).toBe("occupied");
    expect(evaluateHousePlacement(snapshot, 9, 9)).toBe("occupied");
    expect(
      applyCommand(world, {
        seq: 2,
        type: "build-road-path",
        tiles: [{ x: 10, y: 10 }],
      }).result,
    ).toMatchObject({ accepted: false, reasonCode: "occupied" });
    expect(
      applyCommand(world, {
        seq: 3,
        type: "build",
        buildingTypeId: "house",
        x: 9,
        y: 9,
        rotation: 0,
      }).result,
    ).toMatchObject({ accepted: false, reasonCode: "occupied" });
  });

  it("拆除只移除目标墙格并保留相邻对象", () => {
    const world = createWorld();
    applyCommand(world, {
      seq: 1,
      type: "build-wall-path",
      tiles: [
        { x: 4, y: 4 },
        { x: 5, y: 4 },
        { x: 6, y: 4 },
      ],
    });

    const application = applyCommand(world, {
      seq: 2,
      type: "demolish",
      x: 5,
      y: 4,
    });

    expect(application.result).toMatchObject({ accepted: true, revision: 2 });
    expect(application.snapshot.walls).toEqual([
      { x: 4, y: 4 },
      { x: 6, y: 4 },
    ]);
  });

  it("revision 无法递增时不留下墙段", () => {
    const world = createWorld();
    world.revision = Number.MAX_SAFE_INTEGER;
    const before = snapshotWorld(world);

    const application = applyCommand(world, {
      seq: 1,
      type: "build-wall-path",
      tiles: [{ x: 4, y: 4 }],
    });

    expect(application.result).toEqual({
      seq: 1,
      accepted: false,
      reasonCode: "counter-exhausted",
    });
    expect(application.snapshot).toEqual(before);
  });
});
