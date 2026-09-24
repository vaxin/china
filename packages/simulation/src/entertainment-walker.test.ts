import { describe, expect, it } from "vitest";
import type { WorldSnapshot } from "@empire/protocol";

import { applyCommand, hydrateWorld, snapshotWorld } from "./index";

function entertainmentCity(): WorldSnapshot {
  return {
    map: { width: 32, height: 32 },
    tick: 3,
    revision: 1,
    buildings: [
      {
        id: 1,
        typeId: "music-school",
        x: 1,
        y: 16,
        rotation: 0,
        footprint: { width: 2, height: 2 },
      },
      {
        id: 2,
        typeId: "market",
        x: 7,
        y: 16,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        foodStock: 0,
        foodStocks: { wheat: 0, soybean: 0, rice: 0, millet: 0, cabbage: 0 },
      },
      {
        id: 3,
        typeId: "house",
        x: 4,
        y: 13,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        level: 1,
        constructionStage: 4,
      },
      {
        id: 4,
        typeId: "house",
        x: 4,
        y: 20,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        level: 1,
        constructionStage: 4,
      },
    ],
    roads: Array.from({ length: 10 }, (_, x) => ({ x, y: 15 })),
    households: [
      { houseId: 3, residents: 5, foodReserveTicks: 3, foodQuality: "bland" },
      { houseId: 4, residents: 5, foodReserveTicks: 3, foodQuality: "bland" },
    ],
    migrants: [],
  };
}

describe("音乐行者沿真实道路提供娱乐覆盖", () => {
  it("学校每次只派一名乐师去市场，只有实际经过的住宅获得覆盖", () => {
    const world = hydrateWorld(entertainmentCity());
    applyCommand(world, { seq: 1, type: "advance-time", ticks: 1 });
    applyCommand(world, { seq: 2, type: "advance-activity", pulses: 3 });
    const snapshot = snapshotWorld(world);
    expect(
      snapshot.households.find((household) => household.houseId === 3),
    ).toMatchObject({ entertainmentReserveTicks: 3 });
    expect(
      snapshot.households.find((household) => household.houseId === 4)
        ?.entertainmentReserveTicks ?? 0,
    ).toBe(0);
    expect(snapshot.performers?.length ?? 0).toBeLessThanOrEqual(1);
  });

  it("道路中断后乐师消失，既有娱乐覆盖按月自然过期", () => {
    const world = hydrateWorld(entertainmentCity());
    applyCommand(world, { seq: 1, type: "advance-time", ticks: 1 });
    applyCommand(world, { seq: 2, type: "advance-activity", pulses: 3 });
    applyCommand(world, { seq: 3, type: "demolish", x: 5, y: 15 });
    applyCommand(world, { seq: 4, type: "advance-activity", pulses: 1 });
    applyCommand(world, { seq: 5, type: "advance-time", ticks: 3 });
    const snapshot = snapshotWorld(world);
    expect(snapshot.performers ?? []).toHaveLength(0);
    expect(
      snapshot.households.find((household) => household.houseId === 3)
        ?.entertainmentReserveTicks ?? 0,
    ).toBe(0);
  });
});
