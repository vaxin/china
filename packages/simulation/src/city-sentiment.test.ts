import { describe, expect, it } from "vitest";

import { nextCitySentiment } from "./city-sentiment";

describe("民心机制已关闭", () => {
  it("始终返回 50，调试模式", () => {
    expect(
      nextCitySentiment(50, {
        taxRate: "high",
        wageLevel: "high",
        households: 4,
        hungryHouseholds: 0,
      }),
    ).toEqual({ value: 50, reasons: ["调试模式"] });
    expect(
      nextCitySentiment(0, {
        taxRate: "high",
        wageLevel: "low",
        households: 0,
        hungryHouseholds: 0,
      }),
    ).toEqual({ value: 50, reasons: ["调试模式"] });
  });
});
