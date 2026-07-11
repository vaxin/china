import { describe, expect, it } from "vitest";

import { applyCommand, createWorld, snapshotWorld } from "./index";

describe("住宅建造规则", () => {
  it("在完整容纳 2×2 占地的空地建造后，世界只出现一座住宅", () => {
    const world = createWorld();

    const application = applyCommand(world, {
      seq: 1,
      type: "build",
      buildingTypeId: "house",
      x: 10,
      y: 12,
      rotation: 0,
    });

    expect(application.result).toEqual({
      seq: 1,
      accepted: true,
      appliedAtTick: 0,
      revision: 1,
    });
    expect(application.snapshot.buildings).toEqual([
      {
        id: 1,
        typeId: "house",
        x: 10,
        y: 12,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        level: 1,
        constructionStage: 0,
      },
    ]);
  });

  it("与已有住宅重叠时明确拒绝并保持建筑状态不变", () => {
    const world = createWorld();
    applyCommand(world, {
      seq: 1,
      type: "build",
      buildingTypeId: "house",
      x: 10,
      y: 10,
      rotation: 0,
    });
    const before = snapshotWorld(world);

    const application = applyCommand(world, {
      seq: 2,
      type: "build",
      buildingTypeId: "house",
      x: 11,
      y: 11,
      rotation: 0,
    });

    expect(application.result).toEqual({
      seq: 2,
      accepted: false,
      reasonCode: "occupied",
    });
    expect(application.snapshot).toEqual(before);
    expect(application.snapshot.buildings).toHaveLength(1);
  });

  it.each([
    ["左侧负坐标", -1, 0],
    ["上侧负坐标", 0, -1],
    ["右下角无法容纳 2×2 占地", 31, 31],
    ["右边越界", 31, 10],
    ["下边越界", 10, 31],
  ])("%s 时拒绝建造且不改变世界", (_name, x, y) => {
    const world = createWorld();
    const before = snapshotWorld(world);

    const application = applyCommand(world, {
      seq: 9,
      type: "build",
      buildingTypeId: "house",
      x,
      y,
      rotation: 0,
    });

    expect(application.result).toEqual({
      seq: 9,
      accepted: false,
      reasonCode: "out-of-bounds",
    });
    expect(application.snapshot).toEqual(before);
  });

  it("同一格连续收到两条建造命令时，第一条成功、第二条拒绝且最终只有一座", () => {
    const world = createWorld();
    const first = applyCommand(world, {
      seq: 20,
      type: "build",
      buildingTypeId: "house",
      x: 8,
      y: 8,
      rotation: 0,
    });
    const second = applyCommand(world, {
      seq: 21,
      type: "build",
      buildingTypeId: "house",
      x: 8,
      y: 8,
      rotation: 0,
    });

    expect(first.result.accepted).toBe(true);
    expect(second.result).toEqual({
      seq: 21,
      accepted: false,
      reasonCode: "occupied",
    });
    expect(second.snapshot.buildings).toHaveLength(1);
  });
});
