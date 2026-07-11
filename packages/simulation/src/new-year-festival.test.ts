import { describe, expect, it } from "vitest";

import { applyCommand, createWorld, snapshotWorld } from "./index";

function festivalCity() {
  const world = createWorld();
  world.tick = 13;
  world.economy.treasury = 50;
  world.buildings.push(
    {
      id: 1,
      typeId: "music-school",
      x: 1,
      y: 1,
      rotation: 0,
      footprint: { width: 2, height: 2 },
    },
    {
      id: 2,
      typeId: "granary",
      x: 4,
      y: 1,
      rotation: 0,
      footprint: { width: 2, height: 2 },
      foodStock: 1,
      foodStocks: { wheat: 0, soybean: 0, rice: 0, millet: 1, cabbage: 0 },
    },
  );
  return world;
}

describe("二月新年祭", () => {
  it("真实扣一份粮和 20 国库，提升 10 民心并记录年份", () => {
    const world = festivalCity();
    const result = applyCommand(world, {
      seq: 1,
      type: "hold-new-year-festival",
    });
    expect(result.result.accepted).toBe(true);
    const snapshot = snapshotWorld(world);
    expect(snapshot.economy).toMatchObject({
      treasury: 30,
      sentiment: 60,
      lastFestivalYear: 2,
    });
    expect(
      snapshot.buildings.find((building) => building.typeId === "granary"),
    ).toMatchObject({ foodStock: 0 });
  });

  it("同一年不能重复举办获取收益", () => {
    const world = festivalCity();
    applyCommand(world, { seq: 1, type: "hold-new-year-festival" });
    const before = snapshotWorld(world);
    const second = applyCommand(world, {
      seq: 2,
      type: "hold-new-year-festival",
    });
    expect(second.result).toMatchObject({
      accepted: false,
      reasonCode: "requirements-not-met",
    });
    expect(snapshotWorld(world)).toEqual(before);
  });

  it.each([
    ["非二月", (world: ReturnType<typeof festivalCity>) => (world.tick = 14)],
    [
      "没有娱乐设施",
      (world: ReturnType<typeof festivalCity>) =>
        (world.buildings = world.buildings.filter(
          (building) => building.typeId !== "music-school",
        )),
    ],
    [
      "没有粮食",
      (world: ReturnType<typeof festivalCity>) => {
        const granary = world.buildings.find(
          (building) => building.typeId === "granary",
        );
        if (granary?.typeId === "granary") {
          granary.foodStock = 0;
          granary.foodStocks.millet = 0;
        }
      },
    ],
  ])("%s 时原子拒绝", (_label, mutate) => {
    const world = festivalCity();
    mutate(world);
    const before = snapshotWorld(world);
    const result = applyCommand(world, {
      seq: 1,
      type: "hold-new-year-festival",
    });
    expect(result.result.accepted).toBe(false);
    expect(snapshotWorld(world)).toEqual(before);
  });

  it("国库不足有独立拒绝原因", () => {
    const world = festivalCity();
    world.economy.treasury = 19;
    const result = applyCommand(world, {
      seq: 1,
      type: "hold-new-year-festival",
    });
    expect(result.result).toMatchObject({
      accepted: false,
      reasonCode: "insufficient-funds",
    });
  });
});
