import type { WorldCommand } from "@empire/world-kernel";

import type {
  LabPresentationFrame,
  LabSpeed,
  LabWorkerRequest,
  LabWorkerResponse,
} from "./lab-protocol";

interface LabWorkerCallbacks {
  onFrame: (frame: LabPresentationFrame) => void;
  onReplay: (
    report: Extract<LabWorkerResponse, { type: "replay-report" }>["report"],
  ) => void;
  onError: (message: string) => void;
}

export class LabWorkerClient {
  private readonly worker: Worker;

  constructor(private readonly callbacks: LabWorkerCallbacks) {
    this.worker = new Worker(new URL("./lab-worker.ts", import.meta.url), {
      type: "module",
    });
    this.worker.addEventListener(
      "message",
      (event: MessageEvent<LabWorkerResponse>) => {
        const response = event.data;
        if (response.type === "frame") callbacks.onFrame(response.frame);
        else if (response.type === "replay-report")
          callbacks.onReplay(response.report);
        else callbacks.onError(response.message);
      },
    );
    this.worker.addEventListener("error", (event) => {
      callbacks.onError(event.message || "实验 Worker 启动失败");
    });
  }

  private send(request: LabWorkerRequest): void {
    this.worker.postMessage(request);
  }

  initialize(seed = 20_260_817): void {
    this.send({ type: "initialize", seed });
  }

  command(command: WorldCommand): void {
    this.send({ type: "command", command });
  }

  setRunning(running: boolean): void {
    this.send({ type: "set-running", running });
  }

  setSpeed(speed: LabSpeed): void {
    this.send({ type: "set-speed", speed });
  }

  reset(): void {
    this.send({ type: "reset" });
  }

  replay(): void {
    this.send({ type: "replay" });
  }

  dispose(): void {
    this.worker.terminate();
  }
}
