import { describe, expect, it } from "vitest";

import {
  advanceTicks,
  applyCommand,
  createWorld,
  snapshotWorld,
} from "./index";

function buildHouse(
  world: ReturnType<typeof createWorld>,
  x: number,
  y: number,
) {
  const application = applyCommand(world, {
    seq: world.revision + 1,
    type: "build",
    buildingTypeId: "house",
    x,
    y,
    rotation: 0,
  });
  const house = world.buildings.find(
    (building) =>
      building.typeId === "house" && building.x === x && building.y === y,
  );
  if (house?.typeId === "house") house.constructionStage = 4;
  return application;
}

function buildWell(
  world: ReturnType<typeof createWorld>,
  x: number,
  y: number,
) {
  return applyCommand(world, {
    seq: world.revision + 1,
    type: "build",
    buildingTypeId: "well",
    x,
    y,
    rotation: 0,
  });
}

function buildRoad(
  world: ReturnType<typeof createWorld>,
  tiles: Array<{ x: number; y: number }>,
) {
  return applyCommand(world, {
    seq: world.revision + 1,
    type: "build-road-path",
    tiles,
  });
}

describe("水井建造", () => {
  it("合法 1×1 空地生成有全局 ID 的水井", () => {
    const world = createWorld();

    const application = buildWell(world, 5, 5);

    expect(application.result).toMatchObject({ accepted: true, revision: 1 });
    expect(application.snapshot.buildings).toEqual([
      {
        id: 1,
        typeId: "well",
        x: 5,
        y: 5,
        rotation: 0,
        footprint: { width: 1, height: 1 },
      },
    ]);
  });

  it("水井不能压道路、住宅或城门格", () => {
    const roadWorld = createWorld();
    buildRoad(roadWorld, [{ x: 5, y: 5 }]);
    const roadBefore = snapshotWorld(roadWorld);
    expect(buildWell(roadWorld, 5, 5).result).toMatchObject({
      accepted: false,
      reasonCode: "occupied",
    });
    expect(snapshotWorld(roadWorld)).toEqual(roadBefore);

    const houseWorld = createWorld();
    buildHouse(houseWorld, 5, 5);
    expect(buildWell(houseWorld, 6, 6).result).toMatchObject({
      accepted: false,
      reasonCode: "occupied",
    });

    const gateWorld = createWorld();
    expect(buildWell(gateWorld, 0, 15).result).toMatchObject({
      accepted: false,
      reasonCode: "occupied",
    });
  });
});

describe("道路供水与住宅升级", () => {
  it("新住户当 tick 保持一级 5 人，下一 tick 才升级到 10 人", () => {
    const world = createWorld();
    buildHouse(world, 1, 14);
    buildRoad(world, [{ x: 0, y: 15 }]);
    buildWell(world, 0, 14);

    advanceTicks(world, 1);
    expect(snapshotWorld(world)).toMatchObject({
      buildings: [{ typeId: "house", level: 1 }, { typeId: "well" }],
      households: [{ houseId: 1, residents: 5 }],
    });

    advanceTicks(world, 1);
    expect(snapshotWorld(world)).toMatchObject({
      buildings: [{ typeId: "house", level: 2 }, { typeId: "well" }],
      households: [{ houseId: 1, residents: 10 }],
    });
  });

  it("水井无邻接道路或位于不同道路分量时不供水", () => {
    const world = createWorld();
    buildHouse(world, 1, 14);
    buildRoad(world, [{ x: 0, y: 15 }]);
    buildWell(world, 5, 5);
    buildRoad(world, [{ x: 5, y: 6 }]);

    advanceTicks(world, 2);

    expect(snapshotWorld(world)).toMatchObject({
      buildings: [{ typeId: "house", level: 1 }, { typeId: "well" }],
      households: [{ houseId: 1, residents: 5 }],
    });
  });

  it("水服务不会从地图右边界环绕到下一行左边界", () => {
    const world = createWorld();
    buildHouse(world, 0, 17);
    buildRoad(world, [
      { x: 0, y: 15 },
      { x: 0, y: 16 },
    ]);
    buildWell(world, 31, 14);
    buildRoad(world, [{ x: 31, y: 15 }]);

    advanceTicks(world, 2);

    expect(snapshotWorld(world)).toMatchObject({
      buildings: [{ typeId: "house", level: 1 }, { typeId: "well" }],
      households: [{ houseId: 1, residents: 5 }],
    });
  });

  it.each([
    ["服务范围末格", 8, 9, 2, 10],
    ["超出服务范围一格", 9, 10, 1, 5],
  ])(
    "%s按道路距离 8/9 正确判定",
    (_name, lastRoadX, houseX, level, residents) => {
      const world = createWorld();
      buildHouse(world, houseX, 14);
      buildWell(world, 0, 14);
      buildRoad(
        world,
        Array.from({ length: lastRoadX + 1 }, (_, x) => ({ x, y: 15 })),
      );

      advanceTicks(world, 2);

      expect(snapshotWorld(world)).toMatchObject({
        buildings: [{ typeId: "house", level }, { typeId: "well" }],
        households: [{ houseId: 1, residents }],
      });
    },
  );

  it("拆井立即降级为 5 人，补井后下一 tick 自愈", () => {
    const world = createWorld();
    buildHouse(world, 1, 14);
    buildRoad(world, [{ x: 0, y: 15 }]);
    buildWell(world, 0, 14);
    advanceTicks(world, 2);
    const revisionBeforeDemolition = world.revision;

    const demolition = applyCommand(world, {
      seq: 10,
      type: "demolish",
      x: 0,
      y: 14,
    });

    expect(demolition.result).toMatchObject({
      accepted: true,
      revision: revisionBeforeDemolition + 1,
    });
    expect(demolition.snapshot).toMatchObject({
      buildings: [{ typeId: "house", level: 1 }],
      households: [{ houseId: 1, residents: 5 }],
    });

    buildWell(world, 0, 14);
    advanceTicks(world, 1);
    expect(snapshotWorld(world)).toMatchObject({
      buildings: [{ typeId: "house", level: 2 }, { typeId: "well" }],
      households: [{ houseId: 1, residents: 10 }],
    });
  });
});
