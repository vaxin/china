import { describe, expect, it } from "vitest";

import { worldSnapshotSchema } from "./index";

function livelihoodWorld() {
  return {
    map: { width: 32, height: 32 },
    tick: 4,
    revision: 9,
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
        foodStock: 1,
        foodStocks: {
          wheat: 1,
          soybean: 0,
          rice: 0,
          millet: 0,
          cabbage: 0,
        },
      },
    ],
    roads: [
      { x: 0, y: 15 },
      { x: 1, y: 15 },
      { x: 2, y: 15 },
      { x: 3, y: 15 },
      { x: 4, y: 15 },
    ],
    households: [
      {
        houseId: 1,
        residents: 5,
        foodReserveTicks: 1,
        foodQuality: "bland",
      },
    ],
    migrants: [],
  };
}

describe("household livelihood protocol", () => {
  it("upgrades a legacy current household with livelihood defaults", () => {
    const parsed = worldSnapshotSchema.parse(livelihoodWorld());

    expect(parsed.households[0]).toMatchObject({
      cash: 12,
      employedWorkers: 0,
      lastIncome: 0,
      lastFoodExpense: 0,
      wageArrears: 0,
      taxArrears: 0,
      foodShortageReason: "none",
      livelihoodLedger: [],
    });
    expect(parsed.householdFoodOrders ?? []).toEqual([]);
  });

  it("accepts a valid pending food order and auditable ledger", () => {
    const value = livelihoodWorld();
    value.households[0] = {
      ...value.households[0],
      cash: 11,
      employedWorkers: 2,
      lastIncome: 4,
      lastFoodExpense: 1,
      wageArrears: 0,
      taxArrears: 0,
      foodShortageReason: "delivery-pending",
      livelihoodLedger: [
        {
          id: "4:food-order:0",
          tick: 4,
          kind: "food-order",
          amount: -1,
          balanceAfter: 11,
        },
      ],
    } as (typeof value.households)[number];
    const withOrder = {
      ...value,
      economy: {
        treasury: 500,
        taxRate: "standard" as const,
        lastTaxRevenue: 0,
        lastPayroll: 0,
        taxableHouses: 0,
        sentiment: 50,
        lastTradeRevenue: 0,
        foodOrderEscrow: 1,
      },
      householdFoodOrders: [
        {
          houseId: 1,
          marketId: 2,
          cropType: "wheat",
          foodQuality: "bland",
          price: 1,
          placedAtTick: 4,
          arrivesAtTick: 5,
        },
      ],
    };

    expect(worldSnapshotSchema.parse(withOrder)).toMatchObject(withOrder);
  });

  function validOrderWorld() {
    const legacy = livelihoodWorld();
    return {
      ...legacy,
      economy: {
        treasury: 500,
        taxRate: "standard" as const,
        lastTaxRevenue: 0,
        lastPayroll: 0,
        taxableHouses: 0,
        sentiment: 50,
        lastTradeRevenue: 0,
        foodOrderEscrow: 1,
      },
      households: legacy.households.map((household) => ({
        ...household,
        cash: 11,
        employedWorkers: 0,
        lastIncome: 0,
        lastFoodExpense: 1,
        wageArrears: 0,
        taxArrears: 0,
        foodShortageReason: "delivery-pending",
        livelihoodLedger: [],
      })),
      householdFoodOrders: [
        {
          houseId: 1,
          marketId: 2,
          cropType: "wheat",
          foodQuality: "bland",
          price: 1,
          placedAtTick: 4,
          arrivesAtTick: 5,
        },
      ],
    };
  }

  it("rejects negative household cash", () => {
    const world = validOrderWorld();
    world.households[0]!.cash = -1;

    expect(() => worldSnapshotSchema.parse(world)).toThrow();
  });

  it("rejects negative arrears and a ledger beyond the twelve-entry bound", () => {
    const world = validOrderWorld();
    const negativeArrears = {
      ...world,
      households: world.households.map((household) => ({
        ...household,
        taxArrears: -1,
      })),
    };
    const oversizedLedger = {
      ...world,
      households: world.households.map((household) => ({
        ...household,
        livelihoodLedger: Array.from({ length: 13 }, (_, index) => ({
          id: `${index}:wage:0`,
          tick: index,
          kind: "wage" as const,
          amount: 1,
          balanceAfter: index + 1,
        })),
      })),
    };

    expect(() => worldSnapshotSchema.parse(negativeArrears)).toThrow();
    expect(() => worldSnapshotSchema.parse(oversizedLedger)).toThrow();
  });

  it("rejects an order for an unknown market", () => {
    const world = validOrderWorld();
    world.householdFoodOrders[0]!.marketId = 99;

    expect(() => worldSnapshotSchema.parse(world)).toThrow();
  });

  it("rejects escrow that does not equal all pending order payments", () => {
    const world = validOrderWorld();
    world.economy.foodOrderEscrow = 0;

    expect(() => worldSnapshotSchema.parse(world)).toThrow();
  });

  it("rejects duplicate pending orders for one household", () => {
    const world = validOrderWorld();
    world.householdFoodOrders.push({ ...world.householdFoodOrders[0]! });

    expect(() => worldSnapshotSchema.parse(world)).toThrow();
  });
});
