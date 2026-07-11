import { describe, expect, it } from "vitest";

import { worldSnapshotSchema } from "./index";

function currentWorld() {
  return {
    map: { width: 32, height: 32 },
    tick: 7,
    revision: 7,
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
      {
        id: 2,
        typeId: "well",
        x: 4,
        y: 14,
        rotation: 0,
        footprint: { width: 1, height: 1 },
      },
    ],
    roads: [
      { x: 0, y: 15 },
      { x: 1, y: 15 },
      { x: 2, y: 15 },
      { x: 3, y: 15 },
      { x: 4, y: 15 },
    ],
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
        workplaceId: 2,
        x: 2,
        y: 15,
        state: "commuting",
        dwellTicks: 0,
      },
    ],
  };
}

describe("市民快照契约", () => {
  it("接受绑定真实住户和岗位且位于道路上的市民", () => {
    expect(worldSnapshotSchema.parse(currentWorld())).toMatchObject({
      citizens: [{ id: 1, houseId: 1, workplaceId: 2 }],
    });
  });

  it("接受二级住宅到远端水井的通勤快照", () => {
    const world = currentWorld();
    (world.buildings[0] as { level: number }).level = 2;
    world.buildings[1]!.x = 6;
    world.roads = Array.from({ length: 7 }, (_, x) => ({ x, y: 15 }));
    world.households[0] = { ...world.households[0]!, residents: 10 };

    expect(worldSnapshotSchema.safeParse(world)).toMatchObject({
      success: true,
    });
  });

  it.each([
    ["孤儿住宅", { houseId: 9 }],
    ["孤儿岗位", { workplaceId: 9 }],
    ["离开道路", { x: 8, y: 8 }],
  ])("拒绝%s", (_name, change) => {
    const world = currentWorld();
    world.citizens[0] = { ...world.citizens[0]!, ...change };

    expect(() => worldSnapshotSchema.parse(world)).toThrow();
  });

  it("旧快照缺少 citizens 时仍可安全解析", () => {
    const world = currentWorld();
    const legacy: Partial<typeof world> = { ...world };
    delete legacy.citizens;

    expect(worldSnapshotSchema.parse(legacy)).toMatchObject({
      households: [{ houseId: 1 }],
    });
  });
});
