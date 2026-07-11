import { describe, expect, it } from "vitest";

import { advanceTicks, createWorld, snapshotWorld } from "./index";

describe("年代跨年持久化", () => {
  it("即使城市空闲，第 12 tick 跨年也产生一次可保存 revision", () => {
    const world = createWorld();
    advanceTicks(world, 11);
    expect(snapshotWorld(world)).toMatchObject({ tick: 11, revision: 0 });
    advanceTicks(world, 1);
    expect(snapshotWorld(world)).toMatchObject({ tick: 12, revision: 1 });
  });
});
