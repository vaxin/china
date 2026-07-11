import { describe, expect, it } from "vitest";

import {
  emptyFoodStocks,
  foodQualityForStocks,
  foodStockTotal,
} from "./food-quality";

describe("食物品类与品质", () => {
  it("空库存包含全部作物键且总量为零", () => {
    const stocks = emptyFoodStocks();
    expect(stocks).toEqual({
      wheat: 0,
      soybean: 0,
      rice: 0,
      millet: 0,
      cabbage: 0,
    });
    expect(foodStockTotal(stocks)).toBe(0);
    expect(foodQualityForStocks(stocks)).toBe("none");
  });

  it.each([
    [1, "bland"],
    [2, "plain"],
    [3, "appetizing"],
    [4, "tasty"],
    [5, "tasty"],
  ] as const)("%i 种食物映射为 %s", (variety, expected) => {
    const stocks = emptyFoodStocks();
    for (const crop of Object.keys(stocks).slice(0, variety) as Array<
      keyof typeof stocks
    >) {
      stocks[crop] = 2;
    }
    expect(foodStockTotal(stocks)).toBe(variety * 2);
    expect(foodQualityForStocks(stocks)).toBe(expected);
  });
});
