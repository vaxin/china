import { describe, expect, it } from "vitest";

import {
  advanceTicks,
  applyCommand,
  createSimulationRuntime,
  createWorld,
  evaluateDemolition,
  evaluateRoadPlacement,
  hydrateWorld,
  snapshotWorld,
} from "./index";
import { isTerrainTileBuildable, sampleTerrainCover } from "@empire/protocol";

function populatedGateHouse() {
  const world = createWorld();
  applyCommand(world, {
    seq: 1,
    type: "build",
    buildingTypeId: "house",
    x: 1,
    y: 14,
    rotation: 0,
  });
  const house = world.buildings.find((building) => building.typeId === "house");
  if (house?.typeId === "house") house.constructionStage = 4;
  applyCommand(world, {
    seq: 2,
    type: "build-road-path",
    tiles: [{ x: 0, y: 15 }],
  });
  advanceTicks(world, 1);
  return world;
}

function populatedLocalRoadCity() {
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
  const house = world.buildings.find((building) => building.typeId === "house");
  if (house?.typeId === "house") house.constructionStage = 4;
  advanceTicks(world, 1);
  return world;
}

describe("拆除规则", () => {
  it("郊区草地阻挡营造，清理后消失并允许铺路", () => {
    const world = createWorld();
    let vegetationTile: { x: number; y: number } | undefined;
    for (let y = -32; y < 64 && !vegetationTile; y += 1) {
      for (let x = -32; x < 64; x += 1) {
        if (
          sampleTerrainCover(x + 0.5, y + 0.5).vegetationObstacle &&
          isTerrainTileBuildable({ x, y })
        ) {
          vegetationTile = { x, y };
          break;
        }
      }
    }
    expect(vegetationTile).toBeDefined();
    expect(
      evaluateRoadPlacement(
        snapshotWorld(world),
        vegetationTile!.x,
        vegetationTile!.y,
      ),
    ).toBe("vegetation");
    expect(
      evaluateDemolition(
        snapshotWorld(world),
        vegetationTile!.x,
        vegetationTile!.y,
      ),
    ).toBe("valid");
    expect(
      applyCommand(world, {
        seq: 1,
        type: "build-road-path",
        tiles: [vegetationTile!],
      }).result,
    ).toMatchObject({ accepted: false, reasonCode: "vegetation" });

    expect(
      applyCommand(world, {
        seq: 2,
        type: "demolish",
        ...vegetationTile!,
      }).result,
    ).toMatchObject({ accepted: true });
    expect(snapshotWorld(world).clearedVegetation).toEqual([vegetationTile]);
    expect(snapshotWorld(hydrateWorld(snapshotWorld(world)))).toEqual(
      snapshotWorld(world),
    );
    expect(
      createSimulationRuntime().handle({
        type: "initialize",
        snapshot: snapshotWorld(world),
      }),
    ).toMatchObject({
      type: "ready",
      snapshot: { clearedVegetation: [vegetationTile] },
    });
    expect(
      evaluateRoadPlacement(
        snapshotWorld(world),
        vegetationTile!.x,
        vegetationTile!.y,
      ),
    ).toBe("valid");
    expect(
      applyCommand(world, {
        seq: 3,
        type: "build-road-path",
        tiles: [vegetationTile!],
      }).result,
    ).toMatchObject({ accepted: true });
  });
  it("拆除城门入口道路后保留仍接入城内道路的住户和人物", () => {
    const world = populatedLocalRoadCity();

    const application = applyCommand(world, {
      seq: 3,
      type: "demolish",
      x: 0,
      y: 15,
    });

    expect(application.snapshot).toMatchObject({
      roads: [
        { x: 1, y: 15 },
        { x: 2, y: 15 },
        { x: 3, y: 15 },
        { x: 4, y: 15 },
        { x: 5, y: 15 },
        { x: 6, y: 15 },
      ],
      households: [{ houseId: 1, residents: 5 }],
      citizens: [{ id: 1, houseId: 1 }],
    });

    advanceTicks(world, 1);
    expect(snapshotWorld(world)).toMatchObject({
      households: [{ houseId: 1, residents: 5 }],
      citizens: [{ id: 1, houseId: 1 }],
    });
  });

  it("拆除道路并在同一快照中迁出失去服务的住户", () => {
    const world = populatedGateHouse();

    const application = applyCommand(world, {
      seq: 3,
      type: "demolish",
      x: 0,
      y: 15,
    });

    expect(application.result).toEqual({
      seq: 3,
      accepted: true,
      appliedAtTick: 1,
      revision: 4,
    });
    expect(application.snapshot).toMatchObject({
      roads: [],
      households: [],
      buildings: [{ id: 1 }],
    });
  });

  it("点击住宅占地任一格会删除整座住宅及其住户", () => {
    const world = populatedGateHouse();

    const application = applyCommand(world, {
      seq: 4,
      type: "demolish",
      x: 2,
      y: 15,
    });

    expect(application.result).toMatchObject({ accepted: true, revision: 4 });
    expect(application.snapshot.buildings).toEqual([]);
    expect(application.snapshot.households).toEqual([]);
    expect(application.snapshot.roads).toEqual([{ x: 0, y: 15 }]);
  });

  it("空地拆除明确拒绝且世界不变", () => {
    const world = createWorld();
    const before = snapshotWorld(world);

    const application = applyCommand(world, {
      seq: 5,
      type: "demolish",
      x: 20,
      y: 20,
    });

    expect(application.result).toEqual({
      seq: 5,
      accepted: false,
      reasonCode: "nothing-to-demolish",
    });
    expect(application.snapshot).toEqual(before);
  });

  it("越界拆除明确拒绝且世界不变", () => {
    const world = createWorld();
    const before = snapshotWorld(world);

    const application = applyCommand(world, {
      seq: 6,
      type: "demolish",
      x: -33,
      y: 15,
    });

    expect(application.result).toEqual({
      seq: 6,
      accepted: false,
      reasonCode: "out-of-bounds",
    });
    expect(application.snapshot).toEqual(before);
  });

  it("补回入口道路后在下一 tick 恢复住户且不重复", () => {
    const world = populatedGateHouse();
    applyCommand(world, { seq: 3, type: "demolish", x: 0, y: 15 });
    applyCommand(world, {
      seq: 4,
      type: "build-road-path",
      tiles: [{ x: 0, y: 15 }],
    });
    expect(snapshotWorld(world).households).toEqual([]);

    advanceTicks(world, 1);
    const restored = snapshotWorld(world);
    advanceTicks(world, 1);

    expect(restored.households).toMatchObject([
      {
        houseId: 1,
        residents: 5,
        foodReserveTicks: 3,
        foodQuality: "bland",
      },
    ]);
    expect(snapshotWorld(world).households).toMatchObject([
      {
        houseId: 1,
        residents: 5,
        foodReserveTicks: 2,
        foodQuality: "bland",
      },
    ]);
    expect(snapshotWorld(world).revision).toBe(restored.revision + 1);
  });
});
