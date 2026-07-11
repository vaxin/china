import { describe, expect, it } from "vitest";

import {
  CROP_OPTIONS,
  FOOD_QUALITY_LABELS,
  calendarLabel,
} from "./crop-catalog";

describe("网页农作物目录", () => {
  it("按原作农历顺序提供五种粮食作物与收获月", () => {
    expect(CROP_OPTIONS).toEqual([
      { type: "wheat", label: "小麦", harvestMonth: 7 },
      { type: "soybean", label: "大豆", harvestMonth: 9 },
      { type: "rice", label: "水稻", harvestMonth: 10 },
      { type: "millet", label: "粟", harvestMonth: 11 },
      { type: "cabbage", label: "白菜", harvestMonth: 12 },
    ]);
  });

  it("把模拟 tick 映射为可读年、月", () => {
    expect(calendarLabel(0)).toBe("元年 · 正月");
    expect(calendarLabel(11)).toBe("元年 · 腊月");
    expect(calendarLabel(12)).toBe("二年 · 正月");
  });

  it("把原作四档食物品质映射为中文 HUD 文案", () => {
    expect(FOOD_QUALITY_LABELS).toEqual({
      none: "无粮",
      bland: "清淡",
      plain: "普通",
      appetizing: "可口",
      tasty: "美味",
    });
  });
});
