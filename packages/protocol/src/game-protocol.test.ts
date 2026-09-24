import { describe, expect, it } from "vitest";

import {
  DEFAULT_TERRAIN_CONTRACT,
  createSaveEnvelope,
  decodeSaveEnvelope,
  parseGameCommand,
  parseSaveEnvelope,
  parseWorkerRequest,
  upgradeSaveEnvelope,
} from "./index";

const householdLivelihoodDefaults = {
  cash: 12,
  employedWorkers: 0,
  lastIncome: 0,
  lastFoodExpense: 0,
  wageArrears: 0,
  taxArrears: 0,
  foodShortageReason: "none" as const,
  livelihoodLedger: [],
};

describe("游戏命令协议", () => {
  it("合法住宅建造命令可通过边界校验并保持字段值", () => {
    const command = parseGameCommand({
      seq: 7,
      type: "build",
      buildingTypeId: "house",
      x: 10,
      y: 12,
      rotation: 1,
    });

    expect(command).toEqual({
      seq: 7,
      type: "build",
      buildingTypeId: "house",
      x: 10,
      y: 12,
      rotation: 1,
    });
  });

  it.each([
    [
      "小数坐标",
      {
        seq: 1,
        type: "build",
        buildingTypeId: "house",
        x: 1.5,
        y: 2,
        rotation: 0,
      },
    ],
    [
      "非法旋转",
      {
        seq: 1,
        type: "build",
        buildingTypeId: "house",
        x: 1,
        y: 2,
        rotation: 4,
      },
    ],
    [
      "未知建筑",
      {
        seq: 1,
        type: "build",
        buildingTypeId: "palace",
        x: 1,
        y: 2,
        rotation: 0,
      },
    ],
  ])("%s 命令不能穿过协议边界", (_name, value) => {
    expect(() => parseGameCommand(value)).toThrow();
  });

  it("Worker 入站边界拒绝 NaN 坐标", () => {
    expect(() =>
      parseWorkerRequest({
        type: "command",
        command: {
          seq: 9,
          type: "build",
          buildingTypeId: "house",
          x: Number.NaN,
          y: 2,
          rotation: 0,
        },
      }),
    ).toThrow();
  });

  it("道路越界属于领域拒绝，因此能通过结构协议进入 simulation", () => {
    const command = {
      seq: 10,
      type: "build-road-path",
      tiles: [
        { x: 31, y: 15 },
        { x: 32, y: 15 },
      ],
    } as const;
    expect(parseGameCommand(command)).toEqual(command);
  });

  it("合法拆除命令可穿过 Worker 结构边界", () => {
    const command = { seq: 11, type: "demolish", x: 4, y: 9 } as const;
    expect(parseGameCommand(command)).toEqual(command);
  });

  it("人物活动脉冲可独立穿过 Worker 协议边界", () => {
    const command = {
      seq: 12,
      type: "advance-activity",
      pulses: 1,
    } as const;

    expect(parseGameCommand(command)).toEqual(command);
  });

  it.each([0, 1.5, 11])("拒绝非法人物活动脉冲 %s", (pulses) => {
    expect(() =>
      parseGameCommand({
        seq: 12,
        type: "advance-activity",
        pulses,
      }),
    ).toThrow();
  });

  it("合法工资与行业优先级策略可穿过协议边界", () => {
    const command = {
      seq: 12,
      type: "set-labor-policy",
      wageLevel: "high",
      priorities: ["commerce", "services", "agriculture"],
    } as const;
    expect(parseGameCommand(command)).toEqual(command);
  });

  it("合法粮仓接收策略可穿过协议边界", () => {
    const command = {
      seq: 19,
      type: "set-granary-policy",
      granaryId: 3,
      cropType: "rice",
      accept: false,
    } as const;
    expect(parseGameCommand(command)).toEqual(command);
  });

  it("合法神农供奉命令可穿过协议边界", () => {
    const command = {
      seq: 20,
      type: "make-offering",
      granaryId: 3,
      cropType: "wheat",
    } as const;
    expect(parseGameCommand(command)).toEqual(command);
  });

  it("合法外交赠礼命令可穿过协议边界", () => {
    const command = {
      seq: 21,
      type: "send-gift",
      granaryId: 3,
      cropType: "wheat",
    } as const;
    expect(parseGameCommand(command)).toEqual(command);
  });

  it("重复或缺失行业的劳动力优先级会被拒绝", () => {
    expect(() =>
      parseGameCommand({
        seq: 12,
        type: "set-labor-policy",
        wageLevel: "standard",
        priorities: ["commerce", "commerce", "agriculture"],
      }),
    ).toThrow(/优先级/);
  });

  it("合法水井建造命令可穿过协议边界", () => {
    const command = {
      seq: 12,
      type: "build",
      buildingTypeId: "well",
      x: 4,
      y: 9,
      rotation: 0,
    } as const;
    expect(parseGameCommand(command)).toEqual(command);
  });

  it.each(["farm", "granary", "market"] as const)(
    "合法 %s 建造命令可穿过协议边界",
    (buildingTypeId) => {
      const command = {
        seq: 13,
        type: "build",
        buildingTypeId,
        x: 6,
        y: 9,
        rotation: 0,
      } as const;
      expect(parseGameCommand(command)).toEqual(command);
    },
  );

  it.each(["hemp-farm", "weaver"] as const)(
    "合法 %s 产业建筑命令可穿过协议边界",
    (buildingTypeId) => {
      expect(
        parseGameCommand({
          seq: 17,
          type: "build",
          buildingTypeId,
          x: 6,
          y: 9,
          rotation: 0,
        }),
      ).toMatchObject({ buildingTypeId });
    },
  );

  it.each(["weaponsmith", "infantry-fort"] as const)(
    "合法 %s 军事建筑命令可穿过协议边界",
    (buildingTypeId) => {
      expect(
        parseGameCommand({
          seq: 18,
          type: "build",
          buildingTypeId,
          x: 6,
          y: 9,
          rotation: 0,
        }),
      ).toMatchObject({ buildingTypeId });
    },
  );

  it("农场建造命令保留已选择的合法作物", () => {
    expect(
      parseGameCommand({
        seq: 15,
        type: "build",
        buildingTypeId: "farm",
        cropType: "wheat",
        x: 6,
        y: 9,
        rotation: 0,
      }),
    ).toMatchObject({ buildingTypeId: "farm", cropType: "wheat" });
  });

  it.each([
    ["未知作物", { buildingTypeId: "farm", cropType: "potato" }],
    ["非农场携带作物", { buildingTypeId: "well", cropType: "wheat" }],
  ])("%s 会被结构协议拒绝", (_name, fields) => {
    expect(() =>
      parseGameCommand({
        seq: 16,
        type: "build",
        x: 6,
        y: 9,
        rotation: 0,
        ...fields,
      }),
    ).toThrow();
  });

  it.each(["farm", "granary", "market"] as const)(
    "%s 非零旋转会被结构协议拒绝",
    (buildingTypeId) => {
      expect(() =>
        parseGameCommand({
          seq: 14,
          type: "build",
          buildingTypeId,
          x: 6,
          y: 9,
          rotation: 1,
        }),
      ).toThrow();
    },
  );

  it.each([
    ["空道路路径", { seq: 1, type: "build-road-path", tiles: [] }],
    [
      "非安全序号",
      {
        seq: Number.MAX_SAFE_INTEGER + 1,
        type: "advance-time",
        ticks: 1,
      },
    ],
    ["零 tick", { seq: 1, type: "advance-time", ticks: 0 }],
    ["拆除坐标为小数", { seq: 1, type: "demolish", x: 1.5, y: 2 }],
  ])("%s 会被结构协议拒绝", (_name, command) => {
    expect(() => parseGameCommand(command)).toThrow();
  });
});

describe("存档协议", () => {
  const validSave = {
    saveFormatVersion: 1,
    world: {
      map: { width: 32, height: 32 },
      tick: 0,
      revision: 1,
      buildings: [
        {
          id: 1,
          typeId: "house",
          x: 10,
          y: 12,
          rotation: 0,
          footprint: { width: 2, height: 2 },
        },
      ],
    },
  } as const;

  it("版本 6 旧农场缺少作物时安全补为粟", () => {
    const parsed = parseSaveEnvelope({
      saveFormatVersion: 6,
      world: {
        map: { width: 32, height: 32 },
        tick: 0,
        revision: 1,
        buildings: [
          {
            id: 1,
            typeId: "farm",
            x: 6,
            y: 9,
            rotation: 0,
            footprint: { width: 2, height: 2 },
            foodStock: 2,
          },
        ],
        roads: [],
        households: [],
        migrants: [],
      },
    });

    expect(parsed.world.buildings[0]).toMatchObject({
      typeId: "farm",
      cropType: "millet",
      foodStock: 2,
    });
  });

  it("版本 6 旧粮仓总库存迁移为粟的分品类库存", () => {
    const parsed = parseSaveEnvelope({
      saveFormatVersion: 6,
      world: {
        map: { width: 32, height: 32 },
        tick: 0,
        revision: 1,
        buildings: [
          {
            id: 1,
            typeId: "granary",
            x: 6,
            y: 9,
            rotation: 0,
            footprint: { width: 2, height: 2 },
            foodStock: 2,
          },
        ],
        roads: [],
        households: [],
        migrants: [],
      },
    });

    expect(parsed.world.buildings[0]).toMatchObject({
      typeId: "granary",
      foodStock: 2,
      foodStocks: { wheat: 0, soybean: 0, rice: 0, millet: 2, cabbage: 0 },
    });
  });

  it("拒绝总库存与分品类库存不守恒的版本 6 存档", () => {
    expect(() =>
      parseSaveEnvelope({
        saveFormatVersion: 6,
        world: {
          map: { width: 32, height: 32 },
          tick: 0,
          revision: 1,
          buildings: [
            {
              id: 1,
              typeId: "market",
              x: 6,
              y: 9,
              rotation: 0,
              footprint: { width: 2, height: 2 },
              foodStock: 2,
              foodStocks: {
                wheat: 1,
                soybean: 0,
                rice: 0,
                millet: 0,
                cabbage: 0,
              },
            },
          ],
          roads: [],
          households: [],
          migrants: [],
        },
      }),
    ).toThrow(/分品类粮食库存/);
  });

  it("版本 5 住宅升级到版本 7 时视为既有成屋且不生成流民", () => {
    const decoded = decodeSaveEnvelope({
      saveFormatVersion: 5,
      world: {
        map: { width: 32, height: 32 },
        tick: 8,
        revision: 12,
        buildings: [
          {
            id: 1,
            typeId: "house",
            x: 1,
            y: 14,
            rotation: 0,
            footprint: { width: 2, height: 2 },
            level: 1,
          },
        ],
        roads: [{ x: 0, y: 15 }],
        households: [{ houseId: 1, residents: 5, foodReserveTicks: 2 }],
      },
    });

    expect(decoded).toMatchObject({
      sourceVersion: 5,
      snapshot: {
        tick: 8,
        revision: 12,
        buildings: [{ id: 1, constructionStage: 4 }],
        migrants: [],
        households: [{ houseId: 1, residents: 5, foodReserveTicks: 2 }],
      },
      envelope: { saveFormatVersion: 8 },
    });
  });

  it("版本 6 接受宅基地与城门步行流民的权威快照", () => {
    const envelope = parseSaveEnvelope({
      saveFormatVersion: 6,
      world: {
        map: { width: 32, height: 32 },
        tick: 1,
        revision: 3,
        buildings: [
          {
            id: 1,
            typeId: "house",
            x: 1,
            y: 14,
            rotation: 0,
            footprint: { width: 2, height: 2 },
            level: 1,
            constructionStage: 0,
          },
        ],
        roads: [{ x: 0, y: 15 }],
        households: [],
        migrants: [{ houseId: 1, x: 0, y: 15, state: "walking" }],
      },
    });

    expect(envelope).toMatchObject({
      saveFormatVersion: 6,
      world: {
        buildings: [{ constructionStage: 0 }],
        migrants: [{ houseId: 1, state: "walking" }],
      },
    });
  });

  it("版本 6 接受绑定学校、市场且位于道路的单一乐师", () => {
    const envelope = parseSaveEnvelope({
      saveFormatVersion: 6,
      world: {
        map: { width: 32, height: 32 },
        tick: 4,
        revision: 4,
        buildings: [
          {
            id: 1,
            typeId: "music-school",
            x: 1,
            y: 16,
            rotation: 0,
            footprint: { width: 2, height: 2 },
          },
          {
            id: 2,
            typeId: "market",
            x: 6,
            y: 16,
            rotation: 0,
            footprint: { width: 2, height: 2 },
            foodStock: 0,
            foodStocks: {
              wheat: 0,
              soybean: 0,
              rice: 0,
              millet: 0,
              cabbage: 0,
            },
          },
        ],
        roads: [{ x: 3, y: 15 }],
        households: [],
        migrants: [],
        performers: [{ schoolId: 1, targetMarketId: 2, x: 3, y: 15 }],
      },
    });
    expect(envelope.world).toMatchObject({
      performers: [{ schoolId: 1, targetMarketId: 2, x: 3, y: 15 }],
    });
  });

  it("早期 v6 财政对象保留余额并补齐民心与贸易收入默认值", () => {
    const envelope = parseSaveEnvelope({
      saveFormatVersion: 6,
      world: {
        map: { width: 32, height: 32 },
        tick: 8,
        revision: 6,
        buildings: [],
        roads: [],
        households: [],
        migrants: [],
        economy: {
          treasury: 432,
          taxRate: "high",
          lastTaxRevenue: 9,
          lastPayroll: 4,
          taxableHouses: 2,
        },
      },
    });
    if (envelope.saveFormatVersion !== 6) {
      throw new Error("预期解析为 v6 存档");
    }
    expect(envelope.world.economy).toEqual({
      treasury: 432,
      taxRate: "high",
      lastTaxRevenue: 9,
      lastPayroll: 4,
      taxableHouses: 2,
      sentiment: 50,
      lastTradeRevenue: 0,
    });
  });

  it.each([
    ["孤儿学校", [{ schoolId: 9, targetMarketId: 2, x: 3, y: 15 }]],
    ["孤儿市场", [{ schoolId: 1, targetMarketId: 9, x: 3, y: 15 }]],
    ["离开道路", [{ schoolId: 1, targetMarketId: 2, x: 4, y: 15 }]],
    [
      "同校重复乐师",
      [
        { schoolId: 1, targetMarketId: 2, x: 3, y: 15 },
        { schoolId: 1, targetMarketId: 2, x: 3, y: 15 },
      ],
    ],
  ])("版本 6 拒绝%s", (_name, performers) => {
    expect(() =>
      parseSaveEnvelope({
        saveFormatVersion: 6,
        world: {
          map: { width: 32, height: 32 },
          tick: 4,
          revision: 4,
          buildings: [
            {
              id: 1,
              typeId: "music-school",
              x: 1,
              y: 16,
              rotation: 0,
              footprint: { width: 2, height: 2 },
            },
            {
              id: 2,
              typeId: "market",
              x: 6,
              y: 16,
              rotation: 0,
              footprint: { width: 2, height: 2 },
              foodStock: 0,
              foodStocks: {
                wheat: 0,
                soybean: 0,
                rice: 0,
                millet: 0,
                cabbage: 0,
              },
            },
          ],
          roads: [{ x: 3, y: 15 }],
          households: [],
          migrants: [],
          performers,
        },
      }),
    ).toThrow();
  });

  it.each([
    [
      "未完工住宅已有住户",
      {
        households: [{ houseId: 1, residents: 5, foodReserveTicks: 3 }],
        migrants: [],
      },
    ],
    [
      "已完工住宅仍绑定流民",
      {
        constructionStage: 4,
        households: [],
        migrants: [{ houseId: 1, x: 0, y: 15, state: "walking" }],
      },
    ],
    [
      "同一住宅绑定重复流民",
      {
        households: [],
        migrants: [
          { houseId: 1, x: 0, y: 15, state: "walking" },
          { houseId: 1, x: 0, y: 15, state: "walking" },
        ],
      },
    ],
  ])("版本 6 拒绝%s", (_name, variant) => {
    const constructionStage =
      "constructionStage" in variant ? variant.constructionStage : 0;
    expect(() =>
      parseSaveEnvelope({
        saveFormatVersion: 6,
        world: {
          map: { width: 32, height: 32 },
          tick: 1,
          revision: 3,
          buildings: [
            {
              id: 1,
              typeId: "house",
              x: 1,
              y: 14,
              rotation: 0,
              footprint: { width: 2, height: 2 },
              level: 1,
              constructionStage,
            },
          ],
          roads: [{ x: 0, y: 15 }],
          households: variant.households,
          migrants: variant.migrants,
        },
      }),
    ).toThrow();
  });

  it("版本 1 的完整世界可以通过存档边界校验", () => {
    expect(parseSaveEnvelope(validSave)).toEqual(validSave);
  });

  it("版本 1 存档升级后保留住宅并补齐空道路和空住户", () => {
    expect(upgradeSaveEnvelope(parseSaveEnvelope(validSave))).toEqual({
      ...validSave.world,
      buildings: [
        {
          ...validSave.world.buildings[0],
          level: 1,
          constructionStage: 4,
        },
      ],
      roads: [],
      walls: [],
      terrain: { ...DEFAULT_TERRAIN_CONTRACT },
      households: [],
      migrants: [],
    });
  });

  it("版本 1 中压住后来新增城门格的住宅会确定性迁到最近合法空地", () => {
    const legacyGateSave = {
      ...validSave,
      world: {
        ...validSave.world,
        buildings: [{ ...validSave.world.buildings[0], x: 0, y: 14 }],
      },
    } as const;

    const parsed = parseSaveEnvelope(legacyGateSave);

    expect(upgradeSaveEnvelope(parsed)).toMatchObject({
      buildings: [{ id: 1, x: 1, y: 14, level: 1 }],
      roads: [],
      households: [],
    });
  });

  it("版本 2 存档接受道路和住户数据", () => {
    const currentSave = {
      saveFormatVersion: 2,
      world: {
        ...validSave.world,
        revision: 3,
        buildings: [
          {
            ...validSave.world.buildings[0],
            x: 1,
            y: 14,
          },
        ],
        roads: [{ x: 0, y: 15 }],
        households: [{ houseId: 1, residents: 5 }],
      },
    } as const;

    expect(parseSaveEnvelope(currentSave)).toEqual(currentSave);
    expect(upgradeSaveEnvelope(parseSaveEnvelope(currentSave))).toEqual({
      ...currentSave.world,
      buildings: [
        {
          ...currentSave.world.buildings[0],
          level: 1,
          constructionStage: 4,
        },
      ],
      terrain: { ...DEFAULT_TERRAIN_CONTRACT },
      households: [
        {
          ...currentSave.world.households[0],
          foodReserveTicks: 3,
          foodQuality: "bland",
          ...householdLivelihoodDefaults,
        },
      ],
      walls: [],
      migrants: [],
    });
  });

  it("版本 3 水井、二级住宅和 10 人住户迁移到版本 7 时补齐口粮与成屋状态", () => {
    const currentSave = {
      saveFormatVersion: 3,
      world: {
        map: { width: 32, height: 32 },
        tick: 2,
        revision: 5,
        buildings: [
          {
            id: 1,
            typeId: "house",
            x: 1,
            y: 14,
            rotation: 0,
            footprint: { width: 2, height: 2 },
            level: 2,
          },
          {
            id: 2,
            typeId: "well",
            x: 0,
            y: 14,
            rotation: 0,
            footprint: { width: 1, height: 1 },
          },
        ],
        roads: [{ x: 0, y: 15 }],
        households: [{ houseId: 1, residents: 10 }],
      },
    } as const;

    const parsed = parseSaveEnvelope(currentSave);
    expect(parsed).toEqual(currentSave);
    const upgraded = upgradeSaveEnvelope(parsed);
    const expectedWorld = {
      ...currentSave.world,
      terrain: { ...DEFAULT_TERRAIN_CONTRACT },
      buildings: currentSave.world.buildings.map((building) =>
        building.typeId === "house"
          ? { ...building, constructionStage: 4 as const }
          : building,
      ),
      households: [
        {
          ...currentSave.world.households[0],
          foodReserveTicks: 3,
          foodQuality: "bland",
          ...householdLivelihoodDefaults,
        },
      ],
      walls: [],
      migrants: [],
    };
    expect(upgraded).toEqual(expectedWorld);
    expect(createSaveEnvelope(upgraded)).toEqual({
      saveFormatVersion: 8,
      world: expectedWorld,
    });
    expect(decodeSaveEnvelope(currentSave)).toEqual({
      sourceVersion: 3,
      snapshot: expectedWorld,
      envelope: { saveFormatVersion: 8, world: expectedWorld },
    });
  });

  it("版本 4 四类建筑迁移到版本 7 时补口粮并保持既有住宅为成屋", () => {
    const currentSave = {
      saveFormatVersion: 4,
      world: {
        map: { width: 32, height: 32 },
        tick: 6,
        revision: 9,
        buildings: [
          {
            id: 1,
            typeId: "house",
            x: 1,
            y: 14,
            rotation: 0,
            footprint: { width: 2, height: 2 },
            level: 2,
          },
          {
            id: 2,
            typeId: "well",
            x: 0,
            y: 14,
            rotation: 0,
            footprint: { width: 1, height: 1 },
          },
          {
            id: 3,
            typeId: "farm",
            x: 5,
            y: 5,
            rotation: 0,
            footprint: { width: 2, height: 2 },
            foodStock: 2,
          },
          {
            id: 4,
            typeId: "granary",
            x: 8,
            y: 5,
            rotation: 0,
            footprint: { width: 2, height: 2 },
            foodStock: 7,
          },
        ],
        roads: [{ x: 0, y: 15 }],
        households: [{ houseId: 1, residents: 10 }],
      },
    } as const;
    const expectedWorld = {
      ...currentSave.world,
      terrain: { ...DEFAULT_TERRAIN_CONTRACT },
      buildings: currentSave.world.buildings.map((building) =>
        building.typeId === "house"
          ? { ...building, constructionStage: 4 as const }
          : building.typeId === "farm"
            ? { ...building, cropType: "millet" as const }
            : building.typeId === "granary"
              ? {
                  ...building,
                  foodStocks: {
                    wheat: 0,
                    soybean: 0,
                    rice: 0,
                    millet: building.foodStock,
                    cabbage: 0,
                  },
                }
              : building,
      ),
      households: [
        {
          ...currentSave.world.households[0],
          foodReserveTicks: 3,
          foodQuality: "bland",
          ...householdLivelihoodDefaults,
        },
      ],
      walls: [],
      migrants: [],
    };

    const decoded = decodeSaveEnvelope(currentSave);

    expect(decoded).toEqual({
      sourceVersion: 4,
      snapshot: expectedWorld,
      envelope: { saveFormatVersion: 8, world: expectedWorld },
    });
    expect(createSaveEnvelope(decoded.snapshot)).toEqual({
      saveFormatVersion: 8,
      world: expectedWorld,
    });
  });

  it("版本 5 可迁移市场库存和住户口粮并补齐成屋状态", () => {
    const currentSave = {
      saveFormatVersion: 5,
      world: {
        map: { width: 32, height: 32 },
        tick: 7,
        revision: 10,
        buildings: [
          {
            id: 1,
            typeId: "house",
            x: 1,
            y: 14,
            rotation: 0,
            footprint: { width: 2, height: 2 },
            level: 2,
          },
          {
            id: 2,
            typeId: "well",
            x: 0,
            y: 14,
            rotation: 0,
            footprint: { width: 1, height: 1 },
          },
          {
            id: 3,
            typeId: "market",
            x: 5,
            y: 5,
            rotation: 0,
            footprint: { width: 2, height: 2 },
            foodStock: 4,
          },
        ],
        roads: [{ x: 0, y: 15 }],
        households: [{ houseId: 1, residents: 10, foodReserveTicks: 2 }],
      },
    } as const;

    const decoded = decodeSaveEnvelope(currentSave);
    const expectedWorld = {
      ...currentSave.world,
      terrain: { ...DEFAULT_TERRAIN_CONTRACT },
      buildings: currentSave.world.buildings.map((building) =>
        building.typeId === "house"
          ? { ...building, constructionStage: 4 as const }
          : building.typeId === "market"
            ? {
                ...building,
                foodStocks: {
                  wheat: 0,
                  soybean: 0,
                  rice: 0,
                  millet: building.foodStock,
                  cabbage: 0,
                },
              }
            : building,
      ),
      households: currentSave.world.households.map((household) => ({
        ...household,
        foodQuality: "bland" as const,
        ...householdLivelihoodDefaults,
      })),
      walls: [],
      migrants: [],
    };
    expect(decoded).toEqual({
      sourceVersion: 5,
      snapshot: expectedWorld,
      envelope: { saveFormatVersion: 8, world: expectedWorld },
    });
    expect(createSaveEnvelope(decoded.snapshot)).toEqual({
      saveFormatVersion: 8,
      world: expectedWorld,
    });
  });

  it.each([
    [
      "市场库存超过上限",
      {
        buildings: [
          {
            id: 1,
            typeId: "market",
            x: 5,
            y: 5,
            rotation: 0,
            footprint: { width: 2, height: 2 },
            foodStock: 5,
          },
        ],
        roads: [],
        households: [],
      },
    ],
    [
      "住户缺少口粮字段",
      {
        buildings: [
          {
            id: 1,
            typeId: "house",
            x: 1,
            y: 14,
            rotation: 0,
            footprint: { width: 2, height: 2 },
            level: 1,
          },
        ],
        roads: [{ x: 0, y: 15 }],
        households: [{ houseId: 1, residents: 5 }],
      },
    ],
    [
      "二级住宅口粮已经归零",
      {
        buildings: [
          {
            id: 1,
            typeId: "house",
            x: 1,
            y: 14,
            rotation: 0,
            footprint: { width: 2, height: 2 },
            level: 2,
          },
          {
            id: 2,
            typeId: "well",
            x: 0,
            y: 14,
            rotation: 0,
            footprint: { width: 1, height: 1 },
          },
        ],
        roads: [{ x: 0, y: 15 }],
        households: [{ houseId: 1, residents: 10, foodReserveTicks: 0 }],
      },
    ],
  ])("版本 5 拒绝%s", (_name, worldLayers) => {
    expect(() =>
      parseSaveEnvelope({
        saveFormatVersion: 5,
        world: {
          map: { width: 32, height: 32 },
          tick: 0,
          revision: 1,
          ...worldLayers,
        },
      }),
    ).toThrow();
  });

  it("版本 4 冻结边界拒绝市场和住户口粮字段", () => {
    expect(() =>
      parseSaveEnvelope({
        saveFormatVersion: 4,
        world: {
          map: { width: 32, height: 32 },
          tick: 0,
          revision: 1,
          buildings: [
            {
              id: 1,
              typeId: "market",
              x: 5,
              y: 5,
              rotation: 0,
              footprint: { width: 2, height: 2 },
              foodStock: 0,
            },
          ],
          roads: [],
          households: [],
        },
      }),
    ).toThrow();

    expect(() =>
      parseSaveEnvelope({
        saveFormatVersion: 4,
        world: {
          map: { width: 32, height: 32 },
          tick: 0,
          revision: 1,
          buildings: [
            {
              id: 1,
              typeId: "house",
              x: 1,
              y: 14,
              rotation: 0,
              footprint: { width: 2, height: 2 },
              level: 1,
            },
          ],
          roads: [{ x: 0, y: 15 }],
          households: [{ houseId: 1, residents: 5, foodReserveTicks: 3 }],
        },
      }),
    ).toThrow();
  });

  it.each([
    [
      "农场库存超过上限",
      {
        id: 1,
        typeId: "farm",
        x: 5,
        y: 5,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        foodStock: 4,
      },
    ],
    [
      "粮仓库存超过上限",
      {
        id: 1,
        typeId: "granary",
        x: 5,
        y: 5,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        foodStock: 11,
      },
    ],
    [
      "农场缺少库存",
      {
        id: 1,
        typeId: "farm",
        x: 5,
        y: 5,
        rotation: 0,
        footprint: { width: 2, height: 2 },
      },
    ],
    [
      "粮仓占地错误",
      {
        id: 1,
        typeId: "granary",
        x: 5,
        y: 5,
        rotation: 0,
        footprint: { width: 1, height: 1 },
        foodStock: 0,
      },
    ],
  ])("版本 4 拒绝%s", (_name, building) => {
    expect(() =>
      parseSaveEnvelope({
        saveFormatVersion: 4,
        world: {
          map: { width: 32, height: 32 },
          tick: 0,
          revision: 1,
          buildings: [building],
          roads: [],
          households: [],
        },
      }),
    ).toThrow();
  });

  it("版本 3 冻结边界拒绝偷塞农场字段", () => {
    expect(() =>
      parseSaveEnvelope({
        saveFormatVersion: 3,
        world: {
          map: { width: 32, height: 32 },
          tick: 0,
          revision: 1,
          buildings: [
            {
              id: 1,
              typeId: "farm",
              x: 5,
              y: 5,
              rotation: 0,
              footprint: { width: 2, height: 2 },
              foodStock: 0,
            },
          ],
          roads: [],
          households: [],
        },
      }),
    ).toThrow();
  });

  it("版本 4 住户不能引用粮仓", () => {
    expect(() =>
      parseSaveEnvelope({
        saveFormatVersion: 4,
        world: {
          map: { width: 32, height: 32 },
          tick: 0,
          revision: 1,
          buildings: [
            {
              id: 1,
              typeId: "granary",
              x: 5,
              y: 5,
              rotation: 0,
              footprint: { width: 2, height: 2 },
              foodStock: 0,
            },
          ],
          roads: [],
          households: [{ houseId: 1, residents: 5 }],
        },
      }),
    ).toThrow();
  });

  it.each([
    [
      "住宅缺少等级",
      {
        buildings: [
          {
            id: 1,
            typeId: "house",
            x: 1,
            y: 14,
            rotation: 0,
            footprint: { width: 2, height: 2 },
          },
        ],
        roads: [{ x: 0, y: 15 }],
        households: [],
      },
    ],
    [
      "住户引用水井",
      {
        buildings: [
          {
            id: 2,
            typeId: "well",
            x: 0,
            y: 14,
            rotation: 0,
            footprint: { width: 1, height: 1 },
          },
        ],
        roads: [{ x: 0, y: 15 }],
        households: [{ houseId: 2, residents: 5 }],
      },
    ],
    [
      "一级住宅住了 10 人",
      {
        buildings: [
          {
            id: 1,
            typeId: "house",
            x: 1,
            y: 14,
            rotation: 0,
            footprint: { width: 2, height: 2 },
            level: 1,
          },
          {
            id: 2,
            typeId: "well",
            x: 0,
            y: 14,
            rotation: 0,
            footprint: { width: 1, height: 1 },
          },
        ],
        roads: [{ x: 0, y: 15 }],
        households: [{ houseId: 1, residents: 10 }],
      },
    ],
  ])("版本 3 拒绝%s", (_name, worldLayers) => {
    expect(() =>
      parseSaveEnvelope({
        saveFormatVersion: 3,
        world: {
          map: { width: 32, height: 32 },
          tick: 0,
          revision: 1,
          ...worldLayers,
        },
      }),
    ).toThrow();
  });

  it.each([
    [
      "重复道路格",
      {
        roads: [
          { x: 0, y: 15 },
          { x: 0, y: 15 },
        ],
        households: [],
      },
    ],
    [
      "引用不存在住宅的住户",
      {
        roads: [],
        households: [{ houseId: 99, residents: 5 }],
      },
    ],
  ])("版本 2 存档拒绝%s", (_name, layers) => {
    expect(() =>
      parseSaveEnvelope({
        saveFormatVersion: 2,
        world: { ...validSave.world, ...layers },
      }),
    ).toThrow();
  });

  it("版本 2 存档拒绝没有入口道路服务的悬空住户", () => {
    expect(() =>
      parseSaveEnvelope({
        saveFormatVersion: 2,
        world: {
          ...validSave.world,
          roads: [],
          households: [{ houseId: 1, residents: 5 }],
        },
      }),
    ).toThrow();
  });

  it("版本 2 不把地图左边界与上一行右边界当作连通道路", () => {
    expect(() =>
      parseSaveEnvelope({
        saveFormatVersion: 2,
        world: {
          map: { width: 32, height: 32 },
          tick: 1,
          revision: 4,
          buildings: [
            {
              ...validSave.world.buildings[0],
              x: 29,
              y: 14,
            },
          ],
          roads: [
            { x: 0, y: 15 },
            { x: 31, y: 14 },
          ],
          households: [{ houseId: 1, residents: 5 }],
        },
      }),
    ).toThrow();
  });

  it("版本 3 不允许水服务从地图右边界环绕到下一行左边界", () => {
    expect(() =>
      parseSaveEnvelope({
        saveFormatVersion: 3,
        world: {
          map: { width: 32, height: 32 },
          tick: 2,
          revision: 6,
          buildings: [
            {
              id: 1,
              typeId: "house",
              x: 0,
              y: 17,
              rotation: 0,
              footprint: { width: 2, height: 2 },
              level: 2,
            },
            {
              id: 2,
              typeId: "well",
              x: 31,
              y: 14,
              rotation: 0,
              footprint: { width: 1, height: 1 },
            },
          ],
          roads: [
            { x: 0, y: 15 },
            { x: 0, y: 16 },
            { x: 31, y: 15 },
          ],
          households: [{ houseId: 1, residents: 10 }],
        },
      }),
    ).toThrow();
  });

  it("未知存档版本会被拒绝", () => {
    expect(() =>
      parseSaveEnvelope({ ...validSave, saveFormatVersion: 999 }),
    ).toThrow();
  });

  it("非法建筑数据会被拒绝", () => {
    expect(() =>
      parseSaveEnvelope({
        ...validSave,
        world: {
          ...validSave.world,
          buildings: [{ ...validSave.world.buildings[0], x: Number.NaN }],
        },
      }),
    ).toThrow();
  });

  it.each([
    ["越界建筑", [{ ...validSave.world.buildings[0], x: 31 }]],
    [
      "重复实体 ID",
      [
        validSave.world.buildings[0],
        { ...validSave.world.buildings[0], x: 20, y: 20 },
      ],
    ],
    [
      "互相重叠的建筑",
      [
        validSave.world.buildings[0],
        { ...validSave.world.buildings[0], id: 2, x: 11, y: 11 },
      ],
    ],
  ])("版本正确但包含%s的存档仍会被拒绝", (_name, buildings) => {
    expect(() =>
      parseSaveEnvelope({
        ...validSave,
        world: { ...validSave.world, buildings },
      }),
    ).toThrow();
  });
});
