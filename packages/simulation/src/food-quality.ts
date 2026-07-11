import {
  CROP_TYPES,
  type FoodQuality,
  type FoodStocks,
} from "@empire/protocol";

export function emptyFoodStocks(): FoodStocks {
  return {
    wheat: 0,
    soybean: 0,
    rice: 0,
    millet: 0,
    cabbage: 0,
  };
}

export function foodStockTotal(stocks: FoodStocks): number {
  return CROP_TYPES.reduce((total, cropType) => total + stocks[cropType], 0);
}

export function foodQualityForStocks(stocks: FoodStocks): FoodQuality {
  const variety = CROP_TYPES.filter((cropType) => stocks[cropType] > 0).length;
  if (variety === 0) return "none";
  if (variety === 1) return "bland";
  if (variety === 2) return "plain";
  if (variety === 3) return "appetizing";
  return "tasty";
}
