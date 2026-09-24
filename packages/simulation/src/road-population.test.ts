import { describe, expect, it } from "vitest";

import {
  advanceTicks,
  applyCommand,
  createWorld,
  snapshotWorld,
} from "./index";

describe("道路路径", () => {
  it("住宅不能占用唯一城门道路格", () => {
    const world = createWorld();

    const application = applyCommand(world, {
      seq: 1,
      type: "build",
      buildingTypeId: "house",
      x: 0,
      y: 14,
      rotation: 0,
    });

    expect(application.result).toEqual({
      seq: 1,
      accepted: false,
      reasonCode: "occupied",
    });
    expect(application.snapshot.buildings).toEqual([]);
  });

  it("连续路径一次原子落地并只增加一个 revision", () => {
    const world = createWorld();

    const application = applyCommand(world, {
      seq: 1,
      type: "build-road-path",
      tiles: [
        { x: 0, y: 15 },
        { x: 1, y: 15 },
        { x: 2, y: 15 },
      ],
    });

    expect(application.result).toMatchObject({
      accepted: true,
      revision: 1,
    });
    expect(application.snapshot.roads).toEqual([
      { x: 0, y: 15 },
      { x: 1, y: 15 },
      { x: 2, y: 15 },
    ]);
  });

  it("断裂路径整条拒绝且世界不变", () => {
    const world = createWorld();
    const before = snapshotWorld(world);

    const application = applyCommand(world, {
      seq: 2,
      type: "build-road-path",
      tiles: [
        { x: 0, y: 15 },
        { x: 2, y: 15 },
      ],
    });

    expect(application.result).toEqual({
      seq: 2,
      accepted: false,
      reasonCode: "invalid-path",
    });
    expect(application.snapshot).toEqual(before);
  });

  it("路径任一格压到住宅时不留下半条道路", () => {
    const world = createWorld();
    applyCommand(world, {
      seq: 1,
      type: "build",
      buildingTypeId: "house",
      x: 1,
      y: 14,
      rotation: 0,
    });

    const application = applyCommand(world, {
      seq: 2,
      type: "build-road-path",
      tiles: [
        { x: 0, y: 15 },
        { x: 1, y: 15 },
      ],
    });

    expect(application.result).toEqual({
      seq: 2,
      accepted: false,
      reasonCode: "occupied",
    });
    expect(application.snapshot.roads).toEqual([]);
    expect(application.snapshot.revision).toBe(1);
  });

  it("路径尾部越界时不留下前半条道路", () => {
    const world = createWorld();
    const before = snapshotWorld(world);
    const application = applyCommand(world, {
      seq: 3,
      type: "build-road-path",
      tiles: [
        { x: 63, y: 15 },
        { x: 64, y: 15 },
      ],
    });

    expect(application.result).toEqual({
      seq: 3,
      accepted: false,
      reasonCode: "out-of-bounds",
    });
    expect(application.snapshot).toEqual(before);
  });

  it("住宅不能覆盖已有道路", () => {
    const world = createWorld();
    applyCommand(world, {
      seq: 1,
      type: "build-road-path",
      tiles: [{ x: 10, y: 10 }],
    });
    const before = snapshotWorld(world);

    const application = applyCommand(world, {
      seq: 2,
      type: "build",
      buildingTypeId: "house",
      x: 10,
      y: 10,
      rotation: 0,
    });

    expect(application.result).toEqual({
      seq: 2,
      accepted: false,
      reasonCode: "occupied",
    });
    expect(application.snapshot).toEqual(before);
  });
});

describe("道路服务与入住", () => {
  it("邻接但未连到城门的道路不会带来人口", () => {
    const world = createWorld();
    applyCommand(world, {
      seq: 1,
      type: "build",
      buildingTypeId: "house",
      x: 10,
      y: 10,
      rotation: 0,
    });
    applyCommand(world, {
      seq: 2,
      type: "build-road-path",
      tiles: [{ x: 9, y: 10 }],
    });

    advanceTicks(world, 1);

    expect(snapshotWorld(world)).toMatchObject({
      tick: 1,
      revision: 2,
      households: [],
    });
  });

  it("城门道路邻接宅基地后完成流民施工再入住 5 人", () => {
    const world = createWorld();
    const houseResult = applyCommand(world, {
      seq: 1,
      type: "build",
      buildingTypeId: "house",
      x: 1,
      y: 14,
      rotation: 0,
    });
    expect(houseResult.result).toMatchObject({ accepted: true });
    applyCommand(world, {
      seq: 2,
      type: "build-road-path",
      tiles: [{ x: 0, y: 15 }],
    });

    advanceTicks(world, 1);
    applyCommand(world, {
      seq: 3,
      type: "advance-activity",
      pulses: 1,
    });
    advanceTicks(world, 3);

    expect(snapshotWorld(world)).toMatchObject({
      tick: 4,
      revision: 7,
      households: [{ houseId: 1, residents: 5 }],
    });
  });

  it("入口格没有铺路时，仅与入口相邻的道路也不算连通", () => {
    const world = createWorld();
    applyCommand(world, {
      seq: 1,
      type: "build",
      buildingTypeId: "house",
      x: 1,
      y: 13,
      rotation: 0,
    });
    applyCommand(world, {
      seq: 2,
      type: "build-road-path",
      tiles: [{ x: 0, y: 14 }],
    });

    advanceTicks(world, 1);

    expect(snapshotWorld(world).households).toEqual([]);
  });

  it("地图左边界不会与上一行右边界的孤立道路环绕连通", () => {
    const world = createWorld();
    applyCommand(world, {
      seq: 1,
      type: "build",
      buildingTypeId: "house",
      x: 29,
      y: 14,
      rotation: 0,
    });
    applyCommand(world, {
      seq: 2,
      type: "build-road-path",
      tiles: [{ x: 0, y: 15 }],
    });
    applyCommand(world, {
      seq: 3,
      type: "build-road-path",
      tiles: [{ x: 31, y: 14 }],
    });

    advanceTicks(world, 1);

    expect(snapshotWorld(world).households).toEqual([]);
  });

  it("同一初始世界推进相同 tick 数得到相同快照", () => {
    const prepare = () => {
      const world = createWorld();
      applyCommand(world, {
        seq: 1,
        type: "build",
        buildingTypeId: "house",
        x: 1,
        y: 14,
        rotation: 0,
      });
      applyCommand(world, {
        seq: 2,
        type: "build-road-path",
        tiles: [{ x: 0, y: 15 }],
      });
      return world;
    };
    const first = prepare();
    const second = prepare();

    advanceTicks(first, 3);
    advanceTicks(second, 3);

    expect(snapshotWorld(first)).toEqual(snapshotWorld(second));
  });

  it("一次推进 N tick 与逐次推进 1 tick 完全等价", () => {
    const prepare = () => {
      const world = createWorld();
      applyCommand(world, {
        seq: 1,
        type: "build",
        buildingTypeId: "house",
        x: 1,
        y: 14,
        rotation: 0,
      });
      applyCommand(world, {
        seq: 2,
        type: "build-road-path",
        tiles: [{ x: 0, y: 15 }],
      });
      return world;
    };
    const batched = prepare();
    const stepped = prepare();

    advanceTicks(batched, 3);
    advanceTicks(stepped, 1);
    advanceTicks(stepped, 1);
    advanceTicks(stepped, 1);

    expect(snapshotWorld(batched)).toEqual(snapshotWorld(stepped));
  });
});
