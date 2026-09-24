import { describe, expect, it } from "vitest";

import {
  advanceTicks,
  applyCommand,
  createWorld,
  snapshotWorld,
} from "./index";

function buildHomeAndWell() {
  const world = createWorld();
  applyCommand(world, {
    seq: 1,
    type: "build",
    buildingTypeId: "house",
    x: 1,
    y: 13,
    rotation: 0,
  });
  applyCommand(world, {
    seq: 2,
    type: "build-road-path",
    tiles: Array.from({ length: 7 }, (_, x) => ({ x, y: 15 })),
  });
  applyCommand(world, {
    seq: 3,
    type: "build",
    buildingTypeId: "well",
    x: 6,
    y: 14,
    rotation: 0,
  });
  return world;
}

function advanceActivity(world: ReturnType<typeof createWorld>, pulses = 1) {
  applyCommand(world, {
    seq: 1_000 + world.revision,
    type: "advance-activity",
    pulses,
  });
}

function completeHome(world: ReturnType<typeof createWorld>) {
  advanceTicks(world, 1);
  advanceActivity(world, 2);
  advanceTicks(world, 3);
}

describe("citizen life and work", () => {
  it("spawns a citizen on the road after house completes", () => {
    const world = buildHomeAndWell();

    completeHome(world);

    expect(snapshotWorld(world)).toMatchObject({
      households: [{ houseId: 1, residents: 5 }],
      citizens: [
        {
          id: 1,
          houseId: 1,
          workplaceId: 2,
          x: 1,
          y: 15,
          state: "commuting",
          dwellTicks: 0,
        },
      ],
    });
  });

  it("citizen walks to work, works inside the building, then walks home and enters house", () => {
    const world = buildHomeAndWell();
    completeHome(world);

    advanceActivity(world, 4);
    expect(snapshotWorld(world)).toMatchObject({
      citizens: [{ x: 5, y: 15, state: "commuting" }],
    });

    advanceActivity(world, 1);
    expect(snapshotWorld(world)).toMatchObject({
      citizens: [{ x: 6, y: 14, state: "working", dwellTicks: 6 }],
    });

    advanceActivity(world, 7);
    expect(snapshotWorld(world)).toMatchObject({
      citizens: [{ x: 5, y: 15, state: "returning" }],
    });
  });

  it("broken road sends citizen home instead of walking through empty land", () => {
    const world = buildHomeAndWell();
    completeHome(world);
    advanceActivity(world, 2);
    expect(snapshotWorld(world)).toMatchObject({
      citizens: [{ x: 3, y: 15, state: "commuting" }],
    });

    applyCommand(world, { seq: 4, type: "demolish", x: 4, y: 15 });
    advanceActivity(world, 1);
    expect(snapshotWorld(world)).toMatchObject({
      citizens: [{ x: 1, y: 13, state: "resting" }],
    });

    applyCommand(world, {
      seq: 5,
      type: "build-road-path",
      tiles: [{ x: 4, y: 15 }],
    });
    advanceActivity(world, 10);
    expect(snapshotWorld(world)).toMatchObject({
      citizens: [{ state: "working", x: 6, y: 14 }],
    });
  });

  it("demolishing workplace reassigns citizen to idle, demolishing house cleans up citizen", () => {
    const world = buildHomeAndWell();
    completeHome(world);

    applyCommand(world, { seq: 4, type: "demolish", x: 6, y: 14 });
    advanceActivity(world, 1);
    expect(snapshotWorld(world)).toMatchObject({
      citizens: [{ workplaceId: null, state: "resting" }],
    });

    applyCommand(world, { seq: 5, type: "demolish", x: 1, y: 13 });
    expect(snapshotWorld(world).citizens ?? []).toEqual([]);
  });
});
