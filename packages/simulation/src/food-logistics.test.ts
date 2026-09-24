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
  buildingTypeId: "farm" | "granary",
  x: number,
  y: number,
) {
  return applyCommand(world, {
    seq: world.revision + 1,
    type: "build",
    buildingTypeId,
    x,
    y,
    rotation: 0,
    ...(buildingTypeId === "farm" ? { cropType: "wheat" as const } : {}),
  });
}

function road(world: World, tiles: Array<{ x: number; y: number }>) {
  return applyCommand(world, {
    seq: world.revision + 1,
    type: "build-road-path",
    tiles,
  });
}

function foodStocks(world: World) {
  return snapshotWorld(world).buildings.map((building) => ({
    typeId: building.typeId,
    foodStock: "foodStock" in building ? building.foodStock : undefined,
  }));
}

describe("农场与粮仓建造", () => {
  it("合法空地生成共享全局 ID 的 2×2 农场与粮仓", () => {
    const world = createWorld();

    expect(build(world, "farm", 5, 5).result).toMatchObject({
      accepted: true,
      revision: 1,
    });
    expect(build(world, "granary", 8, 5).result).toMatchObject({
      accepted: true,
      revision: 2,
    });

    expect(snapshotWorld(world).buildings).toEqual([
      {
        id: 1,
        typeId: "farm",
        x: 5,
        y: 5,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        foodStock: 0,
        cropType: "wheat",
      },
      {
        id: 2,
        typeId: "granary",
        x: 8,
        y: 5,
        rotation: 0,
        footprint: { width: 2, height: 2 },
        foodStock: 0,
        foodStocks: { wheat: 0, soybean: 0, rice: 0, millet: 0, cabbage: 0 },
      },
    ]);
  });

  it("生产建筑压道路、建筑、城门或越界时原子拒绝", () => {
    const roadWorld = createWorld();
    road(roadWorld, [{ x: 5, y: 5 }]);
    const roadBefore = snapshotWorld(roadWorld);
    expect(build(roadWorld, "farm", 5, 5).result).toMatchObject({
      accepted: false,
      reasonCode: "occupied",
    });
    expect(snapshotWorld(roadWorld)).toEqual(roadBefore);

    const buildingWorld = createWorld();
    build(buildingWorld, "farm", 5, 5);
    const buildingBefore = snapshotWorld(buildingWorld);
    expect(build(buildingWorld, "granary", 6, 6).result).toMatchObject({
      accepted: false,
      reasonCode: "occupied",
    });
    expect(snapshotWorld(buildingWorld)).toEqual(buildingBefore);

    expect(build(createWorld(), "farm", 0, 14).result).toMatchObject({
      accepted: false,
      reasonCode: "occupied",
    });
    expect(build(createWorld(), "granary", 63, 63).result).toMatchObject({
      accepted: false,
      reasonCode: "out-of-bounds",
    });
  });
});

describe("农场生产", () => {
  it("小麦只在七月收获并在库存 3 时停产", () => {
    const world = createWorld();
    build(world, "farm", 5, 5);

    advanceTicks(world, 5);
    expect(foodStocks(world)).toEqual([{ typeId: "farm", foodStock: 0 }]);
    advanceTicks(world, 1);
    expect(foodStocks(world)).toEqual([{ typeId: "farm", foodStock: 1 }]);
    advanceTicks(world, 24);

    expect(snapshotWorld(world)).toMatchObject({
      tick: 30,
      revision: 6,
      buildings: [{ typeId: "farm", foodStock: 3 }],
    });
  });

  it("批量推进与逐 tick 推进得到完全相同的库存和 revision", () => {
    const prepare = () => {
      const world = createWorld();
      build(world, "farm", 1, 14);
      build(world, "granary", 1, 17);
      road(world, [
        { x: 0, y: 15 },
        { x: 0, y: 16 },
        { x: 0, y: 17 },
      ]);
      return world;
    };
    const batched = prepare();
    const stepped = prepare();

    advanceTicks(batched, 9);
    for (let index = 0; index < 9; index += 1) advanceTicks(stepped, 1);

    expect(snapshotWorld(batched)).toEqual(snapshotWorld(stepped));
  });

  it("粮仓满 10 后停止接收，新产粮留在农场", () => {
    const world = createWorld();
    build(world, "farm", 1, 14);
    build(world, "granary", 1, 17);
    road(world, [
      { x: 0, y: 15 },
      { x: 0, y: 16 },
      { x: 0, y: 17 },
    ]);

    advanceTicks(world, 126);

    expect(foodStocks(world)).toEqual([
      { typeId: "farm", foodStock: 1 },
      { typeId: "granary", foodStock: 10 },
    ]);
  });
});

describe("道路粮食运输", () => {
  it("同 tick 新产粮可沿连通道路装入粮仓", () => {
    const world = createWorld();
    build(world, "farm", 1, 14);
    build(world, "granary", 1, 17);
    road(world, [
      { x: 0, y: 15 },
      { x: 0, y: 16 },
      { x: 0, y: 17 },
    ]);

    advanceTicks(world, 6);

    expect(foodStocks(world)).toEqual([
      { typeId: "farm", foodStock: 0 },
      { typeId: "granary", foodStock: 1 },
    ]);
  });

  it.each([
    ["范围末格", 13, 13, 0, 1],
    ["超出一格", 14, 14, 1, 0],
  ])(
    "%s按道路距离 12/13 正确判定",
    (_name, granaryX, lastRoadX, farmStock, granaryStock) => {
      const world = createWorld();
      build(world, "farm", 0, 0);
      build(world, "granary", granaryX, 3);
      road(
        world,
        Array.from({ length: lastRoadX }, (_, index) => ({
          x: index + 1,
          y: 2,
        })),
      );

      advanceTicks(world, 6);

      expect(foodStocks(world)).toEqual([
        { typeId: "farm", foodStock: farmStock },
        { typeId: "granary", foodStock: granaryStock },
      ]);
    },
  );

  it("无道路时农场照常生产但粮仓不收货", () => {
    const world = createWorld();
    build(world, "farm", 5, 5);
    build(world, "granary", 10, 5);

    advanceTicks(world, 6);

    expect(foodStocks(world)).toEqual([
      { typeId: "farm", foodStock: 1 },
      { typeId: "granary", foodStock: 0 },
    ]);
  });

  it("地图右边界不会环绕到下一行左边界运输", () => {
    const world = createWorld();
    build(world, "farm", 30, 0);
    build(world, "granary", 0, 4);
    road(world, [{ x: 31, y: 2 }]);
    road(world, [{ x: 0, y: 3 }]);

    advanceTicks(world, 6);

    expect(foodStocks(world)).toEqual([
      { typeId: "farm", foodStock: 1 },
      { typeId: "granary", foodStock: 0 },
    ]);
  });

  it("断路保留库存并停止运输，补路后下一 tick 自愈", () => {
    const world = createWorld();
    build(world, "farm", 1, 14);
    build(world, "granary", 1, 17);
    road(world, [
      { x: 0, y: 15 },
      { x: 0, y: 16 },
      { x: 0, y: 17 },
    ]);
    advanceTicks(world, 6);

    applyCommand(world, {
      seq: 20,
      type: "demolish",
      x: 0,
      y: 16,
    });
    advanceTicks(world, 12);
    expect(foodStocks(world)).toEqual([
      { typeId: "farm", foodStock: 1 },
      { typeId: "granary", foodStock: 1 },
    ]);

    road(world, [{ x: 0, y: 16 }]);
    advanceTicks(world, 1);
    expect(foodStocks(world)).toEqual([
      { typeId: "farm", foodStock: 0 },
      { typeId: "granary", foodStock: 2 },
    ]);
  });

  it("多来源先取最短道路，再以较小农场 ID 打破平局", () => {
    const world = createWorld();
    build(world, "farm", 1, 1);
    build(world, "farm", 1, 7);
    build(world, "granary", 7, 4);
    advanceTicks(world, 6);
    road(world, [
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 4, y: 3 },
      { x: 5, y: 3 },
      { x: 6, y: 3 },
      { x: 6, y: 4 },
      { x: 6, y: 5 },
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
      { x: 2, y: 5 },
      { x: 2, y: 6 },
    ]);

    advanceTicks(world, 1);

    expect(foodStocks(world)).toEqual([
      { typeId: "farm", foodStock: 0 },
      { typeId: "farm", foodStock: 1 },
      { typeId: "granary", foodStock: 1 },
    ]);
  });

  it("较近农场优先于实体 ID 更小但道路更远的农场", () => {
    const world = createWorld();
    build(world, "farm", 1, 1);
    build(world, "farm", 4, 7);
    build(world, "granary", 7, 4);
    advanceTicks(world, 6);
    road(world, [
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 4, y: 3 },
      { x: 5, y: 3 },
      { x: 6, y: 3 },
      { x: 6, y: 4 },
      { x: 6, y: 5 },
      { x: 6, y: 6 },
      { x: 5, y: 6 },
    ]);

    advanceTicks(world, 1);

    expect(foodStocks(world)).toEqual([
      { typeId: "farm", foodStock: 1 },
      { typeId: "farm", foodStock: 0 },
      { typeId: "granary", foodStock: 1 },
    ]);
  });

  it("一份农场库存只由 ID 较小的可达粮仓领取一次", () => {
    const world = createWorld();
    build(world, "farm", 1, 1);
    build(world, "granary", 7, 3);
    build(world, "granary", 7, 6);
    advanceTicks(world, 6);
    road(world, [
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 4, y: 3 },
      { x: 5, y: 3 },
      { x: 6, y: 3 },
      { x: 6, y: 4 },
      { x: 6, y: 5 },
      { x: 6, y: 6 },
    ]);
    world.buildings.reverse();

    advanceTicks(world, 1);

    expect(snapshotWorld(world).buildings).toMatchObject([
      { id: 1, typeId: "farm", foodStock: 0 },
      { id: 2, typeId: "granary", foodStock: 1 },
      { id: 3, typeId: "granary", foodStock: 0 },
    ]);
  });

  it("拆除农场或粮仓会连同各自库存删除", () => {
    const world = createWorld();
    build(world, "farm", 1, 14);
    build(world, "granary", 1, 17);
    road(world, [
      { x: 0, y: 15 },
      { x: 0, y: 16 },
      { x: 0, y: 17 },
    ]);
    advanceTicks(world, 6);

    const granaryDemolition = applyCommand(world, {
      seq: 30,
      type: "demolish",
      x: 1,
      y: 17,
    });
    expect(granaryDemolition.result).toMatchObject({ accepted: true });
    expect(granaryDemolition.snapshot.buildings).toMatchObject([
      { typeId: "farm", foodStock: 0 },
    ]);

    advanceTicks(world, 3);
    const farmDemolition = applyCommand(world, {
      seq: 31,
      type: "demolish",
      x: 1,
      y: 14,
    });
    expect(farmDemolition.result).toMatchObject({ accepted: true });
    expect(farmDemolition.snapshot.buildings).toEqual([]);
  });

  it("同 tick 生产与住户迁入只增加一次 revision", () => {
    const world = createWorld();
    applyCommand(world, {
      seq: 1,
      type: "build",
      buildingTypeId: "house",
      x: 1,
      y: 14,
      rotation: 0,
    });
    const house = world.buildings.find(
      (building) => building.typeId === "house",
    );
    if (house?.typeId === "house") house.constructionStage = 4;
    build(world, "farm", 5, 5);
    build(world, "granary", 8, 5);
    advanceTicks(world, 5);
    road(world, [{ x: 0, y: 15 }]);
    road(world, [{ x: 7, y: 5 }]);
    const revisionBefore = world.revision;

    advanceTicks(world, 1);

    expect(snapshotWorld(world)).toMatchObject({
      revision: revisionBefore + 1,
      buildings: [
        { typeId: "house", level: 1 },
        { typeId: "farm", foodStock: 0 },
        { typeId: "granary", foodStock: 1 },
      ],
      households: [{ houseId: 1, residents: 5 }],
    });
  });
});
