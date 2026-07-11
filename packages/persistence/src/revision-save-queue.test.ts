import { describe, expect, it } from "vitest";
import type { SaveGameResult, RevisionSaveTarget } from "./index";
import type { WorldSnapshot } from "@empire/protocol";

import { RevisionSaveQueue } from "./index";

function snapshot(revision: number): WorldSnapshot {
  return {
    map: { width: 32, height: 32 },
    tick: revision,
    revision,
    buildings: [],
    roads: [],
    households: [],
    migrants: [],
  };
}

describe("revision 自动保存队列", () => {
  it("严格串行并在入队时冻结快照", async () => {
    const received: WorldSnapshot[] = [];
    let releaseFirst!: () => void;
    const firstBlocked = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const target: RevisionSaveTarget = {
      async saveIfNewer(value): Promise<SaveGameResult> {
        received.push(value);
        if (value.revision === 1) await firstBlocked;
        return { status: "saved", revision: value.revision };
      },
    };
    const queue = new RevisionSaveQueue(target);
    const firstSnapshot = snapshot(1);

    const first = queue.enqueue(firstSnapshot);
    firstSnapshot.roads.push({ x: 0, y: 15 });
    await Promise.resolve();
    const second = queue.enqueue(snapshot(2));

    expect(received.map((value) => value.revision)).toEqual([1]);
    releaseFirst();
    await Promise.all([first, second]);
    await queue.flush();
    expect(received.map((value) => value.revision)).toEqual([1, 2]);
    expect(received[0].roads).toEqual([]);
    expect(queue.latestScheduledRevision).toBe(2);
  });

  it("一次写入失败不会阻断后续 revision", async () => {
    const received: number[] = [];
    const target: RevisionSaveTarget = {
      async saveIfNewer(value): Promise<SaveGameResult> {
        received.push(value.revision);
        if (value.revision === 1) throw new Error("disk unavailable");
        return { status: "saved", revision: value.revision };
      },
    };
    const queue = new RevisionSaveQueue(target);

    const first = queue.enqueue(snapshot(1));
    const second = queue.enqueue(snapshot(2));

    await expect(first).rejects.toThrow("disk unavailable");
    await expect(second).resolves.toEqual({ status: "saved", revision: 2 });
    await queue.flush();
    expect(received).toEqual([1, 2]);
  });
});
