import { describe, expect, it } from "vitest";
import type { WorldSnapshot } from "@empire/protocol";

import {
  advanceTicks,
  applyCommand,
  hydrateWorld,
  snapshotWorld,
} from "./index";
import type { createWorld } from "./index";

function workingCity() {
  const snapshot = patrollingCity();
  snapshot.buildings.push({
    id: 2,
    typeId: "well",
    x: 6,
    y: 14,
    rotation: 0,
    footprint: { width: 1, height: 1 },
  });
  const citizen = snapshot.citizens?.[0];
  if (!citizen) throw new Error("missing citizen fixture");
  citizen.workplaceId = 2;
  citizen.state = "commuting";
  return hydrateWorld(snapshot);
}

function pulse(world: ReturnType<typeof createWorld>, pulses = 1) {
  return applyCommand(world, {
    seq: 100 + world.revision,
    type: "advance-activity",
    pulses,
  });
}

function patrollingCity(): WorldSnapshot {
  return {
    map: { width: 32, height: 32 },
    tick: 6,
    revision: 4,
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
    ],
    roads: Array.from({ length: 7 }, (_, x) => ({ x, y: 15 })),
    households: [
      {
        houseId: 1,
        residents: 5,
        foodReserveTicks: 3,
        foodQuality: "bland",
      },
    ],
    migrants: [],
    citizens: [
      {
        id: 1,
        houseId: 1,
        workplaceId: null,
        x: 1,
        y: 15,
        state: "strolling",
        dwellTicks: 0,
      },
    ],
  };
}

describe("independent person activity clock", () => {
  it("moves citizens without advancing the monthly world tick", () => {
    const world = workingCity();
    const tickBefore = world.tick;

    const result = pulse(world, 2);

    expect(result.result.accepted).toBe(true);
    expect(world.tick).toBe(tickBefore);
    expect(snapshotWorld(world).citizens).toMatchObject([
      { x: 3, y: 15, state: "commuting" },
    ]);
  });

  it("does not move or count down citizens during a monthly tick", () => {
    const world = workingCity();
    const citizenBefore = { ...world.citizens[0] };

    advanceTicks(world, 1);

    expect(world.citizens[0]).toEqual(citizenBefore);
  });

  it("keeps an unassigned resident patrolling out and back on real roads", () => {
    const world = hydrateWorld(patrollingCity());

    pulse(world, 3);
    expect(world.citizens[0]).toMatchObject({
      x: 4,
      y: 15,
      state: "strolling",
    });

    pulse(world, 2);
    expect(world.citizens[0]).toMatchObject({
      x: 2,
      y: 15,
      state: "strolling",
      dwellTicks: 0,
    });

    pulse(world, 1);
    expect(world.citizens[0]).toMatchObject({ x: 3, y: 15 });
  });

  it("counts down sustained work only on activity pulses", () => {
    const world = workingCity();
    pulse(world, 5);
    expect(world.citizens[0]).toMatchObject({
      state: "working",
      dwellTicks: 6,
    });

    advanceTicks(world, 1);
    expect(world.citizens[0]).toMatchObject({
      state: "working",
      dwellTicks: 6,
    });

    pulse(world, 1);
    expect(world.citizens[0]).toMatchObject({
      state: "working",
      dwellTicks: 5,
    });
  });

  it("moves a migrant while the construction month remains unchanged", () => {
    const snapshot = patrollingCity();
    snapshot.households = [];
    snapshot.citizens = [];
    const house = snapshot.buildings[0];
    if (!house || house.typeId !== "house") throw new Error("missing house");
    house.constructionStage = 0;
    house.x = 4;
    snapshot.migrants = [{ houseId: 1, x: 0, y: 15, state: "walking" }];
    const world = hydrateWorld(snapshot);

    pulse(world, 2);

    expect(world.tick).toBe(6);
    expect(world.migrants).toMatchObject([
      { houseId: 1, x: 2, y: 15, state: "walking" },
    ]);
    expect(world.buildings[0]).toMatchObject({ constructionStage: 0 });
  });
});
