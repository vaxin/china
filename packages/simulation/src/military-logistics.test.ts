import { describe, expect, it } from "vitest";

import {
  advanceTicks,
  applyCommand,
  createWorld,
  deployedSoldiers,
  snapshotWorld,
} from "./index";

function preparedDefense() {
  const world = createWorld();
  applyCommand(world, {
    seq: 1,
    type: "build",
    buildingTypeId: "weaponsmith",
    x: 1,
    y: 11,
    rotation: 0,
  });
  applyCommand(world, {
    seq: 2,
    type: "build",
    buildingTypeId: "infantry-fort",
    x: 1,
    y: 14,
    rotation: 0,
  });
  applyCommand(world, {
    seq: 3,
    type: "build-road-path",
    tiles: [
      { x: 0, y: 12 },
      { x: 0, y: 13 },
      { x: 0, y: 14 },
      { x: 0, y: 15 },
    ],
  });
  return world;
}

describe("武器与城门守军", () => {
  it("兵器作坊每三 tick 产一件武器并逐件训练步兵", () => {
    const world = preparedDefense();
    advanceTicks(world, 2);
    expect(snapshotWorld(world).buildings).toMatchObject([
      { typeId: "weaponsmith", weaponStock: 0 },
      { typeId: "infantry-fort", weaponStock: 0, soldiers: 0 },
    ]);

    advanceTicks(world, 1);
    expect(snapshotWorld(world).buildings).toMatchObject([
      { typeId: "weaponsmith", weaponStock: 0 },
      { typeId: "infantry-fort", weaponStock: 0, soldiers: 1 },
    ]);
    expect(deployedSoldiers(world)).toBe(1);
  });

  it("军营满四人后武器留在作坊而不溢出", () => {
    const world = preparedDefense();
    advanceTicks(world, 15);

    expect(snapshotWorld(world).buildings).toMatchObject([
      { typeId: "weaponsmith", weaponStock: 1 },
      { typeId: "infantry-fort", weaponStock: 0, soldiers: 4 },
    ]);
  });

  it("切断城门路只取消部署，士兵不消失，补路立即恢复", () => {
    const world = preparedDefense();
    advanceTicks(world, 3);
    applyCommand(world, { seq: 20, type: "demolish", x: 0, y: 15 });
    expect(deployedSoldiers(world)).toBe(0);
    expect(snapshotWorld(world).buildings).toMatchObject([
      { typeId: "weaponsmith" },
      { typeId: "infantry-fort", soldiers: 1 },
    ]);

    applyCommand(world, {
      seq: 21,
      type: "build-road-path",
      tiles: [{ x: 0, y: 15 }],
    });
    expect(deployedSoldiers(world)).toBe(1);
  });
});
