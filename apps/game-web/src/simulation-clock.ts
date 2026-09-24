export const CLOCK_HEARTBEAT_MS = 2_500;
export const CLOCK_STEPS_PER_TICK = 4;

export type SimulationSpeed = 0 | 1 | 2 | 4;

export function advanceClockProgress(
  progress: number,
  speed: SimulationSpeed,
): { progress: number; ticks: number } {
  const nextProgress = progress + speed;
  const ticks = Math.floor(nextProgress / CLOCK_STEPS_PER_TICK);
  return {
    progress: nextProgress - ticks * CLOCK_STEPS_PER_TICK,
    ticks,
  };
}
