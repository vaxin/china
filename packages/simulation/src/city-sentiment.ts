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
  _factors: SentimentFactors,
): SentimentReport {
  return { value: 50, reasons: ["调试模式"] };
}
