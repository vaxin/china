import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { DEFAULT_TERRAIN_CONTRACT, type WorldSnapshot } from "@empire/protocol";

import { GameSaveStore } from "./index";

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

function worldWithOneHouse(): WorldSnapshot {
  return {
    map: { width: 32, height: 32 },
    terrain: { ...DEFAULT_TERRAIN_CONTRACT },
    tick: 0,
    revision: 1,
    buildings: [
      {
        id: 1,
        typeId: "house",
        x: 10,
        y: 10,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        level: 1,
        constructionStage: 4,
      },
    ],
    roads: [],
    walls: [],
    households: [],
    migrants: [],
  };
}

function worldWithWateredUpgradedHouse(): WorldSnapshot {
  return {
    map: { width: 32, height: 32 },
    terrain: { ...DEFAULT_TERRAIN_CONTRACT },
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
        constructionStage: 4,
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
    walls: [],
    households: [
      {
        houseId: 1,
        residents: 10,
        foodReserveTicks: 2,
        foodQuality: "bland",
        ...householdLivelihoodDefaults,
      },
    ],
    migrants: [],
  };
}

function worldWithFoodBuildings(): WorldSnapshot {
  return {
    map: { width: 32, height: 32 },
    terrain: { ...DEFAULT_TERRAIN_CONTRACT },
    tick: 6,
    revision: 9,
    buildings: [
      {
        id: 1,
        typeId: "farm",
        x: 5,
        y: 5,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        foodStock: 2,
        cropType: "wheat",
      },
      {
        id: 2,
        typeId: "granary",
        x: 8,
        y: 5,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        foodStock: 7,
        foodStocks: { wheat: 2, soybean: 1, rice: 1, millet: 2, cabbage: 1 },
      },
      {
        id: 3,
        typeId: "market",
        x: 11,
        y: 5,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        foodStock: 3,
        foodStocks: { wheat: 1, soybean: 0, rice: 1, millet: 1, cabbage: 0 },
      },
    ],
    roads: [],
    walls: [],
    households: [],
    migrants: [],
  };
}

function worldWithPendingLivelihoodOrder(): WorldSnapshot {
  const world = worldWithWateredUpgradedHouse();
  return {
    ...world,
    buildings: [
      ...world.buildings,
      {
        id: 3,
        typeId: "market",
        x: 4,
        y: 14,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        foodStock: 1,
        foodStocks: {
          wheat: 1,
          soybean: 0,
          rice: 0,
          millet: 0,
          cabbage: 0,
        },
        clothingStock: 0,
      },
    ],
    roads: [
      { x: 0, y: 15 },
      ...Array.from({ length: 5 }, (_, x) => ({ x, y: 16 })),
    ],
    households: [
      {
        ...world.households[0]!,
        cash: 17,
        employedWorkers: 2,
        lastIncome: 4,
        lastFoodExpense: 1,
        foodShortageReason: "delivery-pending",
        livelihoodLedger: [
          {
            id: "2:wage:0",
            tick: 2,
            kind: "wage",
            amount: 4,
            balanceAfter: 18,
          },
          {
            id: "2:food-order:0",
            tick: 2,
            kind: "food-order",
            amount: -1,
            balanceAfter: 17,
          },
        ],
      },
    ],
    householdFoodOrders: [
      {
        houseId: 1,
        marketId: 3,
        cropType: "wheat",
        foodQuality: "bland",
        price: 1,
        placedAtTick: 2,
        arrivesAtTick: 3,
      },
    ],
    economy: {
      treasury: 499,
      taxRate: "standard",
      lastTaxRevenue: 0,
      lastPayroll: 4,
      taxableHouses: 0,
      sentiment: 50,
      lastTradeRevenue: 0,
      foodOrderEscrow: 1,
    },
  };
}

function legacyHouse(x = 10, y = 10) {
  return {
    id: 1,
    typeId: "house" as const,
    x,
    y,
    rotation: 0 as const,
    footprint: { width: 2 as const, height: 2 as const },
  };
}

async function writeRawAutosave(
  databaseName: string,
  envelope: unknown,
): Promise<void> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction("saves", "readwrite");
    transaction.objectStore("saves").put({
      id: "autosave",
      envelope,
      savedAt: new Date().toISOString(),
    });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function inspectDatabase(databaseName: string) {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const result = await new Promise<{ active: unknown; quarantined: unknown[] }>(
    (resolve, reject) => {
      const transaction = database.transaction(
        ["saves", "quarantine"],
        "readonly",
      );
      const activeRequest = transaction.objectStore("saves").get("autosave");
      const quarantineRequest = transaction.objectStore("quarantine").getAll();
      transaction.oncomplete = () =>
        resolve({
          active: activeRequest.result,
          quarantined: quarantineRequest.result,
        });
      transaction.onerror = () => reject(transaction.error);
    },
  );
  database.close();
  return result;
}

describe("自动存档", () => {
  it("保存后从同一个数据库重新打开，可以完整恢复世界", async () => {
    const databaseName = `empire-valid-${crypto.randomUUID()}`;
    const firstStore = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });
    const savedWorld = worldWithOneHouse();

    await firstStore.save(savedWorld);
    firstStore.close();
    const reopenedStore = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });

    await expect(reopenedStore.load()).resolves.toEqual({
      status: "loaded",
      snapshot: savedWorld,
    });
    reopenedStore.close();
    const databaseState = await inspectDatabase(databaseName);
    expect(databaseState.active).toMatchObject({
      envelope: { saveFormatVersion: 8 },
    });
  });

  it("v7 城门两侧城墙保存后可精确恢复", async () => {
    const databaseName = `empire-v7-walls-${crypto.randomUUID()}`;
    const savedWorld: WorldSnapshot = {
      ...worldWithOneHouse(),
      revision: 2,
      walls: [
        { x: 0, y: 14 },
        { x: 0, y: 16 },
      ],
    };
    const store = new GameSaveStore({ databaseName, indexedDB, IDBKeyRange });

    await store.save(savedWorld);
    store.close();
    const reopened = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });

    await expect(reopened.load()).resolves.toEqual({
      status: "loaded",
      snapshot: savedWorld,
    });
    reopened.close();
    const databaseState = await inspectDatabase(databaseName);
    expect(databaseState.active).toMatchObject({
      envelope: { saveFormatVersion: 8, world: { walls: savedWorld.walls } },
    });
  });

  it("v7 施工阶段与流民位置保存后可精确恢复", async () => {
    const databaseName = `empire-v7-construction-${crypto.randomUUID()}`;
    const savedWorld: WorldSnapshot = {
      map: { width: 32, height: 32 },
      terrain: { ...DEFAULT_TERRAIN_CONTRACT },
      tick: 3,
      revision: 6,
      buildings: [
        {
          id: 1,
          typeId: "house",
          x: 1,
          y: 14,
          rotation: 0,
          footprint: { width: 2, height: 2 },
          level: 1,
          constructionStage: 2,
        },
      ],
      roads: [{ x: 0, y: 15 }],
      walls: [],
      households: [],
      migrants: [{ houseId: 1, x: 0, y: 15, state: "building" }],
    };
    const store = new GameSaveStore({ databaseName, indexedDB, IDBKeyRange });

    await store.save(savedWorld);
    store.close();
    const reopened = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });

    await expect(reopened.load()).resolves.toEqual({
      status: "loaded",
      snapshot: savedWorld,
    });
    reopened.close();
  });

  it("v7 水井、二级住宅和住户口粮保存后可完整恢复", async () => {
    const databaseName = `empire-v7-upgraded-${crypto.randomUUID()}`;
    const savedWorld = worldWithWateredUpgradedHouse();
    const firstStore = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });

    await firstStore.save(savedWorld);
    firstStore.close();
    const reopenedStore = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });

    await expect(reopenedStore.load()).resolves.toEqual({
      status: "loaded",
      snapshot: savedWorld,
    });
    reopenedStore.close();
    const databaseState = await inspectDatabase(databaseName);
    expect(databaseState.active).toMatchObject({
      envelope: {
        saveFormatVersion: 8,
        world: savedWorld,
      },
    });
    expect(databaseState.quarantined).toEqual([]);
  });

  it("v7 家庭钱袋、流水和在途口粮订单保存后可完整恢复", async () => {
    const databaseName = `empire-v7-livelihood-${crypto.randomUUID()}`;
    const savedWorld = worldWithPendingLivelihoodOrder();
    const store = new GameSaveStore({ databaseName, indexedDB, IDBKeyRange });

    await store.save(savedWorld);
    store.close();
    const reopened = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });

    await expect(reopened.load()).resolves.toEqual({
      status: "loaded",
      snapshot: savedWorld,
    });
    reopened.close();
  });

  it("v7 农场、粮仓和市场各自库存保存后可完整恢复", async () => {
    const databaseName = `empire-v7-food-stock-${crypto.randomUUID()}`;
    const savedWorld = worldWithFoodBuildings();
    const firstStore = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });

    await firstStore.save(savedWorld);
    firstStore.close();
    const reopenedStore = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });

    await expect(reopenedStore.load()).resolves.toEqual({
      status: "loaded",
      snapshot: savedWorld,
    });
    reopenedStore.close();
    const databaseState = await inspectDatabase(databaseName);
    expect(databaseState.active).toMatchObject({
      envelope: {
        saveFormatVersion: 8,
        world: savedWorld,
      },
    });
    expect(databaseState.quarantined).toEqual([]);
  });

  it("合法 frozen v3 原位迁移为 v7 并为 10 人住户补口粮", async () => {
    const databaseName = `empire-v3-to-v6-${crypto.randomUUID()}`;
    const initialStore = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });
    await expect(initialStore.load()).resolves.toEqual({ status: "empty" });
    initialStore.close();
    const currentWorld = worldWithWateredUpgradedHouse();
    const frozenV3World = {
      map: currentWorld.map,
      tick: currentWorld.tick,
      revision: currentWorld.revision,
      buildings: currentWorld.buildings.map((building) => {
        if (building.typeId !== "house") return building;
        return {
          id: building.id,
          typeId: building.typeId,
          x: building.x,
          y: building.y,
          rotation: building.rotation,
          footprint: { ...building.footprint },
          level: building.level,
        };
      }),
      roads: currentWorld.roads,
      households: currentWorld.households.map(({ houseId, residents }) => ({
        houseId,
        residents,
      })),
    };
    const expectedMigratedWorld = {
      ...currentWorld,
      households: currentWorld.households.map((household) => ({
        ...household,
        foodReserveTicks: 3 as const,
        ...householdLivelihoodDefaults,
      })),
    };
    await writeRawAutosave(databaseName, {
      saveFormatVersion: 3,
      world: frozenV3World,
    });

    const reopenedStore = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });
    await expect(reopenedStore.load()).resolves.toEqual({
      status: "loaded",
      snapshot: expectedMigratedWorld,
    });
    reopenedStore.close();

    const databaseState = await inspectDatabase(databaseName);
    expect(databaseState.quarantined).toEqual([]);
    expect(databaseState.active).toMatchObject({
      envelope: {
        saveFormatVersion: 8,
        world: expectedMigratedWorld,
      },
    });
  });

  it("合法 frozen v4 首次载入时补口粮并原位回写为 v7", async () => {
    const databaseName = `empire-v4-to-v6-${crypto.randomUUID()}`;
    const initialStore = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });
    await expect(initialStore.load()).resolves.toEqual({ status: "empty" });
    initialStore.close();
    const currentWorld = worldWithWateredUpgradedHouse();
    const frozenV4World = {
      map: currentWorld.map,
      tick: currentWorld.tick,
      revision: currentWorld.revision,
      buildings: currentWorld.buildings.map((building) => {
        if (building.typeId !== "house") return building;
        return {
          id: building.id,
          typeId: building.typeId,
          x: building.x,
          y: building.y,
          rotation: building.rotation,
          footprint: { ...building.footprint },
          level: building.level,
        };
      }),
      roads: currentWorld.roads,
      households: currentWorld.households.map(({ houseId, residents }) => ({
        houseId,
        residents,
      })),
    };
    const expectedWorld = {
      ...currentWorld,
      households: currentWorld.households.map((household) => ({
        ...household,
        foodReserveTicks: 3 as const,
        ...householdLivelihoodDefaults,
      })),
    };
    await writeRawAutosave(databaseName, {
      saveFormatVersion: 4,
      world: frozenV4World,
    });

    const reopenedStore = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });
    await expect(reopenedStore.load()).resolves.toEqual({
      status: "loaded",
      snapshot: expectedWorld,
    });
    reopenedStore.close();

    const databaseState = await inspectDatabase(databaseName);
    expect(databaseState.quarantined).toEqual([]);
    expect(databaseState.active).toMatchObject({
      envelope: { saveFormatVersion: 8, world: expectedWorld },
    });
  });

  it("合法 v1 存档会迁移而不是隔离", async () => {
    const databaseName = `empire-v1-${crypto.randomUUID()}`;
    const initialStore = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });
    await expect(initialStore.load()).resolves.toEqual({ status: "empty" });
    initialStore.close();
    const currentWorld = worldWithOneHouse();
    const legacyEnvelope = {
      saveFormatVersion: 1,
      world: {
        map: currentWorld.map,
        tick: currentWorld.tick,
        revision: currentWorld.revision,
        buildings: [legacyHouse()],
      },
    };
    await writeRawAutosave(databaseName, legacyEnvelope);

    const reopenedStore = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });
    await expect(reopenedStore.load()).resolves.toEqual({
      status: "loaded",
      snapshot: currentWorld,
    });
    reopenedStore.close();
    const databaseState = await inspectDatabase(databaseName);
    expect(databaseState.quarantined).toEqual([]);
    expect(databaseState.active).toMatchObject({
      envelope: { saveFormatVersion: 8 },
    });
  });

  it("v1 住宅压住后来保留的城门格时迁到最近空地而不是隔离", async () => {
    const databaseName = `empire-v1-gate-${crypto.randomUUID()}`;
    const initialStore = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });
    await expect(initialStore.load()).resolves.toEqual({ status: "empty" });
    initialStore.close();
    await writeRawAutosave(databaseName, {
      saveFormatVersion: 1,
      world: {
        map: { width: 32, height: 32 },
        tick: 7,
        revision: 1,
        buildings: [legacyHouse(0, 14)],
      },
    });

    const reopenedStore = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });
    await expect(reopenedStore.load()).resolves.toMatchObject({
      status: "loaded",
      snapshot: {
        tick: 7,
        revision: 1,
        buildings: [{ id: 1, x: 1, y: 14, level: 1 }],
      },
    });
    reopenedStore.close();

    const databaseState = await inspectDatabase(databaseName);
    expect(databaseState.quarantined).toEqual([]);
    expect(databaseState.active).toMatchObject({
      envelope: {
        saveFormatVersion: 8,
        world: { buildings: [{ id: 1, x: 1, y: 14, level: 1 }] },
      },
    });
  });

  it("合法 v2 存档迁移为 v7 并原位回写，保留道路且补住户口粮", async () => {
    const databaseName = `empire-v2-${crypto.randomUUID()}`;
    const initialStore = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });
    await expect(initialStore.load()).resolves.toEqual({ status: "empty" });
    initialStore.close();
    const legacyEnvelope = {
      saveFormatVersion: 2,
      world: {
        map: { width: 32, height: 32 },
        tick: 3,
        revision: 4,
        buildings: [legacyHouse(1, 14)],
        roads: [{ x: 0, y: 15 }],
        households: [{ houseId: 1, residents: 5 }],
      },
    } as const;
    await writeRawAutosave(databaseName, legacyEnvelope);

    const reopenedStore = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });
    const expectedWorld: WorldSnapshot = {
      map: { ...legacyEnvelope.world.map },
      terrain: { ...DEFAULT_TERRAIN_CONTRACT },
      tick: legacyEnvelope.world.tick,
      revision: legacyEnvelope.world.revision,
      buildings: [
        {
          ...legacyEnvelope.world.buildings[0],
          level: 1,
          constructionStage: 4,
        },
      ],
      roads: legacyEnvelope.world.roads.map((road) => ({ ...road })),
      walls: [],
      households: legacyEnvelope.world.households.map((household) => ({
        ...household,
        foodReserveTicks: 3,
        foodQuality: "bland",
        ...householdLivelihoodDefaults,
      })),
      migrants: [],
    };
    await expect(reopenedStore.load()).resolves.toEqual({
      status: "loaded",
      snapshot: expectedWorld,
    });
    reopenedStore.close();

    const databaseState = await inspectDatabase(databaseName);
    expect(databaseState.quarantined).toEqual([]);
    expect(databaseState.active).toMatchObject({
      envelope: {
        saveFormatVersion: 8,
        world: expectedWorld,
      },
    });
  });

  it("较低 revision 的迟到保存不能覆盖较新世界", async () => {
    const databaseName = `empire-revision-${crypto.randomUUID()}`;
    const store = new GameSaveStore({ databaseName, indexedDB, IDBKeyRange });
    const older = worldWithOneHouse();
    const newer = {
      ...worldWithOneHouse(),
      revision: 2,
      roads: [{ x: 0, y: 15 }],
    };

    await store.save(newer);
    await store.save(older);

    await expect(store.load()).resolves.toEqual({
      status: "loaded",
      snapshot: newer,
    });
    store.close();
  });

  it("两个标签从同一 revision 分叉时返回冲突且后续不能静默覆盖", async () => {
    const databaseName = `empire-tab-conflict-${crypto.randomUUID()}`;
    const firstTab = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });
    const secondTab = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });
    await expect(firstTab.load()).resolves.toEqual({ status: "empty" });
    await expect(secondTab.load()).resolves.toEqual({ status: "empty" });
    const firstBranch = worldWithOneHouse();
    const secondBranch = {
      ...worldWithOneHouse(),
      buildings: [{ ...worldWithOneHouse().buildings[0], x: 20, y: 20 }],
    };

    await expect(firstTab.saveIfNewer(firstBranch)).resolves.toEqual({
      status: "saved",
      revision: 1,
    });
    await expect(secondTab.saveIfNewer(secondBranch)).resolves.toEqual({
      status: "conflict",
      revision: 1,
      storedRevision: 1,
    });
    await expect(
      secondTab.saveIfNewer({ ...secondBranch, revision: 2 }),
    ).resolves.toEqual({
      status: "conflict",
      revision: 2,
      storedRevision: 1,
    });
    await expect(firstTab.load()).resolves.toEqual({
      status: "loaded",
      snapshot: firstBranch,
    });
    firstTab.close();
    secondTab.close();
  });

  it("坏档恢复与新 revision 并发时不会删除有效新存档", async () => {
    const databaseName = `empire-load-save-race-${crypto.randomUUID()}`;
    const initialStore = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });
    await expect(initialStore.load()).resolves.toEqual({ status: "empty" });
    initialStore.close();
    await writeRawAutosave(databaseName, {
      saveFormatVersion: 999,
      world: { broken: true },
    });

    const loader = new GameSaveStore({ databaseName, indexedDB, IDBKeyRange });
    const saver = new GameSaveStore({ databaseName, indexedDB, IDBKeyRange });
    const newest = { ...worldWithOneHouse(), revision: 5 };
    await Promise.all([loader.load(), saver.saveIfNewer(newest)]);

    await expect(saver.load()).resolves.toEqual({
      status: "loaded",
      snapshot: newest,
    });
    loader.close();
    saver.close();
  });

  it("v4 农场库存超过容量的坏档会保留原文并隔离", async () => {
    const databaseName = `empire-v4-stock-corrupt-${crypto.randomUUID()}`;
    const initialStore = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });
    await expect(initialStore.load()).resolves.toEqual({ status: "empty" });
    initialStore.close();
    const corruptEnvelope = {
      saveFormatVersion: 4,
      world: {
        map: { width: 32, height: 32 },
        tick: 3,
        revision: 6,
        buildings: [
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
        roads: [],
        households: [],
      },
    };
    await writeRawAutosave(databaseName, corruptEnvelope);

    const reopenedStore = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });
    await expect(reopenedStore.load()).resolves.toEqual({
      status: "recovered-from-corrupt-save",
    });
    reopenedStore.close();

    const databaseState = await inspectDatabase(databaseName);
    expect(databaseState.active).toBeUndefined();
    expect(databaseState.quarantined).toHaveLength(1);
    expect(databaseState.quarantined[0]).toMatchObject({
      sourceId: "autosave",
      envelope: corruptEnvelope,
    });
  });

  it("v5 市场库存超过容量的坏档会保留原文并隔离", async () => {
    const databaseName = `empire-v5-market-corrupt-${crypto.randomUUID()}`;
    const initialStore = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });
    await expect(initialStore.load()).resolves.toEqual({ status: "empty" });
    initialStore.close();
    const corruptEnvelope = {
      saveFormatVersion: 5,
      world: {
        map: { width: 32, height: 32 },
        tick: 3,
        revision: 6,
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
    };
    await writeRawAutosave(databaseName, corruptEnvelope);

    const reopenedStore = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });
    await expect(reopenedStore.load()).resolves.toEqual({
      status: "recovered-from-corrupt-save",
    });
    reopenedStore.close();

    const databaseState = await inspectDatabase(databaseName);
    expect(databaseState.active).toBeUndefined();
    expect(databaseState.quarantined).toHaveLength(1);
    expect(databaseState.quarantined[0]).toMatchObject({
      sourceId: "autosave",
      envelope: corruptEnvelope,
    });
  });

  it("损坏存档被隔离并返回可恢复的新游戏状态", async () => {
    const databaseName = `empire-corrupt-${crypto.randomUUID()}`;
    const initialStore = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });
    await expect(initialStore.load()).resolves.toEqual({ status: "empty" });
    initialStore.close();
    const corruptEnvelope = {
      saveFormatVersion: 999,
      world: worldWithOneHouse(),
    };
    await writeRawAutosave(databaseName, corruptEnvelope);

    const reopenedStore = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });

    await expect(reopenedStore.load()).resolves.toEqual({
      status: "recovered-from-corrupt-save",
    });
    reopenedStore.close();
    const databaseState = await inspectDatabase(databaseName);
    expect(databaseState.active).toBeUndefined();
    expect(databaseState.quarantined).toHaveLength(1);
    expect(databaseState.quarantined[0]).toMatchObject({
      sourceId: "autosave",
      envelope: corruptEnvelope,
    });
  });

  it("版本正确但世界语义损坏的存档同样会被隔离", async () => {
    const databaseName = `empire-semantic-corrupt-${crypto.randomUUID()}`;
    const initialStore = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });
    await expect(initialStore.load()).resolves.toEqual({ status: "empty" });
    initialStore.close();
    const semanticCorruptEnvelope = {
      saveFormatVersion: 1,
      world: {
        map: { width: 32, height: 32 },
        tick: 0,
        revision: 1,
        buildings: [legacyHouse(), { ...legacyHouse(), id: 2, x: 11, y: 11 }],
      },
    };
    await writeRawAutosave(databaseName, semanticCorruptEnvelope);

    const reopenedStore = new GameSaveStore({
      databaseName,
      indexedDB,
      IDBKeyRange,
    });
    await expect(reopenedStore.load()).resolves.toEqual({
      status: "recovered-from-corrupt-save",
    });
    reopenedStore.close();

    const databaseState = await inspectDatabase(databaseName);
    expect(databaseState.active).toBeUndefined();
    expect(databaseState.quarantined).toHaveLength(1);
  });
});
