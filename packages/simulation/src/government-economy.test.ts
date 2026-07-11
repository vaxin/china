import { describe, expect, it } from "vitest";

import {
  calculateMonthlyFiscalReport,
  nextTreasuryBalance,
} from "./government-economy";

describe("政府税收与国库", () => {
  const houses = [
    { houseId: 1, level: 1 as const, covered: true, desirability: 0 },
    { houseId: 2, level: 2 as const, covered: true, desirability: 3 },
    { houseId: 3, level: 2 as const, covered: false, desirability: 5 },
  ];

  it("只对税务道路覆盖住宅征税，住宅等级和宜居度提高税基", () => {
    expect(
      calculateMonthlyFiscalReport({
        houses,
        taxRate: "standard",
        taxOfficeWorkers: 2,
        taxOfficeDemand: 2,
        payroll: 4,
      }),
    ).toEqual({ taxRevenue: 8, payroll: 4, net: 4, taxableHouses: 2 });
  });

  it("税务署缺工会按实际人手降低征收效率，断路住宅不交幽灵税", () => {
    expect(
      calculateMonthlyFiscalReport({
        houses,
        taxRate: "high",
        taxOfficeWorkers: 1,
        taxOfficeDemand: 2,
        payroll: 3,
      }),
    ).toEqual({ taxRevenue: 6, payroll: 3, net: 3, taxableHouses: 2 });
    expect(
      calculateMonthlyFiscalReport({
        houses: houses.map((house) => ({ ...house, covered: false })),
        taxRate: "high",
        taxOfficeWorkers: 2,
        taxOfficeDemand: 2,
        payroll: 6,
      }).taxRevenue,
    ).toBe(0);
  });

  it("税收与工资同月真实进入国库且保持安全整数", () => {
    expect(nextTreasuryBalance(500, { taxRevenue: 8, payroll: 4 })).toBe(504);
    expect(nextTreasuryBalance(0, { taxRevenue: 0, payroll: 4 })).toBe(-4);
    expect(() =>
      nextTreasuryBalance(Number.MAX_SAFE_INTEGER, {
        taxRevenue: 1,
        payroll: 0,
      }),
    ).toThrow("国库余额超出安全整数范围");
  });
});
