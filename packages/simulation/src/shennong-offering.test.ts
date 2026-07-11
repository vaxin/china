import { describe, expect, it } from "vitest";

import {
  advanceTicks,
  applyCommand,
  createWorld,
  snapshotWorld,
} from "./index";

function stockedGranary(stock = 3) {
  const world = createWorld();
  applyCommand(world, {
    seq: 1,
    type: "build",
    buildingTypeId: "granary",
    x: 8,
    y: 5,
    rotation: 0,
  });
  const granary = world.buildings[0];
  if (!granary || granary.typeId !== "granary")
    throw new Error("测试粮仓不存在");
  granary.foodStock = stock as typeof granary.foodStock;
  granary.foodStocks.wheat = stock;
  return { world, granary };
}

describe("神农供奉", () => {
  it("每次供奉真实扣一份指定粮食并提高一级好感", () => {
    const { world, granary } = stockedGranary(2);
    const response = applyCommand(world, {
      seq: 2,
      type: "make-offering",
      granaryId: granary.id,
      cropType: "wheat",
    });

    expect(response.result).toMatchObject({ accepted: true, revision: 2 });
    expect(snapshotWorld(world)).toMatchObject({
      shennongFavor: 1,
      buildings: [
        { typeId: "granary", foodStock: 1, foodStocks: { wheat: 1 } },
      ],
    });
  });

  it("缺货供奉原子拒绝且不凭空增加好感", () => {
    const { world, granary } = stockedGranary(0);
    const before = snapshotWorld(world);
    expect(
      applyCommand(world, {
        seq: 2,
        type: "make-offering",
        granaryId: granary.id,
        cropType: "wheat",
      }).result,
    ).toMatchObject({ accepted: false, reasonCode: "insufficient-stock" });
    expect(snapshotWorld(world)).toEqual(before);
  });

  it("三阶好感让收获加倍但仍受农场容量限制，跨年衰减一级", () => {
    const { world, granary } = stockedGranary(3);
    for (let index = 0; index < 3; index += 1) {
      applyCommand(world, {
        seq: index + 2,
        type: "make-offering",
        granaryId: granary.id,
        cropType: "wheat",
      });
    }
    applyCommand(world, {
      seq: 5,
      type: "build",
      buildingTypeId: "farm",
      cropType: "wheat",
      x: 5,
      y: 5,
      rotation: 0,
    });

    advanceTicks(world, 6);
    expect(snapshotWorld(world)).toMatchObject({
      shennongFavor: 3,
      buildings: [
        { typeId: "granary", foodStock: 0 },
        { typeId: "farm", foodStock: 2 },
      ],
    });
    advanceTicks(world, 6);
    expect(snapshotWorld(world).shennongFavor).toBe(2);
  });
});
