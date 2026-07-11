import type { TaxRate } from "@empire/protocol";

export type { TaxRate } from "@empire/protocol";

export interface TaxableHouse {
  houseId: number;
  level: 1 | 2;
  covered: boolean;
  desirability: number;
}

export interface MonthlyFiscalInput {
  houses: readonly TaxableHouse[];
  taxRate: TaxRate;
  taxOfficeWorkers: number;
  taxOfficeDemand: number;
  payroll: number;
}

export interface MonthlyFiscalReport {
  taxRevenue: number;
  payroll: number;
  net: number;
  taxableHouses: number;
}

const TAX_MULTIPLIER: Record<TaxRate, number> = {
  low: 1,
  standard: 2,
  high: 3,
};

export function calculateMonthlyFiscalReport(
  input: MonthlyFiscalInput,
): MonthlyFiscalReport {
  const covered = input.houses.filter((house) => house.covered);
  const taxBase = covered.reduce(
    (total, house) => total + house.level + (house.desirability >= 2 ? 1 : 0),
    0,
  );
  const staffing =
    input.taxOfficeDemand <= 0
      ? 0
      : Math.min(1, input.taxOfficeWorkers / input.taxOfficeDemand);
  const taxRevenue = Math.floor(
    taxBase * TAX_MULTIPLIER[input.taxRate] * staffing,
  );
  return {
    taxRevenue,
    payroll: input.payroll,
    net: taxRevenue - input.payroll,
    taxableHouses: covered.length,
  };
}

export function nextTreasuryBalance(
  current: number,
  flow: Pick<MonthlyFiscalReport, "taxRevenue" | "payroll">,
): number {
  const next = current + flow.taxRevenue - flow.payroll;
  if (!Number.isSafeInteger(next)) {
    throw new Error("国库余额超出安全整数范围");
  }
  return next;
}
