import { describe, expect, it } from "vitest";

import { advanceClockProgress, CLOCK_HEARTBEAT_MS } from "./simulation-clock";

describe("simulation clock", () => {
  it.each([
    { speed: 1 as const, heartbeats: 4 },
    { speed: 2 as const, heartbeats: 2 },
    { speed: 4 as const, heartbeats: 1 },
  ])(
    "$speed× advances one month after $heartbeats clock heartbeats",
    ({ speed, heartbeats }) => {
      let progress = 0;
      let ticks = 0;
      for (let index = 0; index < heartbeats; index += 1) {
        const next = advanceClockProgress(progress, speed);
        progress = next.progress;
        ticks += next.ticks;
      }

      expect(ticks).toBe(1);
      expect(heartbeats * CLOCK_HEARTBEAT_MS).toBe(10_000 / speed);
    },
  );

  it("does not accumulate time while paused", () => {
    expect(advanceClockProgress(3, 0)).toEqual({ progress: 3, ticks: 0 });
  });
});
