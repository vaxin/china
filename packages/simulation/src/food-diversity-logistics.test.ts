import { describe, expect, it } from "vitest";

import type { CropType } from "@empire/protocol";
import {
  advanceTicks,
  applyCommand,
  createWorld,
  snapshotWorld,
} from "./index";

type World = ReturnType<typeof createWorld>;

function build(
  world: World,
  buildingTypeId: "house" | "farm" | "granary" | "market",
  x: number,
  y: number,
  cropType?: CropType,
) {
  return applyCommand(world, {
    seq: world.revision + 1,
    type: "build",
    buildingTypeId,
    x,
    y,
    rotation: 0,
    ...(buildingTypeId === "farm" ? { cropType: cropType ?? "millet" } : {}),
  });
}

function road(world: World, tiles: Array<{ x: number; y: number }>) {
  applyCommand(world, {
    seq: world.revision + 1,
    type: "build-road-path",
    tiles,
  });
}

describe("分品类粮食物流", () => {
  it("新粮仓与市场从五类零库存开始", () => {
    const world = createWorld();
    build(world, "granary", 5, 5);
    build(world, "market", 8, 5);

    expect(snapshotWorld(world).buildings).toMatchObject([
      {
        typeId: "granary",
        foodStock: 0,
        foodStocks: { wheat: 0, soybean: 0, rice: 0, millet: 0, cabbage: 0 },
      },
      {
        typeId: "market",
        foodStock: 0,
        foodStocks: { wheat: 0, soybean: 0, rice: 0, millet: 0, cabbage: 0 },
      },
    ]);
  });

  it("农场入仓保留来源作物且总库存守恒", () => {
    const world = createWorld();
    build(world, "farm", 1, 11, "wheat");
    build(world, "farm", 4, 11, "rice");
    build(world, "granary", 1, 14);
    road(world, [
      { x: 1, y: 13 },
      { x: 2, y: 13 },
      { x: 3, y: 13 },
      { x: 4, y: 13 },
    ]);
    for (const farm of world.buildings.filter(
      (building) => building.typeId === "farm",
    )) {
      if (farm.typeId === "farm") farm.foodStock = 1;
    }

    advanceTicks(world, 2);

    expect(snapshotWorld(world).buildings).toMatchObject([
      { typeId: "farm", cropType: "wheat", foodStock: 0 },
      { typeId: "farm", cropType: "rice", foodStock: 0 },
      {
        typeId: "granary",
        foodStock: 2,
        foodStocks: { wheat: 1, soybean: 0, rice: 1, millet: 0, cabbage: 0 },
      },
    ]);
  });

  it("市场优先补齐缺少品类并把配送前品质交给住户", () => {
    const world = createWorld();
    build(world, "granary", 1, 18);
    build(world, "market", 4, 14);
    build(world, "house", 1, 14);
    road(world, [
      { x: 0, y: 15 },
      { x: 0, y: 16 },
      { x: 1, y: 16 },
      { x: 2, y: 16 },
      { x: 3, y: 16 },
      { x: 4, y: 16 },
      { x: 4, y: 17 },
      { x: 3, y: 17 },
      { x: 2, y: 17 },
    ]);
    const house = world.buildings.find(
      (building) => building.typeId === "house",
    );
    const granary = world.buildings.find(
      (building) => building.typeId === "granary",
    );
    const market = world.buildings.find(
      (building) => building.typeId === "market",
    );
    if (!house || house.typeId !== "house") throw new Error("测试住宅不存在");
    if (!granary || granary.typeId !== "granary")
      throw new Error("测试粮仓不存在");
    if (!market || market.typeId !== "market")
      throw new Error("测试市场不存在");
    house.constructionStage = 4;
    world.households = [
      {
        houseId: house.id,
        residents: 5,
        foodReserveTicks: 0,
        foodQuality: "none",
      },
    ];
    granary.foodStock = 1;
    granary.foodStocks.rice = 1;
    market.foodStock = 3;
    market.foodStocks.wheat = 1;
    market.foodStocks.soybean = 1;
    market.foodStocks.millet = 1;

    advanceTicks(world, 1);

    expect(snapshotWorld(world)).toMatchObject({
      buildings: [
        { typeId: "granary", foodStock: 0, foodStocks: { rice: 0 } },
        {
          typeId: "market",
          foodStock: 3,
          foodStocks: { wheat: 0, soybean: 1, rice: 1, millet: 1 },
        },
        { typeId: "house" },
      ],
      households: [
        { houseId: house.id, foodReserveTicks: 3, foodQuality: "tasty" },
      ],
    });
  });
});
