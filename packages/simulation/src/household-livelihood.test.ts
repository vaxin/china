import { describe, expect, it } from "vitest";

import {
  allocateHouseholdWorkers,
  appendLivelihoodLedger,
  settleHouseholdWages,
} from "./household-livelihood";

describe("household livelihood rules", () => {
  it("allocates assigned workers by stable household order without exceeding capacity", () => {
    expect(
      allocateHouseholdWorkers(
        [
          { houseId: 9, residents: 5 },
          { houseId: 2, residents: 10 },
          { houseId: 5, residents: 5 },
        ],
        6,
        "standard",
      ),
    ).toEqual([
      { houseId: 2, employedWorkers: 4 },
      { houseId: 5, employedWorkers: 2 },
      { houseId: 9, employedWorkers: 0 },
    ]);
  });

  it("pays only spendable treasury funds and records unpaid wages", () => {
    const result = settleHouseholdWages({
      tick: 7,
      treasury: 5,
      escrow: 1,
      wageLevel: "standard",
      households: [
        {
          houseId: 1,
          cash: 3,
          employedWorkers: 2,
          wageArrears: 0,
          ledger: [],
        },
        {
          houseId: 2,
          cash: 4,
          employedWorkers: 1,
          wageArrears: 0,
          ledger: [],
        },
      ],
    });

    expect(result.treasury).toBe(1);
    expect(result.paidPayroll).toBe(4);
    expect(result.households).toMatchObject([
      { houseId: 1, cash: 7, lastIncome: 4, wageArrears: 0 },
      { houseId: 2, cash: 4, lastIncome: 0, wageArrears: 2 },
    ]);
    expect(result.households[1]?.ledger).toEqual([
      expect.objectContaining({
        tick: 7,
        kind: "wage-arrears",
        amount: 0,
        balanceAfter: 4,
      }),
    ]);
  });

  it("keeps only the twelve newest uniquely identified ledger entries", () => {
    let ledger: Parameters<typeof appendLivelihoodLedger>[0] = [];
    for (let tick = 1; tick <= 14; tick += 1) {
      ledger = appendLivelihoodLedger(ledger, {
        id: `${tick}:wage:0`,
        tick,
        kind: "wage",
        amount: 2,
        balanceAfter: tick * 2,
      });
    }

    expect(ledger).toHaveLength(12);
    expect(ledger[0]?.tick).toBe(3);
    expect(ledger[11]?.tick).toBe(14);
    expect(() =>
      appendLivelihoodLedger(ledger, {
        id: "14:wage:0",
        tick: 14,
        kind: "wage",
        amount: 2,
        balanceAfter: 28,
      }),
    ).toThrow("duplicate livelihood ledger entry");
  });
});
