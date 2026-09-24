import type {
  ReplayReport,
  WorldCommand,
  WorldFrame,
} from "@empire/world-kernel";

export type LabSpeed = 1 | 2 | 4;

export interface LabPresentationFrame extends WorldFrame {
  running: boolean;
  speed: LabSpeed;
}

export type LabWorkerRequest =
  | { type: "initialize"; seed?: number }
  | { type: "command"; command: WorldCommand }
  | { type: "set-running"; running: boolean }
  | { type: "set-speed"; speed: LabSpeed }
  | { type: "reset" }
  | { type: "replay" };

export type LabWorkerResponse =
  | { type: "frame"; frame: LabPresentationFrame }
  | { type: "replay-report"; report: ReplayReport }
  | { type: "worker-error"; message: string };
