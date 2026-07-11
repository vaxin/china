import type { CropType } from "@empire/protocol";
import { describe, expect, it } from "vitest";

import {
  advanceTicks,
  applyCommand,
  createWorld,
  snapshotWorld,
} from "./index";

type World = ReturnType<typeof createWorld>;

function buildFarm(world: World, cropType: CropType, x: number, y: number) {
  return applyCommand(world, {
    seq: world.revision + 1,
    type: "build",
    buildingTypeId: "farm",
    cropType,
    x,
    y,
    rotation: 0,
  });
}

function farmStocks(world: World) {
  return snapshotWorld(world)
    .buildings.filter((building) => building.typeId === "farm")
    .map((farm) => [farm.cropType, farm.foodStock]);
}

describe("多作物农场生产", () => {
  it("建造时把所选作物写入权威状态", () => {
    const world = createWorld();

    expect(buildFarm(world, "rice", 5, 5).result).toMatchObject({
      accepted: true,
    });
    expect(snapshotWorld(world).buildings[0]).toMatchObject({
      typeId: "farm",
      cropType: "rice",
      foodStock: 0,
    });
  });

  it("小麦、大豆、水稻、粟、白菜在同一年按各自收获月依次入库", () => {
    const world = createWorld();
    const farms: Array<[CropType, number, number]> = [
      ["wheat", 5, 5],
      ["soybean", 8, 5],
      ["rice", 11, 5],
      ["millet", 14, 5],
      ["cabbage", 17, 5],
    ];
    for (const [crop, x, y] of farms) buildFarm(world, crop, x, y);

    advanceTicks(world, 6);
    expect(farmStocks(world)).toEqual([
      ["wheat", 1],
      ["soybean", 0],
      ["rice", 0],
      ["millet", 0],
      ["cabbage", 0],
    ]);
    advanceTicks(world, 2);
    expect(farmStocks(world)).toEqual([
      ["wheat", 1],
      ["soybean", 1],
      ["rice", 0],
      ["millet", 0],
      ["cabbage", 0],
    ]);
    advanceTicks(world, 1);
    expect(farmStocks(world)[2]).toEqual(["rice", 1]);
    advanceTicks(world, 1);
    expect(farmStocks(world)[3]).toEqual(["millet", 1]);
    advanceTicks(world, 1);
    expect(farmStocks(world)[4]).toEqual(["cabbage", 1]);
  });

  it("每年只收获一次且满仓后不会溢出", () => {
    const world = createWorld();
    buildFarm(world, "wheat", 5, 5);

    advanceTicks(world, 48);

    expect(farmStocks(world)).toEqual([["wheat", 3]]);
  });
});
