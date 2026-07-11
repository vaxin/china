import type { CropType, FoodQuality } from "@empire/protocol";

export const CROP_OPTIONS = [
  { type: "wheat", label: "小麦", harvestMonth: 7 },
  { type: "soybean", label: "大豆", harvestMonth: 9 },
  { type: "rice", label: "水稻", harvestMonth: 10 },
  { type: "millet", label: "粟", harvestMonth: 11 },
  { type: "cabbage", label: "白菜", harvestMonth: 12 },
] as const satisfies ReadonlyArray<{
  type: CropType;
  label: string;
  harvestMonth: number;
}>;

export const CROP_LABELS = Object.fromEntries(
  CROP_OPTIONS.map((option) => [option.type, option.label]),
) as Record<CropType, string>;

export const FOOD_QUALITY_LABELS: Record<FoodQuality, string> = {
  none: "无粮",
  bland: "清淡",
  plain: "普通",
  appetizing: "可口",
  tasty: "美味",
};

const MONTH_NAMES = [
  "正月",
  "二月",
  "三月",
  "四月",
  "五月",
  "六月",
  "七月",
  "八月",
  "九月",
  "十月",
  "冬月",
  "腊月",
] as const;

const YEAR_NAMES = ["元", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

export function calendarLabel(tick: number): string {
  const year = Math.floor(tick / 12) + 1;
  const yearName = YEAR_NAMES[year - 1] ?? String(year);
  return `${yearName}年 · ${MONTH_NAMES[tick % 12]}`;
}
