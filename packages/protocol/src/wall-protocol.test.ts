import { describe, expect, it } from "vitest";

import {
  createSaveEnvelope,
  decodeSaveEnvelope,
  parseGameCommand,
  parseSaveEnvelope,
} from "./index";

const emptyWorld = {
  map: { width: 32, height: 32 },
  tick: 4,
  revision: 7,
  buildings: [],
  roads: [],
  households: [],
  migrants: [],
} as const;

describe("城墙命令协议", () => {
  it("连续城墙路径可穿过结构协议并保持坐标", () => {
    const command = {
      seq: 28,
      type: "build-wall-path",
      tiles: [
        { x: 0, y: 14 },
        { x: 1, y: 14 },
      ],
    } as const;

    expect(parseGameCommand(command)).toEqual(command);
  });

  it.each([
    ["空路径", []],
    ["小数坐标", [{ x: 0.5, y: 14 }]],
  ])("拒绝%s", (_name, tiles) => {
    expect(() =>
      parseGameCommand({ seq: 28, type: "build-wall-path", tiles }),
    ).toThrow();
  });
});

describe("城墙 v7 存档协议", () => {
  it("v7 接受不占道路和建筑的唯一墙格", () => {
    const envelope = parseSaveEnvelope({
      saveFormatVersion: 7,
      world: {
        ...emptyWorld,
        walls: [
          { x: 0, y: 14 },
          { x: 0, y: 16 },
        ],
      },
    });

    expect(envelope).toMatchObject({
      saveFormatVersion: 7,
      world: {
        walls: [
          { x: 0, y: 14 },
          { x: 0, y: 16 },
        ],
      },
    });
    if (envelope.saveFormatVersion !== 7) throw new Error("期望 v7 存档");
    expect(createSaveEnvelope(envelope.world)).toMatchObject({
      saveFormatVersion: 8,
    });
  });

  it("v7 必须显式携带城墙层", () => {
    expect(() =>
      parseSaveEnvelope({ saveFormatVersion: 7, world: emptyWorld }),
    ).toThrow(/城墙层/);
  });

  it.each([
    [
      "重复墙格",
      [
        { x: 2, y: 2 },
        { x: 2, y: 2 },
      ],
      [],
    ],
    ["占用城门", [{ x: 0, y: 15 }], []],
    ["压住道路", [{ x: 2, y: 2 }], [{ x: 2, y: 2 }]],
  ])("v7 拒绝%s", (_name, walls, roads) => {
    expect(() =>
      parseSaveEnvelope({
        saveFormatVersion: 7,
        world: { ...emptyWorld, walls, roads },
      }),
    ).toThrow();
  });

  it("v6 无损升级为空墙 v7", () => {
    const decoded = decodeSaveEnvelope({
      saveFormatVersion: 6,
      world: emptyWorld,
    });

    expect(decoded).toMatchObject({
      sourceVersion: 6,
      snapshot: { tick: 4, revision: 7, walls: [] },
      envelope: { saveFormatVersion: 8, world: { walls: [] } },
    });
  });
});
