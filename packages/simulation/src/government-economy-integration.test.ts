import { describe, expect, it } from "vitest";
import type { WorldSnapshot } from "@empire/protocol";

import { applyCommand, hydrateWorld, snapshotWorld } from "./index";

function citySnapshot(connected: boolean): WorldSnapshot {
  return {
    map: { width: 32, height: 32 },
    tick: 4,
    revision: 2,
    buildings: [
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
    ],
    roads: [
      ...Array.from({ length: 7 }, (_, x) => ({ x, y: 15 })),
      ...(connected
        ? [
            { x: 2, y: 16 },
            { x: 2, y: 17 },
            { x: 2, y: 18 },
          ]
        : []),
    ],
    households: [
      {
        houseId: 2,
        residents: 10,
        foodReserveTicks: 3,
        foodQuality: "plain",
      },
    ],
    migrants: [],
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

describe("税务署道路覆盖与国库集成", () => {
  it("重税命令保存后，连路税务署按月征税并扣除工资", () => {
    const world = hydrateWorld(citySnapshot(true));
    const policy = applyCommand(world, {
      seq: 1,
      type: "set-tax-rate",
      taxRate: "high",
    });
    expect(policy.result.accepted).toBe(true);

    const tick = applyCommand(world, {
      seq: 2,
      type: "advance-time",
      ticks: 1,
    });
    expect(tick.result.accepted).toBe(true);
    expect(snapshotWorld(world).economy).toEqual({
      treasury: 499,
      taxRate: "high",
      lastTaxRevenue: 3,
      lastPayroll: 4,
      taxableHouses: 1,
      sentiment: 50,
      lastTradeRevenue: 0,
    });
  });

  it("断路时不征幽灵税，但已分配官吏工资仍真实支出", () => {
    const world = hydrateWorld(citySnapshot(false));
    applyCommand(world, { seq: 1, type: "advance-time", ticks: 1 });
    expect(snapshotWorld(world).economy).toMatchObject({
      treasury: 496,
      lastTaxRevenue: 0,
      lastPayroll: 4,
      taxableHouses: 0,
    });
  });

  it("税率、累计国库和上月收支可随快照恢复", () => {
    const world = hydrateWorld(citySnapshot(true));
    applyCommand(world, { seq: 1, type: "advance-time", ticks: 1 });
    const restored = hydrateWorld(snapshotWorld(world));
    expect(snapshotWorld(restored).economy).toEqual(
      snapshotWorld(world).economy,
    );
  });
});
