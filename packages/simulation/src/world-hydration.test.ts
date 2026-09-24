import { describe, expect, it } from "vitest";
import { DEFAULT_TERRAIN_CONTRACT, type WorldSnapshot } from "@empire/protocol";

import { applyCommand, hydrateWorld, snapshotWorld } from "./index";

describe("世界恢复", () => {
  it("从存档恢复后保持建筑，并从已有最大 ID 之后继续建造", () => {
    const savedWorld = {
      map: { width: 32, height: 32 },
      terrain: { ...DEFAULT_TERRAIN_CONTRACT },
      tick: 0,
      revision: 4,
      buildings: [
        {
          id: 5,
          typeId: "house",
          x: 10,
          y: 10,
          rotation: 1 as const,
          footprint: { width: 2 as const, height: 2 as const },
          level: 1 as const,
          constructionStage: 4 as const,
        },
      ],
      roads: [],
      walls: [],
      households: [],
      migrants: [],
    } satisfies WorldSnapshot;

    const world = hydrateWorld(savedWorld);

    expect(snapshotWorld(world)).toEqual(savedWorld);
    const application = applyCommand(world, {
      seq: 8,
      type: "build",
      buildingTypeId: "house",
      x: 20,
      y: 20,
      rotation: 0,
    });
    expect(application.result).toMatchObject({ accepted: true, revision: 5 });
    expect(
      application.snapshot.buildings.map((building) => building.id),
    ).toEqual([5, 6]);
  });

  it("最大安全实体 ID 耗尽后原子拒绝新建筑并保持可保存快照", () => {
    const savedWorld = {
      map: { width: 32, height: 32 },
      terrain: { ...DEFAULT_TERRAIN_CONTRACT },
      tick: 0,
      revision: 1,
      buildings: [
        {
          id: Number.MAX_SAFE_INTEGER,
          typeId: "house",
          x: 10,
          y: 10,
          rotation: 0 as const,
          footprint: { width: 2 as const, height: 2 as const },
          level: 1 as const,
          constructionStage: 4 as const,
        },
      ],
      roads: [],
      walls: [],
      households: [],
      migrants: [],
    } satisfies WorldSnapshot;
    const world = hydrateWorld(savedWorld);

    const application = applyCommand(world, {
      seq: 1,
      type: "build",
      buildingTypeId: "well",
      x: 5,
      y: 5,
      rotation: 0,
    });

    expect(application.result).toEqual({
      seq: 1,
      accepted: false,
      reasonCode: "counter-exhausted",
    });
    expect(application.snapshot).toEqual(savedWorld);
  });

  it("tick 或 revision 计数耗尽时拒绝命令且不产生非安全整数", () => {
    const tickExhausted = hydrateWorld({
      map: { width: 32, height: 32 },
      tick: Number.MAX_SAFE_INTEGER,
      revision: 0,
      buildings: [],
      roads: [],
      walls: [],
      households: [],
      migrants: [],
    });
    const tickBefore = snapshotWorld(tickExhausted);

    expect(
      applyCommand(tickExhausted, {
        seq: 2,
        type: "advance-time",
        ticks: 1,
      }).result,
    ).toEqual({
      seq: 2,
      accepted: false,
      reasonCode: "counter-exhausted",
    });
    expect(snapshotWorld(tickExhausted)).toEqual(tickBefore);

    const revisionExhausted = hydrateWorld({
      map: { width: 32, height: 32 },
      tick: 0,
      revision: Number.MAX_SAFE_INTEGER,
      buildings: [],
      roads: [],
      walls: [],
      households: [],
      migrants: [],
    });
    const revisionBefore = snapshotWorld(revisionExhausted);
    expect(
      applyCommand(revisionExhausted, {
        seq: 3,
        type: "build",
        buildingTypeId: "well",
        x: 5,
        y: 5,
        rotation: 0,
      }).result,
    ).toEqual({
      seq: 3,
      accepted: false,
      reasonCode: "counter-exhausted",
    });
    expect(snapshotWorld(revisionExhausted)).toEqual(revisionBefore);
  });

  it("临近 revision 上限且无物质变化时批量与逐 tick 仍等价", () => {
    const savedWorld: WorldSnapshot = {
      map: { width: 32, height: 32 },
      tick: 0,
      revision: Number.MAX_SAFE_INTEGER - 1,
      buildings: [],
      roads: [],
      walls: [],
      households: [],
      migrants: [],
    };
    const batched = hydrateWorld(savedWorld);
    const stepped = hydrateWorld(savedWorld);

    expect(
      applyCommand(batched, {
        seq: 4,
        type: "advance-time",
        ticks: 2,
      }).result,
    ).toMatchObject({ accepted: true });
    expect(
      applyCommand(stepped, {
        seq: 5,
        type: "advance-time",
        ticks: 1,
      }).result,
    ).toMatchObject({ accepted: true });
    expect(
      applyCommand(stepped, {
        seq: 6,
        type: "advance-time",
        ticks: 1,
      }).result,
    ).toMatchObject({ accepted: true });
    expect(snapshotWorld(batched)).toEqual(snapshotWorld(stepped));
  });
});
