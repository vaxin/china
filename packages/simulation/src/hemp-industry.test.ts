import { describe, expect, it } from "vitest";

import {
  advanceTicks,
  applyCommand,
  createWorld,
  snapshotWorld,
} from "./index";

type World = ReturnType<typeof createWorld>;

function build(
  world: World,
  buildingTypeId: "hemp-farm" | "weaver" | "market",
  x: number,
  y: number,
) {
  return applyCommand(world, {
    seq: world.revision + 1,
    type: "build",
    buildingTypeId,
    x,
    y,
    rotation: 0,
  });
}

function connectedIndustry() {
  const world = createWorld();
  build(world, "hemp-farm", 1, 11);
  build(world, "weaver", 1, 14);
  build(world, "market", 1, 17);
  applyCommand(world, {
    seq: world.revision + 1,
    type: "build-road-path",
    tiles: Array.from({ length: 6 }, (_, index) => ({ x: 0, y: index + 12 })),
  });
  return world;
}

describe("麻到衣物产业链", () => {
  it("麻田只在九月收获并可在同 tick 经织坊进入市场", () => {
    const world = connectedIndustry();

    advanceTicks(world, 7);
    expect(snapshotWorld(world).buildings).toMatchObject([
      { typeId: "hemp-farm", hempStock: 0 },
      { typeId: "weaver", hempStock: 0, clothingStock: 0 },
      { typeId: "market", clothingStock: 0 },
    ]);
    advanceTicks(world, 1);

    expect(snapshotWorld(world).buildings).toMatchObject([
      { typeId: "hemp-farm", hempStock: 0 },
      { typeId: "weaver", hempStock: 0, clothingStock: 0 },
      { typeId: "market", clothingStock: 1 },
    ]);
  });

  it("市场衣物满仓时成衣留在织坊且不吞货", () => {
    const world = connectedIndustry();
    const weaver = world.buildings.find(
      (building) => building.typeId === "weaver",
    );
    const market = world.buildings.find(
      (building) => building.typeId === "market",
    );
    if (!weaver || weaver.typeId !== "weaver")
      throw new Error("测试织坊不存在");
    if (!market || market.typeId !== "market")
      throw new Error("测试市场不存在");
    weaver.clothingStock = 1;
    market.clothingStock = 4;

    advanceTicks(world, 1);

    expect(snapshotWorld(world).buildings).toMatchObject([
      { typeId: "hemp-farm", hempStock: 0 },
      { typeId: "weaver", clothingStock: 1 },
      { typeId: "market", clothingStock: 4 },
    ]);
  });

  it("断开织坊到市场道路会积压成衣，补路后下一 tick 自愈", () => {
    const world = connectedIndustry();
    world.tick = 7;
    applyCommand(world, { seq: 20, type: "demolish", x: 0, y: 15 });

    advanceTicks(world, 1);
    expect(snapshotWorld(world).buildings).toMatchObject([
      { typeId: "hemp-farm", hempStock: 0 },
      { typeId: "weaver", clothingStock: 1 },
      { typeId: "market", clothingStock: 0 },
    ]);

    applyCommand(world, {
      seq: 21,
      type: "build-road-path",
      tiles: [{ x: 0, y: 15 }],
    });
    advanceTicks(world, 1);
    expect(snapshotWorld(world).buildings).toMatchObject([
      { typeId: "hemp-farm", hempStock: 0 },
      { typeId: "weaver", clothingStock: 0 },
      { typeId: "market", clothingStock: 1 },
    ]);
  });

  it("市场把真实衣物配送给可达住宅并形成三 tick 储备", () => {
    const world = createWorld();
    applyCommand(world, {
      seq: 1,
      type: "build",
      buildingTypeId: "house",
      x: 1,
      y: 14,
      rotation: 0,
    });
    build(world, "market", 4, 14);
    applyCommand(world, {
      seq: 3,
      type: "build-road-path",
      tiles: [
        { x: 0, y: 15 },
        { x: 0, y: 16 },
        { x: 1, y: 16 },
        { x: 2, y: 16 },
        { x: 3, y: 16 },
        { x: 4, y: 16 },
      ],
    });
    const house = world.buildings.find(
      (building) => building.typeId === "house",
    );
    const market = world.buildings.find(
      (building) => building.typeId === "market",
    );
    if (!house || house.typeId !== "house") throw new Error("测试住宅不存在");
    if (!market || market.typeId !== "market")
      throw new Error("测试市场不存在");
    house.constructionStage = 4;
    world.households = [
      {
        houseId: house.id,
        residents: 5,
        foodReserveTicks: 3,
        foodQuality: "bland",
        clothingReserveTicks: 0,
      },
    ];
    market.clothingStock = 1;

    advanceTicks(world, 1);

    expect(snapshotWorld(world)).toMatchObject({
      buildings: [{ typeId: "house" }, { typeId: "market", clothingStock: 0 }],
      households: [{ houseId: house.id, clothingReserveTicks: 3 }],
    });
  });
});
