import { describe, expect, it } from "vitest";

import {
  advanceTicks,
  applyCommand,
  createWorld,
  snapshotWorld,
} from "./index";

function preparedGranary() {
  const world = createWorld();
  for (const [index, cropType] of (["wheat", "rice"] as const).entries()) {
    applyCommand(world, {
      seq: index + 1,
      type: "build",
      buildingTypeId: "farm",
      cropType,
      x: 1 + index * 3,
      y: 11,
      rotation: 0,
    });
  }
  applyCommand(world, {
    seq: 3,
    type: "build",
    buildingTypeId: "granary",
    x: 1,
    y: 14,
    rotation: 0,
  });
  applyCommand(world, {
    seq: 4,
    type: "build-road-path",
    tiles: [
      { x: 1, y: 13 },
      { x: 2, y: 13 },
      { x: 3, y: 13 },
      { x: 4, y: 13 },
    ],
  });
  for (const farm of world.buildings.filter(
    (building) => building.typeId === "farm",
  )) {
    if (farm.typeId === "farm") farm.foodStock = 1;
  }
  return world;
}

describe("粮仓接收策略", () => {
  it("拒收水稻时只运输小麦，重新接收后下一 tick 自愈", () => {
    const world = preparedGranary();
    const granary = world.buildings.find(
      (building) => building.typeId === "granary",
    );
    if (!granary || granary.typeId !== "granary")
      throw new Error("测试粮仓不存在");

    applyCommand(world, {
      seq: 5,
      type: "set-granary-policy",
      granaryId: granary.id,
      cropType: "rice",
      accept: false,
    });
    advanceTicks(world, 2);
    expect(snapshotWorld(world).buildings).toMatchObject([
      { typeId: "farm", cropType: "wheat", foodStock: 0 },
      { typeId: "farm", cropType: "rice", foodStock: 1 },
      {
        typeId: "granary",
        foodStock: 1,
        foodStocks: { wheat: 1, rice: 0 },
        acceptedCrops: ["wheat", "soybean", "millet", "cabbage"],
      },
    ]);

    applyCommand(world, {
      seq: 6,
      type: "set-granary-policy",
      granaryId: granary.id,
      cropType: "rice",
      accept: true,
    });
    advanceTicks(world, 1);
    expect(snapshotWorld(world).buildings).toMatchObject([
      { typeId: "farm", cropType: "wheat", foodStock: 0 },
      { typeId: "farm", cropType: "rice", foodStock: 0 },
      {
        typeId: "granary",
        foodStock: 2,
        foodStocks: { wheat: 1, rice: 1 },
      },
    ]);
    expect(snapshotWorld(world).buildings[2]).not.toHaveProperty(
      "acceptedCrops",
    );
  });

  it("不存在的粮仓策略原子拒绝", () => {
    const world = preparedGranary();
    const before = snapshotWorld(world);
    expect(
      applyCommand(world, {
        seq: 9,
        type: "set-granary-policy",
        granaryId: 999,
        cropType: "wheat",
        accept: false,
      }).result,
    ).toMatchObject({ accepted: false, reasonCode: "not-found" });
    expect(snapshotWorld(world)).toEqual(before);
  });
});
