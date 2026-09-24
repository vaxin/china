import { describe, expect, it } from "vitest";

import {
  advanceTicks,
  applyCommand,
  createWorld,
  snapshotWorld,
} from "./index";

type World = ReturnType<typeof createWorld>;

function build(
  world: World,
  buildingTypeId: "house" | "well" | "farm" | "granary" | "market",
  x: number,
  y: number,
) {
  const application = applyCommand(world, {
    seq: world.revision + 1,
    type: "build",
    buildingTypeId,
    x,
    y,
    rotation: 0,
    ...(buildingTypeId === "farm" ? { cropType: "wheat" as const } : {}),
  });
  if (buildingTypeId === "house") {
    const house = world.buildings.find(
      (building) =>
        building.typeId === "house" && building.x === x && building.y === y,
    );
    if (house?.typeId === "house") house.constructionStage = 4;
  }
  return application;
}

function road(world: World, tiles: Array<{ x: number; y: number }>) {
  return applyCommand(world, {
    seq: world.revision + 1,
    type: "build-road-path",
    tiles,
  });
}

function stocks(world: World) {
  return snapshotWorld(world)
    .buildings.filter(
      (building) =>
        building.typeId === "farm" ||
        building.typeId === "granary" ||
        building.typeId === "market",
    )
    .map((building) => ({
      typeId: building.typeId,
      foodStock: building.foodStock,
    }));
}

describe("市场建造", () => {
  it("合法空地生成全局 ID 的 2×2 空市场", () => {
    const world = createWorld();

    expect(build(world, "market", 5, 5).result).toMatchObject({
      accepted: true,
      revision: 1,
    });
    expect(snapshotWorld(world).buildings).toEqual([
      {
        id: 1,
        typeId: "market",
        x: 5,
        y: 5,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        foodStock: 0,
        foodStocks: { wheat: 0, soybean: 0, rice: 0, millet: 0, cabbage: 0 },
        clothingStock: 0,
      },
    ]);
  });

  it("市场压道路、建筑、城门或越界时原子拒绝", () => {
    const world = createWorld();
    road(world, [{ x: 5, y: 5 }]);
    const before = snapshotWorld(world);

    expect(build(world, "market", 5, 5).result).toMatchObject({
      accepted: false,
      reasonCode: "occupied",
    });
    expect(snapshotWorld(world)).toEqual(before);
    expect(build(createWorld(), "market", 0, 14).result).toMatchObject({
      accepted: false,
      reasonCode: "occupied",
    });
    expect(build(createWorld(), "market", 63, 63).result).toMatchObject({
      accepted: false,
      reasonCode: "out-of-bounds",
    });
  });
});

describe("市场补货与住宅口粮", () => {
  it("同 tick 新产粮可从农场经粮仓进入市场", () => {
    const world = createWorld();
    build(world, "farm", 1, 11);
    build(world, "granary", 1, 14);
    build(world, "market", 1, 17);
    road(
      world,
      Array.from({ length: 6 }, (_, index) => ({ x: 0, y: index + 12 })),
    );

    advanceTicks(world, 6);

    expect(stocks(world)).toEqual([
      { typeId: "farm", foodStock: 0 },
      { typeId: "granary", foodStock: 0 },
      { typeId: "market", foodStock: 1 },
    ]);
  });

  it.each([
    ["范围末格", 13, 13, 0, 1],
    ["超出一格", 14, 14, 1, 0],
  ])(
    "粮仓到市场%s按道路距离 12/13 正确判定",
    (_name, marketX, lastRoadX, granaryStock, marketStock) => {
      const world = createWorld();
      build(world, "granary", 0, 0);
      build(world, "market", marketX, 3);
      const granary = world.buildings.find(
        (building) => building.typeId === "granary",
      );
      if (!granary || granary.typeId !== "granary") {
        throw new Error("测试粮仓不存在");
      }
      granary.foodStock = 1;
      granary.foodStocks.millet = 1;
      road(
        world,
        Array.from({ length: lastRoadX }, (_, index) => ({
          x: index + 1,
          y: 2,
        })),
      );

      advanceTicks(world, 1);

      expect(stocks(world)).toEqual([
        { typeId: "granary", foodStock: granaryStock },
        { typeId: "market", foodStock: marketStock },
      ]);
    },
  );

  it("每市场每 tick 最多补一粮且库存不超过四", () => {
    const world = createWorld();
    build(world, "granary", 1, 14);
    build(world, "market", 1, 17);
    road(world, [
      { x: 0, y: 15 },
      { x: 0, y: 16 },
      { x: 0, y: 17 },
    ]);
    const granary = world.buildings.find(
      (building) => building.typeId === "granary",
    );
    if (!granary || granary.typeId !== "granary") {
      throw new Error("测试粮仓不存在");
    }
    granary.foodStock = 4;
    granary.foodStocks.millet = 4;

    advanceTicks(world, 1);
    expect(stocks(world)).toEqual([
      { typeId: "granary", foodStock: 3 },
      { typeId: "market", foodStock: 1 },
    ]);
    advanceTicks(world, 3);
    granary.foodStock = 1;
    granary.foodStocks.millet = 1;
    advanceTicks(world, 1);
    expect(stocks(world)).toEqual([
      { typeId: "granary", foodStock: 1 },
      { typeId: "market", foodStock: 4 },
    ]);
  });

  it("一份粮仓库存只由 ID 较小的可达市场领取一次", () => {
    const world = createWorld();
    build(world, "granary", 1, 14);
    build(world, "market", 1, 17);
    build(world, "market", 4, 14);
    road(world, [
      { x: 0, y: 15 },
      { x: 0, y: 16 },
      { x: 1, y: 16 },
      { x: 2, y: 16 },
      { x: 3, y: 16 },
      { x: 4, y: 16 },
    ]);
    const granary = world.buildings.find(
      (building) => building.typeId === "granary",
    );
    if (!granary || granary.typeId !== "granary") {
      throw new Error("测试粮仓不存在");
    }
    granary.foodStock = 1;
    granary.foodStocks.millet = 1;
    world.buildings.reverse();

    advanceTicks(world, 1);

    expect(snapshotWorld(world).buildings).toMatchObject([
      { id: 1, typeId: "granary", foodStock: 0 },
      { id: 2, typeId: "market", foodStock: 1 },
      { id: 3, typeId: "market", foodStock: 0 },
    ]);
  });

  it("市场优先从道路更近的粮仓补货，再以粮仓 ID 打破平局", () => {
    const nearestWorld = createWorld();
    build(nearestWorld, "granary", 1, 14);
    build(nearestWorld, "granary", 4, 20);
    build(nearestWorld, "market", 4, 17);
    road(nearestWorld, [
      { x: 1, y: 16 },
      { x: 2, y: 16 },
      { x: 3, y: 16 },
      { x: 4, y: 16 },
    ]);
    road(nearestWorld, [{ x: 4, y: 19 }]);
    for (const granary of nearestWorld.buildings.filter(
      (building) => building.typeId === "granary",
    )) {
      if (granary.typeId === "granary") {
        granary.foodStock = 1;
        granary.foodStocks.millet = 1;
      }
    }

    advanceTicks(nearestWorld, 1);

    expect(snapshotWorld(nearestWorld).buildings).toMatchObject([
      { id: 1, typeId: "granary", foodStock: 1 },
      { id: 2, typeId: "granary", foodStock: 0 },
      { id: 3, typeId: "market", foodStock: 1 },
    ]);

    const tiedWorld = createWorld();
    build(tiedWorld, "granary", 2, 14);
    build(tiedWorld, "granary", 6, 14);
    build(tiedWorld, "market", 4, 17);
    road(tiedWorld, [
      { x: 3, y: 16 },
      { x: 4, y: 16 },
      { x: 5, y: 16 },
      { x: 6, y: 16 },
    ]);
    for (const granary of tiedWorld.buildings.filter(
      (building) => building.typeId === "granary",
    )) {
      if (granary.typeId === "granary") {
        granary.foodStock = 1;
        granary.foodStocks.millet = 1;
      }
    }
    tiedWorld.buildings.reverse();

    advanceTicks(tiedWorld, 1);

    expect(snapshotWorld(tiedWorld).buildings).toMatchObject([
      { id: 1, typeId: "granary", foodStock: 0 },
      { id: 2, typeId: "granary", foodStock: 1 },
      { id: 3, typeId: "market", foodStock: 1 },
    ]);
  });

  it("地图右边界不会环绕到下一行左边界给市场补货", () => {
    const world = createWorld();
    build(world, "granary", 30, 0);
    build(world, "market", 0, 4);
    road(world, [{ x: 31, y: 2 }]);
    road(world, [{ x: 0, y: 3 }]);
    const granary = world.buildings.find(
      (building) => building.typeId === "granary",
    );
    if (!granary || granary.typeId !== "granary") {
      throw new Error("测试粮仓不存在");
    }
    granary.foodStock = 1;
    granary.foodStocks.millet = 1;

    advanceTicks(world, 1);

    expect(stocks(world)).toEqual([
      { typeId: "granary", foodStock: 1 },
      { typeId: "market", foodStock: 0 },
    ]);
  });

  it("新住户携带三 tick 口粮，持续断供在第三个消耗 tick 降级", () => {
    const world = createWorld();
    build(world, "house", 1, 14);
    road(world, [{ x: 0, y: 15 }]);
    build(world, "well", 0, 14);

    advanceTicks(world, 1);
    expect(snapshotWorld(world)).toMatchObject({
      buildings: [{ typeId: "house", level: 1 }, { typeId: "well" }],
      households: [{ houseId: 1, residents: 5, foodReserveTicks: 3 }],
    });

    advanceTicks(world, 1);
    expect(snapshotWorld(world)).toMatchObject({
      buildings: [{ typeId: "house", level: 2 }, { typeId: "well" }],
      households: [{ houseId: 1, residents: 10, foodReserveTicks: 2 }],
    });

    advanceTicks(world, 2);
    expect(snapshotWorld(world)).toMatchObject({
      buildings: [{ typeId: "house", level: 1 }, { typeId: "well" }],
      households: [{ houseId: 1, residents: 5, foodReserveTicks: 0 }],
    });
  });

  it.each([
    ["服务范围末格", 9, 9, 0, 0],
    ["超出服务范围一格", 10, 10, 1, 0],
  ])(
    "市场到住宅%s按道路距离 8/9 正确判定是否生成在途订单",
    (_name, houseX, roadLength, marketStock, reserve) => {
      const world = createWorld();
      build(world, "market", 0, 17);
      build(world, "house", houseX, 14);
      road(world, [
        { x: 0, y: 15 },
        { x: 0, y: 16 },
        ...Array.from({ length: roadLength }, (_, index) => ({
          x: index + 1,
          y: 16,
        })),
      ]);
      advanceTicks(world, 1);
      const market = world.buildings.find(
        (building) => building.typeId === "market",
      );
      if (!market || market.typeId !== "market") {
        throw new Error("测试市场不存在");
      }
      market.foodStock = 1;
      market.foodStocks.millet = 1;
      world.households[0].foodReserveTicks = 0;

      advanceTicks(world, 1);

      expect(stocks(world)).toEqual([
        { typeId: "market", foodStock: marketStock },
      ]);
      expect(snapshotWorld(world).households).toMatchObject([
        { houseId: 2, foodReserveTicks: reserve },
      ]);
      expect(snapshotWorld(world).householdFoodOrders ?? []).toHaveLength(
        marketStock === 0 ? 1 : 0,
      );
    },
  );

  it("每市场每 tick 只配送一户并优先最近住宅", () => {
    const world = createWorld();
    build(world, "market", 0, 17);
    build(world, "house", 5, 14);
    build(world, "house", 9, 14);
    road(world, [
      { x: 0, y: 15 },
      { x: 0, y: 16 },
      ...Array.from({ length: 9 }, (_, index) => ({ x: index + 1, y: 16 })),
    ]);
    advanceTicks(world, 1);
    const market = world.buildings.find(
      (building) => building.typeId === "market",
    );
    if (!market || market.typeId !== "market") {
      throw new Error("测试市场不存在");
    }
    market.foodStock = 2;
    market.foodStocks.millet = 2;
    for (const household of world.households) {
      household.foodReserveTicks = 0;
      household.foodQuality = "none";
    }
    world.households.reverse();

    advanceTicks(world, 1);

    expect(snapshotWorld(world).households).toMatchObject([
      {
        houseId: 2,
        residents: 5,
        foodReserveTicks: 0,
        foodQuality: "none",
        foodShortageReason: "delivery-pending",
      },
      {
        houseId: 3,
        residents: 5,
        foodReserveTicks: 0,
        foodQuality: "none",
      },
    ]);
    expect(stocks(world)).toEqual([{ typeId: "market", foodStock: 1 }]);
    expect(snapshotWorld(world).householdFoodOrders).toMatchObject([
      { houseId: 2, marketId: 1 },
    ]);
  });

  it("市场缺席时，饥饿住户会沿路从可达粮仓取得一份真实粮食", () => {
    const world = createWorld();
    build(world, "house", 1, 14);
    build(world, "granary", 4, 14);
    road(world, [
      { x: 0, y: 15 },
      { x: 0, y: 16 },
      { x: 1, y: 16 },
      { x: 2, y: 16 },
      { x: 3, y: 16 },
      { x: 4, y: 16 },
    ]);
    advanceTicks(world, 1);
    const granary = world.buildings.find(
      (building) => building.typeId === "granary",
    );
    if (!granary || granary.typeId !== "granary") {
      throw new Error("测试粮仓不存在");
    }
    granary.foodStock = 1;
    granary.foodStocks.millet = 1;
    world.households[0]!.foodReserveTicks = 0;
    world.households[0]!.foodQuality = "none";

    advanceTicks(world, 1);

    expect(stocks(world)).toEqual([{ typeId: "granary", foodStock: 0 }]);
    expect(snapshotWorld(world).households).toMatchObject([
      { houseId: 1, foodReserveTicks: 3, foodQuality: "bland" },
    ]);
  });

  it("粮仓道路断开时，饥饿住户不会隔空取得粮食", () => {
    const world = createWorld();
    build(world, "house", 1, 14);
    build(world, "granary", 4, 14);
    road(world, [{ x: 0, y: 15 }]);
    advanceTicks(world, 1);
    const granary = world.buildings.find(
      (building) => building.typeId === "granary",
    );
    if (!granary || granary.typeId !== "granary") {
      throw new Error("测试粮仓不存在");
    }
    granary.foodStock = 1;
    granary.foodStocks.millet = 1;
    world.households[0]!.foodReserveTicks = 0;
    world.households[0]!.foodQuality = "none";

    advanceTicks(world, 1);

    expect(stocks(world)).toEqual([{ typeId: "granary", foodStock: 1 }]);
    expect(snapshotWorld(world).households).toMatchObject([
      { houseId: 1, foodReserveTicks: 0, foodQuality: "none" },
    ]);
  });

  it("生产、入仓和下单在同 tick 完成，下一 tick 配送并升级住宅", () => {
    const world = createWorld();
    build(world, "house", 1, 14);
    build(world, "well", 0, 14);
    build(world, "market", 4, 14);
    build(world, "farm", 1, 18);
    build(world, "granary", 4, 18);
    road(world, [
      { x: 0, y: 15 },
      { x: 0, y: 16 },
      { x: 1, y: 16 },
      { x: 2, y: 16 },
      { x: 3, y: 16 },
      { x: 4, y: 16 },
      { x: 4, y: 17 },
      { x: 3, y: 17 },
      { x: 3, y: 18 },
    ]);
    advanceTicks(world, 1);
    world.tick = 5;
    world.households = [
      {
        houseId: 1,
        residents: 10,
        foodReserveTicks: 1,
        foodQuality: "bland",
      },
    ];
    const house = world.buildings.find(
      (building) => building.typeId === "house",
    );
    if (!house || house.typeId !== "house") throw new Error("测试住宅不存在");
    house.level = 2;
    const revisionBefore = world.revision;

    advanceTicks(world, 1);

    expect(snapshotWorld(world)).toMatchObject({
      tick: 6,
      buildings: [
        { typeId: "house", level: 1 },
        { typeId: "well" },
        { typeId: "market", foodStock: 0 },
        { typeId: "farm", foodStock: 0 },
        { typeId: "granary", foodStock: 0 },
      ],
      households: [{ houseId: 1, residents: 5, foodReserveTicks: 0 }],
      householdFoodOrders: [{ houseId: 1, marketId: 3 }],
    });

    advanceTicks(world, 1);

    expect(snapshotWorld(world)).toMatchObject({
      tick: 7,
      revision: revisionBefore + 2,
      buildings: [
        { typeId: "house", level: 2 },
        { typeId: "well" },
        { typeId: "market", foodStock: 0 },
        { typeId: "farm", foodStock: 0 },
        { typeId: "granary", foodStock: 0 },
      ],
      households: [{ houseId: 1, residents: 10, foodReserveTicks: 3 }],
    });
  });

  it("拆市场删除本地库存但保留住户已持有口粮", () => {
    const world = createWorld();
    build(world, "house", 1, 14);
    build(world, "market", 4, 14);
    road(world, [{ x: 0, y: 15 }]);
    advanceTicks(world, 1);
    const reserveBefore = world.households[0].foodReserveTicks;

    applyCommand(world, {
      seq: 20,
      type: "demolish",
      x: 4,
      y: 14,
    });

    expect(snapshotWorld(world)).toMatchObject({
      buildings: [{ typeId: "house" }],
      households: [
        { houseId: 1, residents: 5, foodReserveTicks: reserveBefore },
      ],
    });
  });

  it("切断配送路后按口粮宽限降级，补路下一 tick 自愈", () => {
    const world = createWorld();
    build(world, "house", 1, 14);
    build(world, "well", 0, 14);
    build(world, "market", 4, 14);
    road(world, [
      { x: 0, y: 15 },
      { x: 0, y: 16 },
      { x: 1, y: 16 },
      { x: 2, y: 16 },
      { x: 3, y: 16 },
      { x: 4, y: 16 },
    ]);
    advanceTicks(world, 1);
    const market = world.buildings.find(
      (building) => building.typeId === "market",
    );
    if (!market || market.typeId !== "market") {
      throw new Error("测试市场不存在");
    }
    market.foodStock = 1;
    market.foodStocks.millet = 1;
    world.households[0].foodReserveTicks = 1;
    applyCommand(world, {
      seq: 30,
      type: "demolish",
      x: 4,
      y: 16,
    });

    advanceTicks(world, 1);
    expect(snapshotWorld(world)).toMatchObject({
      buildings: [
        { typeId: "house", level: 1 },
        { typeId: "well" },
        { typeId: "market", foodStock: 1 },
      ],
      households: [{ houseId: 1, residents: 5, foodReserveTicks: 0 }],
    });

    road(world, [{ x: 4, y: 16 }]);
    advanceTicks(world, 2);
    expect(snapshotWorld(world)).toMatchObject({
      buildings: [
        { typeId: "house", level: 2 },
        { typeId: "well" },
        { typeId: "market", foodStock: 0 },
      ],
      households: [{ houseId: 1, residents: 10, foodReserveTicks: 3 }],
    });
  });

  it("安全区间批量推进与逐 tick 推进得到完全相同快照", () => {
    const prepare = () => {
      const world = createWorld();
      build(world, "house", 1, 14);
      build(world, "well", 0, 14);
      build(world, "market", 4, 14);
      build(world, "farm", 1, 18);
      build(world, "granary", 4, 18);
      road(world, [
        { x: 0, y: 15 },
        { x: 0, y: 16 },
        { x: 1, y: 16 },
        { x: 2, y: 16 },
        { x: 3, y: 16 },
        { x: 4, y: 16 },
        { x: 4, y: 17 },
        { x: 3, y: 17 },
        { x: 3, y: 18 },
      ]);
      return world;
    };
    const batched = prepare();
    const stepped = prepare();

    advanceTicks(batched, 9);
    for (let index = 0; index < 9; index += 1) advanceTicks(stepped, 1);

    expect(snapshotWorld(batched)).toEqual(snapshotWorld(stepped));
  });

  it("口粮变化超过剩余 revision 容量时整批原子拒绝", () => {
    const world = createWorld();
    build(world, "house", 1, 14);
    road(world, [{ x: 0, y: 15 }]);
    advanceTicks(world, 1);
    world.revision = Number.MAX_SAFE_INTEGER;
    const before = snapshotWorld(world);

    expect(() => advanceTicks(world, 1)).toThrow("模拟计数已耗尽");
    expect(snapshotWorld(world)).toEqual(before);
  });
});
