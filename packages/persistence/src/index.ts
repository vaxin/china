import Dexie, { type Table } from "dexie";
import {
  SAVE_FORMAT_VERSION,
  createSaveEnvelope,
  decodeSaveEnvelope,
  worldSnapshotSchema,
  type WorldSnapshot,
} from "@empire/protocol";

export interface GameSaveStoreOptions {
  databaseName?: string;
  indexedDB?: IDBFactory;
  IDBKeyRange?: typeof globalThis.IDBKeyRange;
}

export type LoadGameResult =
  | { status: "empty" }
  | { status: "loaded"; snapshot: WorldSnapshot }
  | { status: "recovered-from-corrupt-save" };

export type SaveGameResult =
  | { status: "saved"; revision: number }
  | {
      status: "skipped-stale";
      revision: number;
      storedRevision: number;
    }
  | {
      status: "conflict";
      revision: number;
      storedRevision: number;
    };

interface StoredSave {
  id: "autosave";
  envelope: unknown;
  savedAt: string;
}

interface QuarantinedSave {
  id: string;
  sourceId: "autosave";
  envelope: unknown;
  quarantinedAt: string;
  reason: string;
}

class GameDatabase extends Dexie {
  saves!: Table<StoredSave, string>;
  quarantine!: Table<QuarantinedSave, string>;

  constructor(name: string, options: GameSaveStoreOptions) {
    super(
      name,
      options.indexedDB && options.IDBKeyRange
        ? { indexedDB: options.indexedDB, IDBKeyRange: options.IDBKeyRange }
        : undefined,
    );
    this.version(1).stores({
      saves: "&id",
      quarantine: "&id, quarantinedAt",
    });
  }
}

export interface RevisionSaveTarget {
  saveIfNewer(snapshot: WorldSnapshot): Promise<SaveGameResult>;
}

export class RevisionSaveQueue {
  private tail: Promise<void> = Promise.resolve();
  private latestRevision = -1;

  constructor(private readonly target: RevisionSaveTarget) {}

  get latestScheduledRevision(): number {
    return this.latestRevision;
  }

  enqueue(snapshot: WorldSnapshot): Promise<SaveGameResult> {
    const immutableSnapshot = worldSnapshotSchema.parse(snapshot);
    this.latestRevision = Math.max(
      this.latestRevision,
      immutableSnapshot.revision,
    );

    const operation = this.tail.then(
      () => this.target.saveIfNewer(immutableSnapshot),
      () => this.target.saveIfNewer(immutableSnapshot),
    );
    this.tail = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  async flush(): Promise<void> {
    await this.tail;
  }
}

export class GameSaveStore implements RevisionSaveTarget {
  private readonly database: GameDatabase;
  private knownRevision: number | null = null;

  constructor(options: GameSaveStoreOptions = {}) {
    this.database = new GameDatabase(
      options.databaseName ?? "empire-game",
      options,
    );
  }

  async save(snapshot: WorldSnapshot): Promise<void> {
    await this.saveIfNewer(snapshot);
  }

  async saveIfNewer(snapshot: WorldSnapshot): Promise<SaveGameResult> {
    const incomingEnvelope = createSaveEnvelope(snapshot);
    return this.database.transaction("rw", this.database.saves, async () => {
      const stored = await this.database.saves.get("autosave");
      let storedRevision = 0;
      let storedWorld: WorldSnapshot | undefined;
      if (stored) {
        try {
          storedWorld = decodeSaveEnvelope(stored.envelope).snapshot;
          storedRevision = storedWorld.revision;
        } catch {
          storedRevision = -1;
        }
      }

      const sameWorld =
        storedWorld !== undefined &&
        JSON.stringify(storedWorld) === JSON.stringify(incomingEnvelope.world);
      if (
        this.knownRevision !== null &&
        storedRevision !== this.knownRevision &&
        !sameWorld
      ) {
        return {
          status: "conflict",
          revision: incomingEnvelope.world.revision,
          storedRevision,
        };
      }

      if (stored && incomingEnvelope.world.revision <= storedRevision) {
        if (sameWorld) this.knownRevision = storedRevision;
        return {
          status: "skipped-stale",
          revision: incomingEnvelope.world.revision,
          storedRevision,
        };
      }

      await this.database.saves.put({
        id: "autosave",
        envelope: incomingEnvelope,
        savedAt: new Date().toISOString(),
      });
      this.knownRevision = incomingEnvelope.world.revision;
      return {
        status: "saved",
        revision: incomingEnvelope.world.revision,
      };
    });
  }

  async load(): Promise<LoadGameResult> {
    return this.database.transaction(
      "rw",
      this.database.saves,
      this.database.quarantine,
      async () => {
        const stored = await this.database.saves.get("autosave");
        if (!stored) {
          this.knownRevision = 0;
          return { status: "empty" };
        }

        try {
          const decoded = decodeSaveEnvelope(stored.envelope);
          if (decoded.sourceVersion !== SAVE_FORMAT_VERSION) {
            await this.database.saves.put({
              ...stored,
              envelope: decoded.envelope,
            });
          }
          this.knownRevision = decoded.snapshot.revision;
          return { status: "loaded", snapshot: decoded.snapshot };
        } catch (error) {
          const reason =
            error instanceof Error
              ? error.message
              : "Unknown save validation error";
          await this.database.quarantine.put({
            id: `autosave-${Date.now()}-${crypto.randomUUID()}`,
            sourceId: "autosave",
            envelope: stored.envelope,
            quarantinedAt: new Date().toISOString(),
            reason,
          });
          await this.database.saves.delete("autosave");
          this.knownRevision = 0;
          return { status: "recovered-from-corrupt-save" };
        }
      },
    );
  }

  close(): void {
    this.database.close();
  }
}
