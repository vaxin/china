import type { TaxRate, WageLevel } from "@empire/protocol";

export interface SentimentFactors {
  taxRate: TaxRate;
  wageLevel: WageLevel;
  households: number;
  hungryHouseholds: number;
}

export interface SentimentReport {
  value: number;
  reasons: string[];
}

export function nextCitySentiment(
  current: number,
  factors: SentimentFactors,
): SentimentReport {
  if (factors.households <= 0) {
    return { value: current, reasons: ["尚无居民"] };
  }
  let change = 0;
  const reasons: string[] = [];
  if (factors.taxRate === "low") {
    change += 1;
    reasons.push("轻税 +1");
  } else if (factors.taxRate === "high") {
    change -= 2;
    reasons.push("重税 -2");
  }
  if (factors.wageLevel === "low") {
    change -= 1;
    reasons.push("低薪 -1");
  } else if (factors.wageLevel === "high") {
    change += 1;
    reasons.push("优厚工资 +1");
  }
  if (factors.hungryHouseholds > 0) {
    change -= 3;
    reasons.push("缺粮 -3");
  } else {
    change += 1;
    reasons.push("饱腹 +1");
  }
  return {
    value: Math.max(0, Math.min(100, current + change)),
    reasons,
  };
}
