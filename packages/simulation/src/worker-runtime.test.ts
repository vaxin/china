import { describe, expect, it } from "vitest";
import { DEFAULT_TERRAIN_CONTRACT } from "@empire/protocol";

import { createSimulationRuntime } from "./index";

describe("Worker 模拟运行时", () => {
  it("初始化后返回空世界，建造命令返回确认结果与最新快照", () => {
    const runtime = createSimulationRuntime();

    expect(runtime.handle({ type: "initialize" })).toEqual({
      type: "ready",
      snapshot: {
        map: { width: 32, height: 32 },
        terrain: { ...DEFAULT_TERRAIN_CONTRACT },
        tick: 0,
        revision: 0,
        buildings: [],
        roads: [],
        walls: [],
        households: [],
        migrants: [],
      },
    });

    expect(
      runtime.handle({
        type: "command",
        command: {
          seq: 1,
          type: "build",
          buildingTypeId: "house",
          x: 10,
          y: 10,
          rotation: 0,
        },
      }),
    ).toMatchObject({
      type: "command-result",
      result: { seq: 1, accepted: true, revision: 1 },
      snapshot: { revision: 1, buildings: [{ id: 1, x: 10, y: 10 }] },
    });
  });

  it("拒绝非法 Worker 消息且不污染权威世界", () => {
    const runtime = createSimulationRuntime();

    expect(
      runtime.handle({
        type: "command",
        command: {
          seq: 23,
          type: "build",
          buildingTypeId: "house",
          x: Number.NaN,
          y: 10,
          rotation: 0,
        },
      }),
    ).toEqual({
      type: "protocol-error",
      reasonCode: "invalid-request",
      seq: 23,
    });

    expect(runtime.handle({ type: "initialize" })).toMatchObject({
      type: "ready",
      snapshot: { revision: 0, buildings: [] },
    });
  });

  it("按消息顺序铺路、建房并推进到入住快照", () => {
    const runtime = createSimulationRuntime();
    runtime.handle({ type: "initialize" });

    expect(
      runtime.handle({
        type: "command",
        command: {
          seq: 1,
          type: "build",
          buildingTypeId: "house",
          x: 1,
          y: 14,
          rotation: 0,
        },
      }),
    ).toMatchObject({ result: { accepted: true, revision: 1 } });
    expect(
      runtime.handle({
        type: "command",
        command: {
          seq: 2,
          type: "build-road-path",
          tiles: [{ x: 0, y: 15 }],
        },
      }),
    ).toMatchObject({ result: { accepted: true, revision: 2 } });

    runtime.handle({
      type: "command",
      command: { seq: 3, type: "advance-time", ticks: 1 },
    });
    runtime.handle({
      type: "command",
      command: { seq: 4, type: "advance-activity", pulses: 1 },
    });
    expect(
      runtime.handle({
        type: "command",
        command: { seq: 5, type: "advance-time", ticks: 3 },
      }),
    ).toMatchObject({
      result: { accepted: true, revision: 7 },
      snapshot: {
        tick: 4,
        roads: [{ x: 0, y: 15 }],
        households: [{ houseId: 1, residents: 5 }],
      },
    });
  });

  it("Worker 拆断道路时返回人口已迁出的同一权威快照", () => {
    const runtime = createSimulationRuntime();
    runtime.handle({ type: "initialize" });
    runtime.handle({
      type: "command",
      command: {
        seq: 1,
        type: "build",
        buildingTypeId: "house",
        x: 1,
        y: 14,
        rotation: 0,
      },
    });
    runtime.handle({
      type: "command",
      command: {
        seq: 2,
        type: "build-road-path",
        tiles: [{ x: 0, y: 15 }],
      },
    });
    runtime.handle({
      type: "command",
      command: { seq: 3, type: "advance-time", ticks: 1 },
    });
    runtime.handle({
      type: "command",
      command: { seq: 4, type: "advance-activity", pulses: 1 },
    });
    runtime.handle({
      type: "command",
      command: { seq: 5, type: "advance-time", ticks: 3 },
    });

    expect(
      runtime.handle({
        type: "command",
        command: { seq: 6, type: "demolish", x: 0, y: 15 },
      }),
    ).toMatchObject({
      result: { accepted: true, revision: 8 },
      snapshot: { roads: [], households: [], buildings: [{ id: 1 }] },
    });
  });

  it("经 Worker 完成建井、升级与拆井降级的权威闭环", () => {
    const runtime = createSimulationRuntime();
    runtime.handle({ type: "initialize" });
    runtime.handle({
      type: "command",
      command: {
        seq: 1,
        type: "build",
        buildingTypeId: "house",
        x: 1,
        y: 14,
        rotation: 0,
      },
    });
    runtime.handle({
      type: "command",
      command: {
        seq: 2,
        type: "build-road-path",
        tiles: [{ x: 0, y: 15 }],
      },
    });
    runtime.handle({
      type: "command",
      command: {
        seq: 3,
        type: "build",
        buildingTypeId: "well",
        x: 0,
        y: 14,
        rotation: 0,
      },
    });

    runtime.handle({
      type: "command",
      command: { seq: 4, type: "advance-time", ticks: 1 },
    });
    runtime.handle({
      type: "command",
      command: { seq: 5, type: "advance-activity", pulses: 1 },
    });
    expect(
      runtime.handle({
        type: "command",
        command: { seq: 6, type: "advance-time", ticks: 4 },
      }),
    ).toMatchObject({
      result: { accepted: true },
      snapshot: {
        tick: 5,
        buildings: [{ typeId: "house", level: 2 }, { typeId: "well" }],
        households: [{ houseId: 1, residents: 10 }],
      },
    });

    expect(
      runtime.handle({
        type: "command",
        command: { seq: 7, type: "demolish", x: 0, y: 14 },
      }),
    ).toMatchObject({
      result: { accepted: true },
      snapshot: {
        buildings: [{ typeId: "house", level: 1 }],
        households: [{ houseId: 1, residents: 5 }],
      },
    });
  });

  it("经 Worker 完成农场生产与道路入仓闭环", () => {
    const runtime = createSimulationRuntime();
    runtime.handle({ type: "initialize" });
    runtime.handle({
      type: "command",
      command: {
        seq: 1,
        type: "build",
        buildingTypeId: "farm",
        x: 1,
        y: 14,
        rotation: 0,
        cropType: "wheat",
      },
    });
    runtime.handle({
      type: "command",
      command: {
        seq: 2,
        type: "build",
        buildingTypeId: "granary",
        x: 1,
        y: 17,
        rotation: 0,
      },
    });
    runtime.handle({
      type: "command",
      command: {
        seq: 3,
        type: "build-road-path",
        tiles: [
          { x: 0, y: 15 },
          { x: 0, y: 16 },
          { x: 0, y: 17 },
        ],
      },
    });

    expect(
      runtime.handle({
        type: "command",
        command: { seq: 4, type: "advance-time", ticks: 6 },
      }),
    ).toMatchObject({
      result: { accepted: true },
      snapshot: {
        tick: 6,
        buildings: [
          { typeId: "farm", foodStock: 0 },
          { typeId: "granary", foodStock: 1 },
        ],
      },
    });
  });

  it("经 Worker 完成农场、粮仓、市场到住宅的供粮闭环", () => {
    const runtime = createSimulationRuntime();
    runtime.handle({ type: "initialize" });
    const buildings = [
      ["house", 1, 14],
      ["well", 0, 14],
      ["market", 4, 14],
      ["farm", 1, 18],
      ["granary", 4, 18],
    ] as const;
    for (const [index, [buildingTypeId, x, y]] of buildings.entries()) {
      runtime.handle({
        type: "command",
        command: {
          seq: index + 1,
          type: "build",
          buildingTypeId,
          x,
          y,
          rotation: 0,
          ...(buildingTypeId === "farm" ? { cropType: "wheat" as const } : {}),
        },
      });
    }
    runtime.handle({
      type: "command",
      command: {
        seq: 6,
        type: "build-road-path",
        tiles: [
          { x: 0, y: 15 },
          { x: 0, y: 16 },
          { x: 1, y: 16 },
          { x: 2, y: 16 },
          { x: 3, y: 16 },
          { x: 4, y: 16 },
          { x: 4, y: 17 },
          { x: 3, y: 17 },
          { x: 3, y: 18 },
        ],
      },
    });

    runtime.handle({
      type: "command",
      command: { seq: 7, type: "advance-time", ticks: 2 },
    });
    runtime.handle({
      type: "command",
      command: { seq: 8, type: "advance-activity", pulses: 1 },
    });
    expect(
      runtime.handle({
        type: "command",
        command: { seq: 9, type: "advance-time", ticks: 6 },
      }),
    ).toMatchObject({
      result: { accepted: true },
      snapshot: {
        tick: 8,
        buildings: [
          { typeId: "house", level: 2 },
          { typeId: "well" },
          { typeId: "market", foodStock: 0 },
          { typeId: "farm", foodStock: 0 },
          { typeId: "granary", foodStock: 0 },
        ],
        households: [{ houseId: 1, residents: 10, foodReserveTicks: 3 }],
      },
    });
  });
});
