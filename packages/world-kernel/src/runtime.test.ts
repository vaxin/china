import { describe, expect, it } from "vitest";

import { WORLD_RESERVE_ACCOUNT, createProgrammableWorldRuntime } from "./index";

describe("programmable world kernel", () => {
  it("keeps matter and energy totals conserved across accepted commands", () => {
    const runtime = createProgrammableWorldRuntime(42);
    const initial = runtime.snapshot();

    const created = runtime.execute({
      type: "create-object",
      shape: "box",
      position: { x: 0, y: 0, z: 0 },
    });
    expect(created.accepted).toBe(true);

    const object = runtime.snapshot().objects.at(-1);
    expect(object).toBeDefined();
    const transferred = runtime.execute({
      type: "transfer-resource",
      resource: "energy",
      from: WORLD_RESERVE_ACCOUNT,
      to: object!.id,
      amount: 5,
    });
    expect(transferred.accepted).toBe(true);

    const final = runtime.snapshot();
    expect(final.totals).toEqual(initial.totals);
    expect(final.totals).toEqual({ matter: 200, energy: 100 });
  });

  it("atomically rejects a transfer that exceeds its source balance", () => {
    const runtime = createProgrammableWorldRuntime(7);
    const target = runtime.snapshot().objects[0];
    const before = runtime.snapshot();

    const receipt = runtime.execute({
      type: "transfer-resource",
      resource: "energy",
      from: WORLD_RESERVE_ACCOUNT,
      to: target.id,
      amount: 999,
    });

    expect(receipt).toMatchObject({
      accepted: false,
      reasonCode: "insufficient-energy",
    });
    const after = runtime.snapshot();
    expect(after.stateHash).toBe(before.stateHash);
    expect(after.revision).toBe(before.revision);
    expect(runtime.frame().events.at(-1)).toMatchObject({
      status: "rejected",
      reasonCode: "insufficient-energy",
    });
  });

  it("replays accepted and rejected commands to the same state hash", () => {
    const runtime = createProgrammableWorldRuntime(2_026);
    const target = runtime.snapshot().objects[0];

    runtime.execute({ type: "advance", ticks: 3 });
    runtime.execute({
      type: "move-object",
      objectId: target.id,
      position: { x: 4, y: 0, z: -2 },
    });
    runtime.execute({
      type: "transfer-resource",
      resource: "matter",
      from: target.id,
      to: WORLD_RESERVE_ACCOUNT,
      amount: 999,
    });
    runtime.execute({
      type: "create-object",
      shape: "sphere",
      position: { x: -1, y: 0, z: 5 },
    });

    expect(runtime.replay()).toEqual({
      matches: true,
      commandCount: 4,
      expectedHash: runtime.snapshot().stateHash,
      actualHash: runtime.snapshot().stateHash,
    });
  });

  it("keeps the same seed and commands deterministic across runtimes", () => {
    const left = createProgrammableWorldRuntime(99);
    const right = createProgrammableWorldRuntime(99);
    const commands = [
      { type: "advance", ticks: 2 },
      {
        type: "create-object",
        shape: "box",
        position: { x: 5, y: 0, z: 5 },
      },
    ] as const;

    for (const command of commands) {
      left.execute(command);
      right.execute(command);
    }

    expect(left.snapshot()).toEqual(right.snapshot());
  });
});
