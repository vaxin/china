import { describe, expect, it } from "vitest";

import { nextCitySentiment } from "./city-sentiment";

describe("税率、工资与饱腹共同改变城市民心", () => {
  it("重税降低民心，优厚工资和全员饱腹只能部分抵消", () => {
    expect(
      nextCitySentiment(50, {
        taxRate: "high",
        wageLevel: "high",
        households: 4,
        hungryHouseholds: 0,
      }),
    ).toEqual({ value: 50, reasons: ["重税 -2", "优厚工资 +1", "饱腹 +1"] });
  });

  it("轻税、常薪与饱腹提升民心，低薪和缺粮会加剧不满", () => {
    expect(
      nextCitySentiment(40, {
        taxRate: "low",
        wageLevel: "standard",
        households: 2,
        hungryHouseholds: 0,
      }).value,
    ).toBe(42);
    expect(
      nextCitySentiment(40, {
        taxRate: "standard",
        wageLevel: "low",
        households: 2,
        hungryHouseholds: 1,
      }),
    ).toEqual({ value: 36, reasons: ["低薪 -1", "缺粮 -3"] });
  });

  it("无居民时民心不漂移，并始终限制在 0–100", () => {
    expect(
      nextCitySentiment(50, {
        taxRate: "high",
        wageLevel: "low",
        households: 0,
        hungryHouseholds: 0,
      }),
    ).toEqual({ value: 50, reasons: ["尚无居民"] });
    expect(
      nextCitySentiment(99, {
        taxRate: "low",
        wageLevel: "high",
        households: 1,
        hungryHouseholds: 0,
      }).value,
    ).toBe(100);
  });
});
