import { describe, expect, it } from "vitest";

import { calculateLaborReport, type LaborPolicy } from "./labor-economy";

const standardPolicy: LaborPolicy = {
  wageLevel: "standard",
  priorities: ["agriculture", "commerce", "services"],
};

function city(tick: number, population = 10) {
  return {
    tick,
    buildings: [
      { typeId: "farm" as const, cropType: "wheat" as const },
      { typeId: "farm" as const, cropType: "cabbage" as const },
      { typeId: "granary" as const },
      { typeId: "market" as const },
      { typeId: "well" as const },
    ],
    households: [{ residents: population }],
  };
}

describe("季节劳动力经济", () => {
  it("三月小麦农忙而白菜休耕，八月则反转", () => {
    expect(calculateLaborReport(city(2), standardPolicy).demand).toEqual({
      agriculture: 2,
      commerce: 2,
      services: 1,
    });
    expect(calculateLaborReport(city(7), standardPolicy).demand).toEqual({
      agriculture: 2,
      commerce: 2,
      services: 1,
    });
    expect(
      calculateLaborReport(city(0), standardPolicy).demand.agriculture,
    ).toBe(0);
  });

  it("缺工时按行业优先级分配且不会创造额外工人", () => {
    const agriculturalFirst = calculateLaborReport(city(2), standardPolicy);
    const commerceFirst = calculateLaborReport(city(2), {
      ...standardPolicy,
      priorities: ["commerce", "services", "agriculture"],
    });

    expect(agriculturalFirst.availableWorkers).toBe(4);
    expect(agriculturalFirst.assigned).toEqual({
      agriculture: 2,
      commerce: 2,
      services: 0,
    });
    expect(commerceFirst.assigned).toEqual({
      agriculture: 1,
      commerce: 2,
      services: 1,
    });
    expect(
      Object.values(commerceFirst.assigned).reduce((a, b) => a + b, 0),
    ).toBe(commerceFirst.availableWorkers);
  });

  it("工资档位同时改变劳动参与率与每 tick 工资支出", () => {
    const reports = (["low", "standard", "high"] as const).map((wageLevel) =>
      calculateLaborReport(city(2), { ...standardPolicy, wageLevel }),
    );

    expect(reports.map((report) => report.availableWorkers)).toEqual([3, 4, 5]);
    expect(reports.map((report) => report.payroll)).toEqual([3, 8, 15]);
  });
});
