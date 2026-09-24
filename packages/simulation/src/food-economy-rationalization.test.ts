import { describe, expect, it } from "vitest";

import {
  advanceTicks,
  applyCommand,
  createWorld,
  snapshotWorld,
} from "./index";

function build(
  world: ReturnType<typeof createWorld>,
  buildingTypeId: "farm" | "house" | "market" | "well",
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
    ...(buildingTypeId === "farm" ? { cropType: "wheat" as const } : {}),
  });
}

describe("粮食经济合理化", () => {
  it("无人农场在收获月不生产粮食", () => {
    const world = createWorld();
    build(world, "farm", 3, 3);

    advanceTicks(world, 6); // 第七月，小麦收获月；城市没有可用劳力。

    expect(snapshotWorld(world).buildings).toMatchObject([
      { typeId: "farm", foodStock: 0 },
    ]);
  });

  it("十人家庭每月消耗两单位粮食", () => {
    const world = createWorld();
    build(world, "house", 1, 13);
    build(world, "well", 3, 14);
    applyCommand(world, {
      seq: world.revision + 1,
      type: "build-road-path",
      tiles: [
        { x: 0, y: 15 },
        { x: 1, y: 15 },
        { x: 2, y: 15 },
        { x: 3, y: 15 },
      ],
    });
    const house = world.buildings[0];
    if (!house || house.typeId !== "house") throw new Error("测试住宅不存在");
    house.constructionStage = 4;
    world.households = [
      {
        houseId: house.id,
        residents: 10,
        foodReserveTicks: 3,
        foodQuality: "bland",
      },
    ];

    advanceTicks(world, 1);

    const household = snapshotWorld(world).households[0] as {
      foodReserveUnits?: number;
      foodReserveTicks: number;
    };
    expect(household.foodReserveUnits).toBe(4);
    expect(household.foodReserveTicks).toBe(2);
  });

  it("家庭买粮款进入市场账户而非国库", () => {
    const world = createWorld();
    build(world, "house", 1, 13);
    build(world, "market", 4, 13);
    applyCommand(world, {
      seq: world.revision + 1,
      type: "build-road-path",
      tiles: Array.from({ length: 6 }, (_, x) => ({ x, y: 15 })),
    });
    const house = world.buildings.find(
      (building) => building.typeId === "house",
    );
    const market = world.buildings.find(
      (building) => building.typeId === "market",
    );
    if (
      !house ||
      house.typeId !== "house" ||
      !market ||
      market.typeId !== "market"
    ) {
      throw new Error("测试建筑不存在");
    }
    house.constructionStage = 4;
    market.foodStock = 3;
    market.foodStocks.wheat = 3;
    world.households = [
      {
        houseId: house.id,
        residents: 5,
        foodReserveTicks: 0,
        foodQuality: "none",
        cash: 12,
        employedWorkers: 0,
        lastIncome: 0,
        lastFoodExpense: 0,
        wageArrears: 0,
        taxArrears: 0,
        foodShortageReason: "none",
        livelihoodLedger: [],
      },
    ];
    const treasuryBefore = world.economy.treasury;

    advanceTicks(world, 1);

    const marketAfter = snapshotWorld(world).buildings.find(
      (building) => building.typeId === "market",
    ) as { operatingCash?: number };
    expect(marketAfter.operatingCash).toBe(13);
    expect(world.economy.treasury).toBe(treasuryBefore);
  });
});
