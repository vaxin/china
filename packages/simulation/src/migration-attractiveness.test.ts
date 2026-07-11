import { describe, expect, it } from "vitest";

import { applyCommand, createWorld, migrationAttractiveness } from "./index";

describe("工资与民心共同决定流民迁入", () => {
  it("三档工资提供明确吸引力修正并使用统一门槛", () => {
    expect(migrationAttractiveness(50, "low")).toEqual({
      score: 30,
      wageModifier: -20,
      canMigrate: false,
    });
    expect(migrationAttractiveness(40, "standard").canMigrate).toBe(true);
    expect(migrationAttractiveness(20, "high")).toEqual({
      score: 40,
      wageModifier: 20,
      canMigrate: true,
    });
  });

  it("低民心常薪时宅基地无人来，提高工资后才从城门出现", () => {
    const world = createWorld();
    applyCommand(world, {
      seq: 1,
      type: "build",
      buildingTypeId: "house",
      x: 1,
      y: 14,
      rotation: 0,
    });
    applyCommand(world, {
      seq: 2,
      type: "build-road-path",
      tiles: [{ x: 0, y: 15 }],
    });
    world.economy.sentiment = 35;

    applyCommand(world, { seq: 3, type: "advance-time", ticks: 1 });
    expect(world.migrants).toHaveLength(0);

    applyCommand(world, {
      seq: 4,
      type: "set-labor-policy",
      wageLevel: "high",
      priorities: ["agriculture", "commerce", "services"],
    });
    applyCommand(world, { seq: 5, type: "advance-time", ticks: 1 });
    expect(world.migrants).toEqual([
      { houseId: 1, x: 0, y: 15, state: "walking" },
    ]);
  });
});
