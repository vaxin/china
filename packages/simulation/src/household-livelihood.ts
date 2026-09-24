import { HOUSEHOLD_LEDGER_LIMIT, type WageLevel } from "@empire/protocol";

export type LivelihoodLedgerKind =
  | "arrival-funds"
  | "wage"
  | "wage-arrears"
  | "tax"
  | "tax-arrears"
  | "food-order"
  | "food-delivery"
  | "food-refund";

export interface LivelihoodLedgerEntry {
  id: string;
  tick: number;
  kind: LivelihoodLedgerKind;
  amount: number;
  balanceAfter: number;
}

interface HouseholdPopulation {
  houseId: number;
  residents: number;
}

interface WageHousehold {
  houseId: number;
  cash: number;
  employedWorkers: number;
  wageArrears: number;
  lastIncome?: number;
  ledger: LivelihoodLedgerEntry[];
}

const PARTICIPATION_RATE: Record<WageLevel, number> = {
  low: 0.3,
  standard: 0.4,
  high: 0.5,
};

export const WAGE_RATE: Record<WageLevel, number> = {
  low: 1,
  standard: 2,
  high: 3,
};

export function allocateHouseholdWorkers(
  households: readonly HouseholdPopulation[],
  assignedWorkers: number,
  wageLevel: WageLevel,
): Array<{ houseId: number; employedWorkers: number }> {
  let remaining = Math.max(0, Math.floor(assignedWorkers));
  return [...households]
    .sort((left, right) => left.houseId - right.houseId)
    .map((household) => {
      const capacity = Math.floor(
        household.residents * PARTICIPATION_RATE[wageLevel],
      );
      const employedWorkers = Math.min(capacity, remaining);
      remaining -= employedWorkers;
      return { houseId: household.houseId, employedWorkers };
    });
}

export function appendLivelihoodLedger(
  ledger: readonly LivelihoodLedgerEntry[],
  entry: LivelihoodLedgerEntry,
): LivelihoodLedgerEntry[] {
  if (ledger.some((candidate) => candidate.id === entry.id)) {
    throw new Error("duplicate livelihood ledger entry");
  }
  return [...ledger, entry].slice(-HOUSEHOLD_LEDGER_LIMIT);
}

function appendGeneratedEntry(
  ledger: readonly LivelihoodLedgerEntry[],
  entry: Omit<LivelihoodLedgerEntry, "id">,
): LivelihoodLedgerEntry[] {
  let ordinal = 0;
  let id = `${entry.tick}:${entry.kind}:${ordinal}`;
  while (ledger.some((candidate) => candidate.id === id)) {
    ordinal += 1;
    id = `${entry.tick}:${entry.kind}:${ordinal}`;
  }
  return appendLivelihoodLedger(ledger, { id, ...entry });
}

export function settleHouseholdWages<T extends WageHousehold>(input: {
  tick: number;
  treasury: number;
  escrow: number;
  wageLevel: WageLevel;
  households: readonly T[];
}): {
  treasury: number;
  paidPayroll: number;
  households: Array<T & { lastIncome: number; wageArrears: number }>;
} {
  let spendable = Math.max(0, input.treasury - input.escrow);
  let paidPayroll = 0;
  const households = [...input.households]
    .sort((left, right) => left.houseId - right.houseId)
    .map((household) => {
      const due = household.employedWorkers * WAGE_RATE[input.wageLevel];
      const paid = Math.min(due, spendable);
      const unpaid = due - paid;
      spendable -= paid;
      paidPayroll += paid;
      const cash = household.cash + paid;
      let ledger = [...household.ledger];
      if (paid > 0) {
        ledger = appendGeneratedEntry(ledger, {
          tick: input.tick,
          kind: "wage",
          amount: paid,
          balanceAfter: cash,
        });
      }
      if (unpaid > 0) {
        ledger = appendGeneratedEntry(ledger, {
          tick: input.tick,
          kind: "wage-arrears",
          amount: 0,
          balanceAfter: cash,
        });
      }
      return {
        ...household,
        cash,
        lastIncome: (household.lastIncome ?? 0) + paid,
        wageArrears: household.wageArrears + unpaid,
        ledger,
      };
    });

  return {
    treasury: input.treasury - paidPayroll,
    paidPayroll,
    households,
  };
}

export function addLivelihoodLedgerEntry(
  ledger: readonly LivelihoodLedgerEntry[],
  entry: Omit<LivelihoodLedgerEntry, "id">,
): LivelihoodLedgerEntry[] {
  return appendGeneratedEntry(ledger, entry);
}
