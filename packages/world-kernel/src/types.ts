export const WORLD_SCHEMA_VERSION = 1 as const;
export const WORLD_BOUNDS = 9 as const;
export const WORLD_RESERVE_ACCOUNT = "world-reserve" as const;

export type ObjectShape = "box" | "sphere";
export type ResourceKind = "matter" | "energy";
export type WorldAccount = typeof WORLD_RESERVE_ACCOUNT | string;

export interface WorldVector3 {
  x: number;
  y: number;
  z: number;
}

export interface BoxProxy {
  kind: "box";
  size: WorldVector3;
}

export interface SphereProxy {
  kind: "sphere";
  radius: number;
}

export type CollisionProxy = BoxProxy | SphereProxy;

export interface WorldObject {
  id: string;
  label: string;
  ownerId: string;
  position: WorldVector3;
  collision: CollisionProxy;
  matter: number;
  energy: number;
  state: Record<string, string | number | boolean | null>;
}

export interface WorldReserve {
  matter: number;
  energy: number;
}

export interface WorldTotals {
  matter: number;
  energy: number;
}

export interface WorldSnapshot {
  schemaVersion: typeof WORLD_SCHEMA_VERSION;
  seed: number;
  tick: number;
  revision: number;
  bounds: number;
  reserve: WorldReserve;
  totals: WorldTotals;
  objects: WorldObject[];
  stateHash: string;
}

export interface CreateObjectCommand {
  type: "create-object";
  shape: ObjectShape;
  position: WorldVector3;
  label?: string;
}

export interface MoveObjectCommand {
  type: "move-object";
  objectId: string;
  position: WorldVector3;
}

export interface TransferResourceCommand {
  type: "transfer-resource";
  resource: ResourceKind;
  from: WorldAccount;
  to: WorldAccount;
  amount: number;
}

export interface AdvanceWorldCommand {
  type: "advance";
  ticks: number;
}

export type WorldCommand =
  | CreateObjectCommand
  | MoveObjectCommand
  | TransferResourceCommand
  | AdvanceWorldCommand;

export type RejectionReason =
  | "object-not-found"
  | "account-not-found"
  | "insufficient-matter"
  | "insufficient-energy"
  | "out-of-bounds"
  | "invalid-amount"
  | "same-account"
  | "invalid-tick-count"
  | "conservation-violation";

export interface AcceptedCommandReceipt {
  commandId: number;
  accepted: true;
  appliedAtTick: number;
  revision: number;
}

export interface RejectedCommandReceipt {
  commandId: number;
  accepted: false;
  appliedAtTick: number;
  revision: number;
  reasonCode: RejectionReason;
}

export type CommandReceipt = AcceptedCommandReceipt | RejectedCommandReceipt;

export interface ResourceDelta {
  resource: ResourceKind;
  from: WorldAccount;
  to: WorldAccount;
  amount: number;
}

export interface KernelEvent {
  id: string;
  commandId: number;
  tick: number;
  revision: number;
  commandType: WorldCommand["type"];
  status: "accepted" | "rejected";
  summary: string;
  reasonCode?: RejectionReason;
  resourceDelta?: ResourceDelta;
}

export interface LoggedCommand {
  commandId: number;
  command: WorldCommand;
  receipt: CommandReceipt;
}

export interface WorldFrame {
  snapshot: WorldSnapshot;
  events: KernelEvent[];
  commandCount: number;
}

export interface ReplayReport {
  matches: boolean;
  commandCount: number;
  expectedHash: string;
  actualHash: string;
  firstMismatchCommandId?: number;
}
