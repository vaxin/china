import type {
  FoodShortageReason,
  HouseholdFoodOrderView,
  HouseholdView,
  WorldSnapshot,
} from "@empire/protocol";

import { calendarLabel } from "./crop-catalog";

export type LivelihoodTone = "stable" | "transit" | "blocked";
export type LivelihoodStage = "labor" | "wallet" | "provision" | "pantry";

const shortageLabels: Record<FoodShortageReason, string> = {
  none: "尚可度日",
  "delivery-pending": "运粮中",
  unaffordable: "无力购粮",
  "out-of-stock": "市场缺货",
  disconnected: "运路不通",
  "no-market": "无市场",
};

export function foodShortageLabel(
  reason: FoodShortageReason | undefined,
): string {
  return shortageLabels[reason ?? "none"];
}

export function householdLivelihoodView(
  household: HouseholdView,
  order?: HouseholdFoodOrderView,
): {
  conclusion: string;
  tone: LivelihoodTone;
  activeStage: LivelihoodStage;
  labor: string;
  wallet: string;
  provision: string;
  pantry: string;
} {
  const reason = household.foodShortageReason ?? "none";
  const isTransit = order !== undefined || reason === "delivery-pending";
  const isBlocked = reason !== "none" && reason !== "delivery-pending";
  const activeStage: LivelihoodStage =
    isTransit || isBlocked
      ? "provision"
      : (household.employedWorkers ?? 0) === 0
        ? "labor"
        : (household.cash ?? 12) === 0
          ? "wallet"
          : "pantry";
  const arrivalMonth = order
    ? calendarLabel(order.arrivesAtTick).split(" · ")[1]
    : null;
  return {
    conclusion: isTransit ? "运粮中" : foodShortageLabel(reason),
    tone: isTransit ? "transit" : isBlocked ? "blocked" : "stable",
    activeStage,
    labor: `${household.employedWorkers ?? 0} 人 · +${household.lastIncome ?? 0}`,
    wallet: `${household.cash ?? 12} 钱`,
    provision: order
      ? `${arrivalMonth ?? "下月"}到达`
      : foodShortageLabel(reason),
    pantry:
      household.foodReserveTicks > 0
        ? `余 ${household.foodReserveTicks} 月`
        : "已断粮",
  };
}

export function summarizeCityLivelihood(snapshot: WorldSnapshot): {
  totalCash: number;
  employedHouseholds: number;
  hungryHouseholds: number;
  dominantBlocker: string;
} {
  const totalCash = snapshot.households.reduce(
    (total, household) => total + (household.cash ?? 12),
    0,
  );
  const employedHouseholds = snapshot.households.filter(
    (household) => (household.employedWorkers ?? 0) > 0,
  ).length;
  const hungryHouseholds = snapshot.households.filter(
    (household) => household.foodReserveTicks === 0,
  ).length;
  const blockerCounts = new Map<FoodShortageReason, number>();
  for (const household of snapshot.households) {
    const reason = household.foodShortageReason ?? "none";
    if (reason === "none") continue;
    blockerCounts.set(reason, (blockerCounts.get(reason) ?? 0) + 1);
  }
  const dominant = [...blockerCounts.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  )[0];
  return {
    totalCash,
    employedHouseholds,
    hungryHouseholds,
    dominantBlocker: dominant
      ? `${foodShortageLabel(dominant[0])} ${dominant[1]}`
      : "生计顺畅",
  };
}
