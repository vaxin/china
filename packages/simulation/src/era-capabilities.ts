export type HistoricalCapability =
  | "food-variety"
  | "hemp-textiles"
  | "bronze-infantry"
  | "paper-administration"
  | "schools-and-rites"
  | "cavalry";

interface EraDefinition {
  year: number;
  name: string;
  unlocks: HistoricalCapability[];
}

const ERA_DEFINITIONS: EraDefinition[] = [
  {
    year: 1,
    name: "聚落奠基",
    unlocks: ["food-variety", "hemp-textiles", "bronze-infantry"],
  },
  { year: 2, name: "文书初兴", unlocks: ["paper-administration"] },
  { year: 3, name: "百家并立", unlocks: ["schools-and-rites"] },
  { year: 4, name: "丝路盛世", unlocks: ["cavalry"] },
];

export interface EraState {
  year: number;
  eraName: string;
  unlocked: HistoricalCapability[];
  newlyUnlocked: HistoricalCapability[];
  nextUnlock: { year: number; capability: HistoricalCapability } | null;
}

export function eraStateAtTick(tick: number): EraState {
  if (!Number.isSafeInteger(tick) || tick < 0) {
    throw new Error("年代 tick 必须是非负安全整数");
  }
  const year = Math.floor(tick / 12) + 1;
  const current =
    [...ERA_DEFINITIONS]
      .reverse()
      .find((definition) => definition.year <= year) ?? ERA_DEFINITIONS[0];
  const unlocked = ERA_DEFINITIONS.filter(
    (definition) => definition.year <= year,
  ).flatMap((definition) => definition.unlocks);
  const next = ERA_DEFINITIONS.find((definition) => definition.year > year);
  return {
    year,
    eraName: current.name,
    unlocked: [...unlocked],
    newlyUnlocked: [...current.unlocks],
    nextUnlock: next ? { year: next.year, capability: next.unlocks[0] } : null,
  };
}
