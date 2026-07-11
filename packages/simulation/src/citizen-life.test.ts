import { describe, expect, it } from "vitest";

import {
  advanceTicks,
  applyCommand,
  createWorld,
  snapshotWorld,
} from "./index";

function buildHomeAndWell() {
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
    tiles: Array.from({ length: 7 }, (_, x) => ({ x, y: 15 })),
  });
  applyCommand(world, {
    seq: 3,
    type: "build",
    buildingTypeId: "well",
    x: 6,
    y: 14,
    rotation: 0,
  });
  return world;
}

describe("入住市民的连续生活与工作", () => {
  it("住宅完成入住的同一 tick 产生一名位于门前道路的市民代表", () => {
    const world = buildHomeAndWell();

    advanceTicks(world, 6);

    expect(snapshotWorld(world)).toMatchObject({
      households: [{ houseId: 1, residents: 5 }],
      citizens: [
        {
          id: 1,
          houseId: 1,
          workplaceId: 2,
          x: 1,
          y: 15,
          state: "commuting",
          dwellTicks: 0,
        },
      ],
    });
  });

  it("市民逐格上工、停留工作，再逐格返家而不是瞬移", () => {
    const world = buildHomeAndWell();
    advanceTicks(world, 6);

    advanceTicks(world, 4);
    expect(snapshotWorld(world)).toMatchObject({
      citizens: [{ x: 5, y: 15, state: "commuting" }],
    });

    advanceTicks(world, 1);
    expect(snapshotWorld(world)).toMatchObject({
      citizens: [{ x: 6, y: 15, state: "working", dwellTicks: 1 }],
    });

    advanceTicks(world, 2);
    expect(snapshotWorld(world)).toMatchObject({
      citizens: [{ x: 5, y: 15, state: "returning" }],
    });
  });

  it("途中断路不会让市民穿越空地，补路后恢复通勤", () => {
    const world = buildHomeAndWell();
    advanceTicks(world, 8);
    expect(snapshotWorld(world)).toMatchObject({
      citizens: [{ x: 3, y: 15, state: "commuting" }],
    });

    applyCommand(world, { seq: 4, type: "demolish", x: 4, y: 15 });
    advanceTicks(world, 1);
    expect(snapshotWorld(world)).toMatchObject({
      citizens: [{ x: 2, y: 15, state: "strolling" }],
    });

    applyCommand(world, {
      seq: 5,
      type: "build-road-path",
      tiles: [{ x: 4, y: 15 }],
    });
    advanceTicks(world, 4);
    expect(snapshotWorld(world)).toMatchObject({
      citizens: [{ state: "working", x: 6, y: 15 }],
    });
  });

  it("拆除住宅会清理市民，拆除岗位会重新分配为无业活动", () => {
    const world = buildHomeAndWell();
    advanceTicks(world, 6);

    applyCommand(world, { seq: 4, type: "demolish", x: 6, y: 14 });
    advanceTicks(world, 1);
    expect(snapshotWorld(world)).toMatchObject({
      citizens: [{ workplaceId: null, state: "strolling" }],
    });

    applyCommand(world, { seq: 5, type: "demolish", x: 1, y: 13 });
    expect(snapshotWorld(world).citizens ?? []).toEqual([]);
  });
});
