import { describe, expect, it } from "vitest";
import type { HouseholdView, WorldSnapshot } from "@empire/protocol";

import {
  householdLivelihoodView,
  summarizeCityLivelihood,
} from "./livelihood-view-model";

function household(overrides: Partial<HouseholdView> = {}): HouseholdView {
  return {
    houseId: 1,
    residents: 5,
    foodReserveTicks: 1,
    foodQuality: "bland",
    cash: 8,
    employedWorkers: 1,
    lastIncome: 2,
    lastFoodExpense: 1,
    wageArrears: 0,
    taxArrears: 0,
    foodShortageReason: "none",
    livelihoodLedger: [],
    ...overrides,
  };
}

describe("livelihood visualization model", () => {
  it("shows a pending delivery as the active procurement stage", () => {
    expect(
      householdLivelihoodView(
        household({
          foodReserveTicks: 0,
          foodShortageReason: "delivery-pending",
        }),
        {
          houseId: 1,
          marketId: 2,
          cropType: "wheat",
          foodQuality: "bland",
          price: 1,
          placedAtTick: 8,
          arrivesAtTick: 9,
        },
      ),
    ).toMatchObject({
      conclusion: "运粮中",
      tone: "transit",
      activeStage: "provision",
      provision: "十月到达",
      pantry: "已断粮",
    });
  });

  it("summarizes cash, employed households and the dominant blocker", () => {
    const households = [
      household({ houseId: 1, cash: 8, employedWorkers: 1 }),
      household({
        houseId: 2,
        cash: 0,
        employedWorkers: 0,
        foodReserveTicks: 0,
        foodShortageReason: "unaffordable",
      }),
      household({
        houseId: 3,
        cash: 3,
        employedWorkers: 0,
        foodReserveTicks: 0,
        foodShortageReason: "unaffordable",
      }),
    ];
    const snapshot: WorldSnapshot = {
      map: { width: 32, height: 32 },
      tick: 0,
      revision: 0,
      buildings: [],
      roads: [],
      households,
      householdFoodOrders: [],
      migrants: [],
    };

    expect(summarizeCityLivelihood(snapshot)).toEqual({
      totalCash: 11,
      employedHouseholds: 1,
      hungryHouseholds: 2,
      dominantBlocker: "无力购粮 2",
    });
  });
});
