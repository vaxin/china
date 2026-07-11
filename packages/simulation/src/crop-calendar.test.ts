import { describe, expect, it } from "vitest";

import {
  CROP_CALENDARS,
  cropPhaseAtTick,
  monthAtTick,
  type CropType,
} from "./crop-calendar";

describe("龙之崛起式作物历法", () => {
  it("十二个 tick 构成一整年并稳定跨年", () => {
    expect(Array.from({ length: 14 }, (_, tick) => monthAtTick(tick))).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2,
    ]);
  });

  it.each<[CropType, number[], number]>([
    ["wheat", [3, 4, 5, 6], 7],
    ["soybean", [5, 6, 7, 8], 9],
    ["rice", [6, 7, 8, 9], 10],
    ["millet", [7, 8, 9, 10], 11],
    ["cabbage", [8, 9, 10, 11], 12],
  ])("%s 按原作月份生长并收获", (crop, growingMonths, harvestMonth) => {
    expect(CROP_CALENDARS[crop]).toEqual({ growingMonths, harvestMonth });
    for (let month = 1; month <= 12; month += 1) {
      const expected =
        month === harvestMonth
          ? "harvest"
          : growingMonths.includes(month)
            ? "growing"
            : "dormant";
      expect(cropPhaseAtTick(crop, month - 1)).toBe(expected);
      expect(cropPhaseAtTick(crop, month - 1 + 12)).toBe(expected);
    }
  });

  it("拒绝负数、非整数和不安全 tick", () => {
    for (const tick of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => monthAtTick(tick)).toThrow("tick 必须是非负安全整数");
    }
  });
});
