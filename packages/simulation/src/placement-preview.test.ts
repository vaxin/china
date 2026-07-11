import { describe, expect, it } from "vitest";

import {
  applyCommand,
  createWorld,
  evaluateHousePlacement,
  snapshotWorld,
} from "./index";

describe("住宅预览判定", () => {
  it("空地、重叠地和越界地返回与权威建造一致的状态", () => {
    const world = createWorld();
    applyCommand(world, {
      seq: 1,
      type: "build",
      buildingTypeId: "house",
      x: 10,
      y: 10,
      rotation: 0,
    });
    const snapshot = snapshotWorld(world);

    expect(evaluateHousePlacement(snapshot, 20, 20)).toBe("valid");
    expect(evaluateHousePlacement(snapshot, 11, 11)).toBe("occupied");
    expect(evaluateHousePlacement(snapshot, 31, 31)).toBe("out-of-bounds");
    expect(evaluateHousePlacement(snapshot, -1, 0)).toBe("out-of-bounds");
  });
});
