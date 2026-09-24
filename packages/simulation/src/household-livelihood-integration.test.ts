import { describe, expect, it } from "vitest";
import type { WorldSnapshot } from "@empire/protocol";

import { advanceTicks, hydrateWorld, snapshotWorld } from "./index";

function livelihoodCity(
  overrides: {
    cash?: number;
    foodReserveTicks?: 0 | 1 | 2 | 3;
    marketFood?: 0 | 1 | 2 | 3 | 4;
    roads?: Array<{ x: number; y: number }>;
  } = {},
): WorldSnapshot {
  const marketFood = overrides.marketFood ?? 2;
  return {
    map: { width: 32, height: 32 },
    tick: 4,
    revision: 2,
    buildings: [
      {
        id: 1,
        typeId: "house",
        x: 1,
        y: 13,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        level: 1,
        constructionStage: 4,
      },
      {
        id: 2,
        typeId: "market",
        x: 4,
        y: 13,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        foodStock: marketFood,
        foodStocks: {
          wheat: marketFood,
          soybean: 0,
          rice: 0,
          millet: 0,
          cabbage: 0,
        },
        clothingStock: 0,
      },
    ],
    roads:
      overrides.roads ?? Array.from({ length: 6 }, (_, x) => ({ x, y: 15 })),
    households: [
      {
        houseId: 1,
        residents: 5,
        foodReserveTicks: overrides.foodReserveTicks ?? 2,
        foodQuality: "bland",
        cash: overrides.cash ?? 12,
        employedWorkers: 0,
        lastIncome: 0,
        lastFoodExpense: 0,
        wageArrears: 0,
        taxArrears: 0,
        foodShortageReason: "none",
        livelihoodLedger: [],
      },
    ],
    householdFoodOrders: [],
    migrants: [],
    economy: {
      treasury: 500,
      taxRate: "standard",
      lastTaxRevenue: 0,
      lastPayroll: 0,
      taxableHouses: 0,
      sentiment: 50,
      lastTradeRevenue: 0,
      foodOrderEscrow: 0,
    },
  };
}

describe("household livelihood world loop", () => {
  it("earns wages, prepays one ration and receives it on a later tick", () => {
    const world = hydrateWorld(livelihoodCity());

    advanceTicks(world, 1);
    expect(snapshotWorld(world)).toMatchObject({
      tick: 5,
      households: [
        {
          houseId: 1,
          cash: 13,
          employedWorkers: 1,
          lastIncome: 2,
          lastFoodExpense: 1,
          foodReserveTicks: 1,
          foodShortageReason: "none",
        },
      ],
      householdFoodOrders: [
        {
          houseId: 1,
          marketId: 2,
          cropType: "wheat",
          price: 1,
          placedAtTick: 5,
          arrivesAtTick: 6,
        },
      ],
      economy: {
        treasury: 499,
        lastPayroll: 2,
        foodOrderEscrow: 1,
      },
      buildings: [{ id: 1 }, { id: 2, foodStock: 1 }],
    });

    advanceTicks(world, 1);
    expect(snapshotWorld(world)).toMatchObject({
      tick: 6,
      households: [
        {
          cash: 15,
          foodReserveTicks: 3,
          foodShortageReason: "none",
        },
      ],
    });
    expect(snapshotWorld(world).householdFoodOrders ?? []).toEqual([]);
    expect(snapshotWorld(world).economy?.foodOrderEscrow ?? 0).toBe(0);
  });

  it("does not create an order when the household cannot afford food", () => {
    const snapshot = livelihoodCity({ cash: 0, foodReserveTicks: 0 });
    snapshot.buildings = snapshot.buildings.filter(
      (building) => building.typeId !== "market",
    );
    const market = livelihoodCity({ marketFood: 2 }).buildings[1];
    if (!market || market.typeId !== "market") {
      throw new Error("market fixture missing");
    }
    snapshot.buildings.push(market);
    const world = hydrateWorld(snapshot);
    world.economy.treasury = 0;

    advanceTicks(world, 1);

    expect(snapshotWorld(world)).toMatchObject({
      households: [
        {
          cash: 0,
          foodReserveTicks: 0,
          foodShortageReason: "unaffordable",
        },
      ],
      buildings: [{ id: 1 }, { id: 2, foodStock: 2 }],
    });
    expect(snapshotWorld(world).householdFoodOrders ?? []).toEqual([]);
  });

  it("distinguishes an empty market, a broken route and a missing market", () => {
    const emptyMarket = livelihoodCity({
      foodReserveTicks: 0,
      marketFood: 0,
    });
    const brokenRoute = livelihoodCity({
      foodReserveTicks: 0,
      roads: [
        { x: 0, y: 15 },
        { x: 1, y: 15 },
      ],
    });
    const missingMarket = livelihoodCity({ foodReserveTicks: 0 });
    missingMarket.buildings = missingMarket.buildings.filter(
      (building) => building.typeId !== "market",
    );

    const cases = [
      [emptyMarket, "out-of-stock"],
      [brokenRoute, "disconnected"],
      [missingMarket, "no-market"],
    ] as const;
    for (const [snapshot, reason] of cases) {
      const world = hydrateWorld(snapshot);
      advanceTicks(world, 1);

      expect(snapshotWorld(world).households[0]).toMatchObject({
        foodReserveTicks: 0,
        foodShortageReason: reason,
      });
      expect(snapshotWorld(world).householdFoodOrders ?? []).toEqual([]);
    }
  });

  it("refunds and returns reserved stock when the route breaks before delivery", () => {
    const world = hydrateWorld(livelihoodCity());
    advanceTicks(world, 1);
    world.roads = world.roads.filter((road) => road.x !== 3);
    world.economy.treasury = world.economy.foodOrderEscrow ?? 1;

    advanceTicks(world, 1);

    expect(snapshotWorld(world)).toMatchObject({
      households: [
        {
          cash: 14,
          foodReserveTicks: 0,
          foodShortageReason: "disconnected",
          livelihoodLedger: expect.arrayContaining([
            expect.objectContaining({ kind: "food-refund", amount: 1 }),
          ]),
        },
      ],
      buildings: [{ id: 1 }, { id: 2, foodStock: 2 }],
    });
    expect(snapshotWorld(world).householdFoodOrders ?? []).toEqual([]);
    expect(snapshotWorld(world).economy?.foodOrderEscrow ?? 0).toBe(0);
  });

  it("collects only cash actually paid and records the unpaid tax balance", () => {
    const snapshot = livelihoodCity({ cash: 1, foodReserveTicks: 3 });
    snapshot.buildings = [
      {
        id: 1,
        typeId: "tax-office",
        x: 2,
        y: 19,
        rotation: 0,
        footprint: { width: 2, height: 2 },
      },
      {
        id: 2,
        typeId: "house",
        x: 5,
        y: 16,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        level: 2,
        constructionStage: 4,
      },
    ];
    snapshot.roads = [
      ...Array.from({ length: 7 }, (_, x) => ({ x, y: 15 })),
      { x: 2, y: 16 },
      { x: 2, y: 17 },
      { x: 2, y: 18 },
    ];
    snapshot.households[0]!.houseId = 2;
    snapshot.economy!.treasury = 0;
    const world = hydrateWorld(snapshot);

    advanceTicks(world, 1);

    expect(snapshotWorld(world)).toMatchObject({
      households: [
        {
          houseId: 2,
          cash: 0,
          lastIncome: 0,
          wageArrears: 4,
          taxArrears: 1,
          livelihoodLedger: expect.arrayContaining([
            expect.objectContaining({ kind: "tax", amount: -1 }),
            expect.objectContaining({ kind: "tax-arrears", amount: 0 }),
          ]),
        },
      ],
      economy: {
        treasury: 1,
        lastTaxRevenue: 1,
        lastPayroll: 0,
      },
    });
  });

  it("runs the same autonomous city for twenty years deterministically", () => {
    const first = hydrateWorld(livelihoodCity({ marketFood: 4 }));
    const second = hydrateWorld(livelihoodCity({ marketFood: 4 }));

    advanceTicks(first, 240);
    advanceTicks(second, 240);

    const result = snapshotWorld(first);
    expect(snapshotWorld(second)).toEqual(result);
    expect(
      result.households.every((household) => (household.cash ?? 0) >= 0),
    ).toBe(true);
    expect(
      result.households.every(
        (household) => (household.livelihoodLedger?.length ?? 0) <= 12,
      ),
    ).toBe(true);
    expect(
      result.buildings.every(
        (building) =>
          !("foodStock" in building) || (building.foodStock ?? 0) >= 0,
      ),
    ).toBe(true);
    expect(
      new Set((result.householdFoodOrders ?? []).map((order) => order.houseId))
        .size,
    ).toBe((result.householdFoodOrders ?? []).length);
  });
});
