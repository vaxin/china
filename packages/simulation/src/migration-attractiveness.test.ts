import { describe, expect, it } from "vitest";

import { applyCommand, createWorld, migrationAttractiveness } from "./index";

describe("迁入吸引力已关闭", () => {
  it("无论民心与工资如何，始终允许迁入", () => {
    expect(migrationAttractiveness(0, "low")).toEqual({
      score: 50,
      wageModifier: 0,
      canMigrate: true,
    });
    expect(migrationAttractiveness(100, "high")).toEqual({
      score: 50,
      wageModifier: 0,
      canMigrate: true,
    });
  });

  it("有宅基地和道路时流民正常到达", () => {
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

    applyCommand(world, { seq: 3, type: "advance-time", ticks: 1 });
    expect(world.migrants).toEqual([
      { houseId: 1, x: 0, y: 15, state: "walking" },
    ]);
  });
});
