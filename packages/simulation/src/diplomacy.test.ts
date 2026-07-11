import { describe, expect, it } from "vitest";

import {
  advanceTicks,
  applyCommand,
  createWorld,
  hydrateWorld,
  snapshotWorld,
} from "./index";

function preparedGifts() {
  const world = createWorld();
  applyCommand(world, {
    seq: 1,
    type: "build",
    buildingTypeId: "granary",
    x: 5,
    y: 5,
    rotation: 0,
  });
  const granary = world.buildings[0];
  if (!granary || granary.typeId !== "granary")
    throw new Error("测试粮仓不存在");
  granary.foodStock = 2;
  granary.foodStocks.wheat = 2;
  return { world, granary };
}

describe("外交赠礼与使者延迟", () => {
  it("两份赠礼扣库后由使者旅行三 tick，抵达才开放贸易", () => {
    const { world, granary } = preparedGifts();
    for (let index = 0; index < 2; index += 1) {
      applyCommand(world, {
        seq: index + 2,
        type: "send-gift",
        granaryId: granary.id,
        cropType: "wheat",
      });
    }
    expect(snapshotWorld(world)).toMatchObject({
      buildings: [{ typeId: "granary", foodStock: 0 }],
      diplomacy: { relation: 0, tradeOpen: false, envoys: [{}, {}] },
    });

    advanceTicks(world, 2);
    expect(snapshotWorld(world).diplomacy).toMatchObject({
      relation: 0,
      tradeOpen: false,
      envoys: [{ arrivesAtTick: 3 }, { arrivesAtTick: 3 }],
    });
    const restored = hydrateWorld(snapshotWorld(world));
    advanceTicks(restored, 1);
    expect(snapshotWorld(restored).diplomacy).toEqual({
      relation: 50,
      tradeOpen: true,
      envoys: [],
    });
  });

  it("缺货赠礼不会生成幽灵使者", () => {
    const { world, granary } = preparedGifts();
    granary.foodStock = 0;
    granary.foodStocks.wheat = 0;
    expect(
      applyCommand(world, {
        seq: 2,
        type: "send-gift",
        granaryId: granary.id,
        cropType: "wheat",
      }).result,
    ).toMatchObject({ accepted: false, reasonCode: "insufficient-stock" });
    expect(snapshotWorld(world).diplomacy).toBeUndefined();
  });
});
