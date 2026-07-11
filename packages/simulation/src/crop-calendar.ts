import type { CropType } from "@empire/protocol";

export type { CropType } from "@empire/protocol";

export type CropPhase = "dormant" | "growing" | "harvest";

export const CROP_CALENDARS = {
  wheat: { growingMonths: [3, 4, 5, 6], harvestMonth: 7 },
  soybean: { growingMonths: [5, 6, 7, 8], harvestMonth: 9 },
  rice: { growingMonths: [6, 7, 8, 9], harvestMonth: 10 },
  millet: { growingMonths: [7, 8, 9, 10], harvestMonth: 11 },
  cabbage: { growingMonths: [8, 9, 10, 11], harvestMonth: 12 },
} as const satisfies Record<
  CropType,
  { growingMonths: readonly number[]; harvestMonth: number }
>;

export function monthAtTick(tick: number): number {
  if (!Number.isSafeInteger(tick) || tick < 0) {
    throw new Error("tick 必须是非负安全整数");
  }
  return (tick % 12) + 1;
}

export function cropPhaseAtTick(crop: CropType, tick: number): CropPhase {
  const month = monthAtTick(tick);
  const calendar = CROP_CALENDARS[crop];
  if (month === calendar.harvestMonth) return "harvest";
  return (calendar.growingMonths as readonly number[]).includes(month)
    ? "growing"
    : "dormant";
}
