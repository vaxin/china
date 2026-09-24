import { describe, expect, it } from "vitest";

import {
  advanceTicks,
  applyCommand,
  createWorld,
  snapshotWorld,
} from "./index";

function buildHouseWithRoad(houseX = 1, roadTiles = [{ x: 0, y: 15 }]) {
  const world = createWorld();
  applyCommand(world, {
    seq: 1,
    type: "build",
    buildingTypeId: "house",
    x: houseX,
    y: 14,
    rotation: 0,
  });
  applyCommand(world, {
    seq: 2,
    type: "build-road-path",
    tiles: roadTiles,
  });
  return world;
}

function advanceActivity(world: ReturnType<typeof createWorld>, pulses = 1) {
  applyCommand(world, {
    seq: 1_000 + world.revision,
    type: "advance-activity",
    pulses,
  });
}

describe("宅基地、流民与施工状态机", () => {
  it("合法住宅先落为宅基地且没有流民或住户", () => {
    const world = createWorld();

    const result = applyCommand(world, {
      seq: 1,
      type: "build",
      buildingTypeId: "house",
      x: 1,
      y: 14,
      rotation: 0,
    });

    expect(result.snapshot).toMatchObject({
      buildings: [{ id: 1, typeId: "house", level: 1, constructionStage: 0 }],
      households: [],
      migrants: [],
    });
  });

  it("城门道路接通后流民到达并按四阶段建成才入住", () => {
    const world = buildHouseWithRoad();

    advanceTicks(world, 1);
    expect(snapshotWorld(world)).toMatchObject({
      tick: 1,
      buildings: [{ constructionStage: 0 }],
      households: [],
      migrants: [{ houseId: 1, x: 0, y: 15, state: "walking" }],
    });

    advanceActivity(world);
    expect(snapshotWorld(world)).toMatchObject({
      tick: 1,
      buildings: [{ constructionStage: 1 }],
      households: [],
      migrants: [{ houseId: 1, x: 0, y: 15, state: "building" }],
    });

    advanceTicks(world, 2);
    expect(snapshotWorld(world)).toMatchObject({
      tick: 3,
      buildings: [{ constructionStage: 3 }],
      households: [],
      migrants: [{ houseId: 1, state: "building" }],
    });

    advanceTicks(world, 1);
    expect(snapshotWorld(world)).toMatchObject({
      tick: 4,
      buildings: [{ constructionStage: 4, level: 1 }],
      households: [{ houseId: 1, residents: 5, foodReserveTicks: 3 }],
      migrants: [],
    });
  });

  it("较远住宅的流民每个活动节拍只前进一个正交道路格", () => {
    const roads = [
      { x: 0, y: 15 },
      { x: 1, y: 15 },
      { x: 2, y: 15 },
    ];
    const world = buildHouseWithRoad(3, roads);

    advanceTicks(world, 1);
    expect(snapshotWorld(world).migrants).toEqual([
      { houseId: 1, x: 0, y: 15, state: "walking" },
    ]);
    advanceActivity(world);
    expect(snapshotWorld(world).migrants).toEqual([
      { houseId: 1, x: 1, y: 15, state: "walking" },
    ]);
    advanceActivity(world);
    expect(snapshotWorld(world).migrants).toEqual([
      { houseId: 1, x: 2, y: 15, state: "walking" },
    ]);
  });

  it("道路数组顺序不改变流民的确定性最短路径", () => {
    const roads = [
      { x: 0, y: 15 },
      { x: 1, y: 15 },
      { x: 2, y: 15 },
      { x: 0, y: 14 },
      { x: 1, y: 14 },
      { x: 2, y: 14 },
    ];
    const forward = buildHouseWithRoad(3, roads);
    const reversed = buildHouseWithRoad(3, [...roads].reverse());

    advanceTicks(forward, 1);
    advanceTicks(reversed, 1);
    advanceActivity(forward, 2);
    advanceActivity(reversed, 2);

    expect(snapshotWorld(reversed).migrants).toEqual(
      snapshotWorld(forward).migrants,
    );
  });

  it("途中道路被拆后取消失效流民并在补路后从城门重来", () => {
    const world = buildHouseWithRoad(3, [
      { x: 0, y: 15 },
      { x: 1, y: 15 },
      { x: 2, y: 15 },
    ]);
    advanceTicks(world, 1);
    advanceActivity(world);
    expect(snapshotWorld(world).migrants[0]).toMatchObject({ x: 1, y: 15 });

    applyCommand(world, { seq: 3, type: "demolish", x: 1, y: 15 });
    expect(snapshotWorld(world)).toMatchObject({
      buildings: [{ constructionStage: 0 }],
      migrants: [],
      households: [],
    });

    applyCommand(world, {
      seq: 4,
      type: "build-road-path",
      tiles: [{ x: 1, y: 15 }],
    });
    advanceTicks(world, 1);
    expect(snapshotWorld(world).migrants).toEqual([
      { houseId: 1, x: 0, y: 15, state: "walking" },
    ]);
  });

  it("拆除未完工住宅会同时清理绑定流民", () => {
    const world = buildHouseWithRoad();
    advanceTicks(world, 3);
    expect(snapshotWorld(world).migrants).toHaveLength(1);

    const result = applyCommand(world, {
      seq: 3,
      type: "demolish",
      x: 1,
      y: 14,
    });

    expect(result.snapshot).toMatchObject({
      buildings: [],
      migrants: [],
      households: [],
    });
  });

  it("批量推进与逐 tick 推进得到相同施工和流民结果", () => {
    const batch = buildHouseWithRoad(3, [
      { x: 0, y: 15 },
      { x: 1, y: 15 },
      { x: 2, y: 15 },
    ]);
    const stepped = buildHouseWithRoad(3, [
      { x: 0, y: 15 },
      { x: 1, y: 15 },
      { x: 2, y: 15 },
    ]);

    advanceTicks(batch, 7);
    for (let index = 0; index < 7; index += 1) advanceTicks(stepped, 1);

    expect(snapshotWorld(batch)).toEqual(snapshotWorld(stepped));
  });
});
