import { deterministicHash } from "./hash";
import {
  WORLD_BOUNDS,
  WORLD_RESERVE_ACCOUNT,
  WORLD_SCHEMA_VERSION,
  type CollisionProxy,
  type CommandReceipt,
  type KernelEvent,
  type LoggedCommand,
  type ObjectShape,
  type RejectionReason,
  type ReplayReport,
  type ResourceDelta,
  type ResourceKind,
  type WorldCommand,
  type WorldFrame,
  type WorldObject,
  type WorldSnapshot,
  type WorldTotals,
  type WorldVector3,
} from "./types";

const GENESIS_TOTALS: WorldTotals = { matter: 200, energy: 100 };
const MAX_EVENT_HISTORY = 160;

interface MutableWorld {
  tick: number;
  revision: number;
  reserveMatter: number;
  reserveEnergy: number;
  nextObjectOrdinal: number;
  objects: Map<string, WorldObject>;
}

interface AppliedCommand {
  accepted: true;
  summary: string;
  resourceDelta?: ResourceDelta;
}

interface RejectedCommand {
  accepted: false;
  summary: string;
  reasonCode: RejectionReason;
}

type CommandOutcome = AppliedCommand | RejectedCommand;

function cloneVector(vector: WorldVector3): WorldVector3 {
  return { x: vector.x, y: vector.y, z: vector.z };
}

function cloneCollision(collision: CollisionProxy): CollisionProxy {
  return collision.kind === "box"
    ? { kind: "box", size: cloneVector(collision.size) }
    : { kind: "sphere", radius: collision.radius };
}

function cloneObject(object: WorldObject): WorldObject {
  return {
    ...object,
    position: cloneVector(object.position),
    collision: cloneCollision(object.collision),
    state: { ...object.state },
  };
}

function cloneCommand(command: WorldCommand): WorldCommand {
  if (command.type === "create-object") {
    return { ...command, position: cloneVector(command.position) };
  }
  if (command.type === "move-object") {
    return { ...command, position: cloneVector(command.position) };
  }
  return { ...command };
}

function cloneMutable(world: MutableWorld): MutableWorld {
  return {
    ...world,
    objects: new Map(
      [...world.objects].map(([id, object]) => [id, cloneObject(object)]),
    ),
  };
}

function collisionFor(shape: ObjectShape): CollisionProxy {
  return shape === "box"
    ? { kind: "box", size: { x: 1.8, y: 1.4, z: 1.8 } }
    : { kind: "sphere", radius: 0.9 };
}

function creationCost(shape: ObjectShape) {
  return shape === "box" ? { matter: 12, energy: 2 } : { matter: 8, energy: 1 };
}

function groundedPosition(
  shape: ObjectShape,
  position: WorldVector3,
): WorldVector3 {
  return {
    x: position.x,
    y: shape === "box" ? 0.7 : 0.9,
    z: position.z,
  };
}

function isInsideBounds(position: WorldVector3): boolean {
  return (
    Number.isFinite(position.x) &&
    Number.isFinite(position.z) &&
    Math.abs(position.x) <= WORLD_BOUNDS &&
    Math.abs(position.z) <= WORLD_BOUNDS
  );
}

function createGenesis(seed: number): MutableWorld {
  const firstId = objectId(seed, 1);
  const secondId = objectId(seed, 2);
  return {
    tick: 0,
    revision: 0,
    reserveMatter: 160,
    reserveEnergy: 84,
    nextObjectOrdinal: 3,
    objects: new Map([
      [
        firstId,
        {
          id: firstId,
          label: "基准体 A",
          ownerId: "lab-operator",
          position: { x: -3, y: 0.7, z: 0 },
          collision: collisionFor("box"),
          matter: 24,
          energy: 12,
          state: { sleeping: true, origin: "genesis" },
        },
      ],
      [
        secondId,
        {
          id: secondId,
          label: "基准体 B",
          ownerId: "lab-operator",
          position: { x: 3, y: 0.9, z: 1 },
          collision: collisionFor("sphere"),
          matter: 16,
          energy: 4,
          state: { sleeping: true, origin: "genesis" },
        },
      ],
    ]),
  };
}

function objectId(seed: number, ordinal: number): string {
  return `obj-${(seed >>> 0).toString(16)}-${ordinal.toString(36)}`;
}

function totalsFor(world: MutableWorld): WorldTotals {
  let matter = world.reserveMatter;
  let energy = world.reserveEnergy;
  for (const object of world.objects.values()) {
    matter += object.matter;
    energy += object.energy;
  }
  return { matter, energy };
}

function accountExists(world: MutableWorld, account: string): boolean {
  return account === WORLD_RESERVE_ACCOUNT || world.objects.has(account);
}

function resourceAt(
  world: MutableWorld,
  account: string,
  resource: ResourceKind,
): number {
  if (account === WORLD_RESERVE_ACCOUNT) {
    return resource === "matter" ? world.reserveMatter : world.reserveEnergy;
  }
  const object = world.objects.get(account);
  if (!object) return 0;
  return object[resource];
}

function setResource(
  world: MutableWorld,
  account: string,
  resource: ResourceKind,
  amount: number,
): void {
  if (account === WORLD_RESERVE_ACCOUNT) {
    if (resource === "matter") world.reserveMatter = amount;
    else world.reserveEnergy = amount;
    return;
  }
  const object = world.objects.get(account);
  if (object) object[resource] = amount;
}

function applyCreate(
  world: MutableWorld,
  command: Extract<WorldCommand, { type: "create-object" }>,
  seed: number,
): CommandOutcome {
  if (!isInsideBounds(command.position)) {
    return {
      accepted: false,
      reasonCode: "out-of-bounds",
      summary: "创建位置超出实验场边界",
    };
  }
  const cost = creationCost(command.shape);
  if (world.reserveMatter < cost.matter) {
    return {
      accepted: false,
      reasonCode: "insufficient-matter",
      summary: `储备物质不足 ${cost.matter}`,
    };
  }
  if (world.reserveEnergy < cost.energy) {
    return {
      accepted: false,
      reasonCode: "insufficient-energy",
      summary: `储备能量不足 ${cost.energy}`,
    };
  }

  const ordinal = world.nextObjectOrdinal;
  const id = objectId(seed, ordinal);
  world.nextObjectOrdinal += 1;
  world.reserveMatter -= cost.matter;
  world.reserveEnergy -= cost.energy;
  world.objects.set(id, {
    id,
    label: command.label?.trim() || `实验体 ${ordinal}`,
    ownerId: "lab-operator",
    position: groundedPosition(command.shape, command.position),
    collision: collisionFor(command.shape),
    matter: cost.matter,
    energy: cost.energy,
    state: { sleeping: true, origin: "fabricated" },
  });
  return {
    accepted: true,
    summary: `制造 ${command.shape === "box" ? "箱体" : "球体"} ${id}`,
    resourceDelta: {
      resource: "matter",
      from: WORLD_RESERVE_ACCOUNT,
      to: id,
      amount: cost.matter,
    },
  };
}

function applyMove(
  world: MutableWorld,
  command: Extract<WorldCommand, { type: "move-object" }>,
): CommandOutcome {
  const object = world.objects.get(command.objectId);
  if (!object) {
    return {
      accepted: false,
      reasonCode: "object-not-found",
      summary: `找不到对象 ${command.objectId}`,
    };
  }
  if (!isInsideBounds(command.position)) {
    return {
      accepted: false,
      reasonCode: "out-of-bounds",
      summary: "移动目标超出实验场边界",
    };
  }
  const shape = object.collision.kind === "box" ? "box" : "sphere";
  object.position = groundedPosition(shape, command.position);
  object.state = { ...object.state, sleeping: false };
  return {
    accepted: true,
    summary: `移动 ${object.label} 至 (${object.position.x}, ${object.position.z})`,
  };
}

function applyTransfer(
  world: MutableWorld,
  command: Extract<WorldCommand, { type: "transfer-resource" }>,
): CommandOutcome {
  if (!Number.isInteger(command.amount) || command.amount <= 0) {
    return {
      accepted: false,
      reasonCode: "invalid-amount",
      summary: "转移量必须为正整数",
    };
  }
  if (command.from === command.to) {
    return {
      accepted: false,
      reasonCode: "same-account",
      summary: "来源与目标账户不能相同",
    };
  }
  if (
    !accountExists(world, command.from) ||
    !accountExists(world, command.to)
  ) {
    return {
      accepted: false,
      reasonCode: "account-not-found",
      summary: "资源账户不存在",
    };
  }
  const available = resourceAt(world, command.from, command.resource);
  if (available < command.amount) {
    const reasonCode =
      command.resource === "matter"
        ? "insufficient-matter"
        : "insufficient-energy";
    return {
      accepted: false,
      reasonCode,
      summary: `${command.resource === "matter" ? "物质" : "能量"}余额不足：需要 ${command.amount}，仅有 ${available}`,
    };
  }
  setResource(
    world,
    command.from,
    command.resource,
    available - command.amount,
  );
  setResource(
    world,
    command.to,
    command.resource,
    resourceAt(world, command.to, command.resource) + command.amount,
  );
  return {
    accepted: true,
    summary: `转移 ${command.amount} ${command.resource === "matter" ? "物质" : "能量"}`,
    resourceDelta: {
      resource: command.resource,
      from: command.from,
      to: command.to,
      amount: command.amount,
    },
  };
}

function applyAdvance(
  world: MutableWorld,
  command: Extract<WorldCommand, { type: "advance" }>,
): CommandOutcome {
  if (
    !Number.isInteger(command.ticks) ||
    command.ticks < 1 ||
    command.ticks > 1000
  ) {
    return {
      accepted: false,
      reasonCode: "invalid-tick-count",
      summary: "单次推进 tick 必须在 1 到 1000 之间",
    };
  }
  world.tick += command.ticks;
  return {
    accepted: true,
    summary: `世界时钟推进 ${command.ticks} tick`,
  };
}

function applyCommand(
  world: MutableWorld,
  command: WorldCommand,
  seed: number,
): CommandOutcome {
  switch (command.type) {
    case "create-object":
      return applyCreate(world, command, seed);
    case "move-object":
      return applyMove(world, command);
    case "transfer-resource":
      return applyTransfer(world, command);
    case "advance":
      return applyAdvance(world, command);
  }
}

function isConserved(totals: WorldTotals): boolean {
  return (
    totals.matter === GENESIS_TOTALS.matter &&
    totals.energy === GENESIS_TOTALS.energy
  );
}

export class ProgrammableWorldRuntime {
  private world: MutableWorld;
  private readonly events: KernelEvent[] = [];
  private readonly commandLog: LoggedCommand[] = [];
  private nextCommandId = 1;

  constructor(readonly seed = 20_260_817) {
    this.world = createGenesis(seed);
  }

  execute(command: WorldCommand): CommandReceipt {
    const commandId = this.nextCommandId;
    this.nextCommandId += 1;
    const draft = cloneMutable(this.world);
    let outcome = applyCommand(draft, command, this.seed);

    if (outcome.accepted && !isConserved(totalsFor(draft))) {
      outcome = {
        accepted: false,
        reasonCode: "conservation-violation",
        summary: "事务违反世界总量守恒，已整体回滚",
      };
    }

    if (outcome.accepted) {
      draft.revision += 1;
      this.world = draft;
    }

    const receipt: CommandReceipt = outcome.accepted
      ? {
          commandId,
          accepted: true,
          appliedAtTick: this.world.tick,
          revision: this.world.revision,
        }
      : {
          commandId,
          accepted: false,
          appliedAtTick: this.world.tick,
          revision: this.world.revision,
          reasonCode: outcome.reasonCode,
        };

    this.commandLog.push({
      commandId,
      command: cloneCommand(command),
      receipt: { ...receipt },
    });
    this.events.push({
      id: `event-${commandId}`,
      commandId,
      tick: this.world.tick,
      revision: this.world.revision,
      commandType: command.type,
      status: outcome.accepted ? "accepted" : "rejected",
      summary: outcome.summary,
      ...(!outcome.accepted ? { reasonCode: outcome.reasonCode } : {}),
      ...(outcome.accepted && outcome.resourceDelta
        ? { resourceDelta: { ...outcome.resourceDelta } }
        : {}),
    });
    if (this.events.length > MAX_EVENT_HISTORY) this.events.shift();
    return receipt;
  }

  snapshot(): WorldSnapshot {
    const objects = [...this.world.objects.values()]
      .map(cloneObject)
      .sort((left, right) => left.id.localeCompare(right.id));
    const totals = totalsFor(this.world);
    const payload = {
      schemaVersion: WORLD_SCHEMA_VERSION,
      seed: this.seed,
      tick: this.world.tick,
      revision: this.world.revision,
      bounds: WORLD_BOUNDS,
      reserve: {
        matter: this.world.reserveMatter,
        energy: this.world.reserveEnergy,
      },
      totals,
      objects,
    };
    return { ...payload, stateHash: deterministicHash(payload) };
  }

  frame(): WorldFrame {
    return {
      snapshot: this.snapshot(),
      events: this.events.map((event) => ({
        ...event,
        ...(event.resourceDelta
          ? { resourceDelta: { ...event.resourceDelta } }
          : {}),
      })),
      commandCount: this.commandLog.length,
    };
  }

  replay(): ReplayReport {
    const replayed = new ProgrammableWorldRuntime(this.seed);
    let firstMismatchCommandId: number | undefined;

    for (const logged of this.commandLog) {
      const receipt = replayed.execute(logged.command);
      const sameOutcome =
        receipt.accepted === logged.receipt.accepted &&
        (receipt.accepted ||
          (!logged.receipt.accepted &&
            receipt.reasonCode === logged.receipt.reasonCode));
      if (!sameOutcome && firstMismatchCommandId === undefined) {
        firstMismatchCommandId = logged.commandId;
      }
    }

    const expectedHash = this.snapshot().stateHash;
    const actualHash = replayed.snapshot().stateHash;
    return {
      matches:
        firstMismatchCommandId === undefined && expectedHash === actualHash,
      commandCount: this.commandLog.length,
      expectedHash,
      actualHash,
      ...(firstMismatchCommandId === undefined
        ? {}
        : { firstMismatchCommandId }),
    };
  }
}

export function createProgrammableWorldRuntime(
  seed?: number,
): ProgrammableWorldRuntime {
  return new ProgrammableWorldRuntime(seed);
}
