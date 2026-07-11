import { describe, expect, it } from "vitest";
import type { WorldSnapshot } from "@empire/protocol";

import { applyCommand, hydrateWorld, snapshotWorld } from "./index";

function tradeCity(tradeOpen: boolean, connected = true): WorldSnapshot {
  return {
    map: { width: 32, height: 32 },
    tick: 2,
    revision: 1,
    buildings: [
      {
        id: 1,
        typeId: "market",
        x: 1,
        y: 16,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        foodStock: 0,
        foodStocks: { wheat: 0, soybean: 0, rice: 0, millet: 0, cabbage: 0 },
        clothingStock: 1,
      },
      {
        id: 2,
        typeId: "trading-post",
        x: 6,
        y: 16,
        rotation: 0,
        footprint: { width: 3, height: 3 },
        clothingStock: 0,
      },
      {
        id: 3,
        typeId: "house",
        x: 10,
        y: 13,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        level: 1,
        constructionStage: 4,
      },
    ],
    roads: connected
      ? Array.from({ length: 13 }, (_, x) => ({ x, y: 15 }))
      : Array.from({ length: 4 }, (_, x) => ({ x, y: 15 })),
    households: [
      {
        houseId: 3,
        residents: 5,
        foodReserveTicks: 3,
        foodQuality: "bland",
        clothingReserveTicks: 3,
      },
    ],
    migrants: [],
    diplomacy: { relation: tradeOpen ? 50 : 25, tradeOpen, envoys: [] },
    economy: {
      treasury: 500,
      taxRate: "standard",
      lastTaxRevenue: 0,
      lastPayroll: 0,
      taxableHouses: 0,
      sentiment: 50,
      lastTradeRevenue: 0,
    },
  };
}

describe("贸易站出口闭环", () => {
  it("通商、连路、有货且有商业劳力时，每个商队周期出口并增加国库", () => {
    const world = hydrateWorld(tradeCity(true));
    applyCommand(world, { seq: 1, type: "advance-time", ticks: 1 });
    const snapshot = snapshotWorld(world);
    expect(snapshot.economy?.lastTradeRevenue).toBe(12);
    expect(snapshot.economy?.treasury).toBe(508);
    expect(
      snapshot.buildings.find((building) => building.typeId === "market"),
    ).toMatchObject({ clothingStock: 0 });
  });

  it.each([
    ["尚未通商", false, true],
    ["道路断开", true, false],
  ])("%s 时不会搬货或凭空赚钱", (_label, tradeOpen, connected) => {
    const world = hydrateWorld(tradeCity(tradeOpen, connected));
    applyCommand(world, { seq: 1, type: "advance-time", ticks: 1 });
    const snapshot = snapshotWorld(world);
    expect(snapshot.economy?.lastTradeRevenue ?? 0).toBe(0);
    expect(
      snapshot.buildings.find((building) => building.typeId === "market"),
    ).toMatchObject({ clothingStock: 1 });
  });
});
