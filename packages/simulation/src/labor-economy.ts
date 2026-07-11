import type {
  CropType,
  LaborPolicyView,
  LaborSector,
  WageLevel,
} from "@empire/protocol";
import { cropPhaseAtTick } from "./crop-calendar";

export type LaborPolicy = LaborPolicyView;

export const DEFAULT_LABOR_POLICY: LaborPolicy = {
  wageLevel: "standard",
  priorities: ["agriculture", "commerce", "services"],
};

interface LaborCityView {
  tick: number;
  buildings: Array<{ typeId: string; cropType?: CropType }>;
  households: Array<{ residents: number }>;
}

export interface LaborReport {
  population: number;
  availableWorkers: number;
  demand: Record<LaborSector, number>;
  assigned: Record<LaborSector, number>;
  vacancies: Record<LaborSector, number>;
  payroll: number;
}

const PARTICIPATION_RATE: Record<WageLevel, number> = {
  low: 0.3,
  standard: 0.4,
  high: 0.5,
};

const WAGE_RATE: Record<WageLevel, number> = {
  low: 1,
  standard: 2,
  high: 3,
};

const MIGRATION_WAGE_MODIFIER: Record<WageLevel, number> = {
  low: -20,
  standard: 0,
  high: 20,
};

export function migrationAttractiveness(
  sentiment: number,
  wageLevel: WageLevel,
): { score: number; wageModifier: number; canMigrate: boolean } {
  const wageModifier = MIGRATION_WAGE_MODIFIER[wageLevel];
  const score = Math.max(0, Math.min(100, sentiment + wageModifier));
  return { score, wageModifier, canMigrate: score >= 40 };
}

export function calculateLaborReport(
  city: LaborCityView,
  policy: LaborPolicy,
): LaborReport {
  const population = city.households.reduce(
    (total, household) => total + household.residents,
    0,
  );
  const availableWorkers = Math.floor(
    population * PARTICIPATION_RATE[policy.wageLevel],
  );
  const demand: Record<LaborSector, number> = {
    agriculture: city.buildings.reduce(
      (total, building) =>
        (building.typeId === "farm" &&
          building.cropType !== undefined &&
          cropPhaseAtTick(building.cropType, city.tick) !== "dormant") ||
        (building.typeId === "hemp-farm" &&
          (city.tick % 12) + 1 >= 4 &&
          (city.tick % 12) + 1 <= 9)
          ? total + 2
          : total,
      0,
    ),
    commerce: city.buildings.reduce(
      (total, building) =>
        building.typeId === "granary" ||
        building.typeId === "market" ||
        building.typeId === "weaver" ||
        building.typeId === "weaponsmith" ||
        building.typeId === "trading-post"
          ? total + 1
          : total,
      0,
    ),
    services: city.buildings.reduce(
      (total, building) =>
        building.typeId === "infantry-fort" || building.typeId === "tax-office"
          ? total + 2
          : building.typeId === "music-school"
            ? total + 1
            : building.typeId === "well"
              ? total + 1
              : total,
      0,
    ),
  };
  const assigned: Record<LaborSector, number> = {
    agriculture: 0,
    commerce: 0,
    services: 0,
  };
  let remaining = availableWorkers;
  for (const sector of policy.priorities) {
    assigned[sector] = Math.min(demand[sector], remaining);
    remaining -= assigned[sector];
  }
  const vacancies = {
    agriculture: demand.agriculture - assigned.agriculture,
    commerce: demand.commerce - assigned.commerce,
    services: demand.services - assigned.services,
  };
  const assignedWorkers = Object.values(assigned).reduce(
    (total, count) => total + count,
    0,
  );
  return {
    population,
    availableWorkers,
    demand,
    assigned,
    vacancies,
    payroll: assignedWorkers * WAGE_RATE[policy.wageLevel],
  };
}
