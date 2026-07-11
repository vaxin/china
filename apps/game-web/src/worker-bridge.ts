import type {
  GameCommand,
  WorldSnapshot,
  WorkerRequest,
  WorkerResponse,
} from "@empire/protocol";

type ReadyResponse = Extract<WorkerResponse, { type: "ready" }>;
type CommandResponse = Extract<WorkerResponse, { type: "command-result" }>;

export class SimulationWorkerClient {
  private readonly worker: Worker;
  private readyResolver?: (response: ReadyResponse) => void;
  private readyRejecter?: (error: Error) => void;
  private readonly commandResolvers = new Map<
    number,
    {
      resolve: (response: CommandResponse) => void;
      reject: (error: Error) => void;
    }
  >();

  constructor() {
    this.worker = new Worker(
      new URL("./simulation.worker.ts", import.meta.url),
      {
        type: "module",
      },
    );
    this.worker.addEventListener(
      "message",
      (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;
        if (response.type === "protocol-error") {
          const error = new Error("模拟 Worker 拒绝了无效请求");
          if (response.seq !== undefined) {
            const pending = this.commandResolvers.get(response.seq);
            if (pending) {
              this.commandResolvers.delete(response.seq);
              pending.reject(error);
            }
          } else {
            this.readyRejecter?.(error);
            this.readyResolver = undefined;
            this.readyRejecter = undefined;
            for (const pending of this.commandResolvers.values()) {
              pending.reject(error);
            }
            this.commandResolvers.clear();
          }
          return;
        }
        if (response.type === "ready") {
          this.readyResolver?.(response);
          this.readyResolver = undefined;
          this.readyRejecter = undefined;
          return;
        }

        const pending = this.commandResolvers.get(response.result.seq);
        if (!pending) return;
        this.commandResolvers.delete(response.result.seq);
        pending.resolve(response);
      },
    );
    this.worker.addEventListener("error", (event) => {
      const error = new Error(event.message || "模拟 Worker 启动失败");
      this.readyRejecter?.(error);
      for (const pending of this.commandResolvers.values())
        pending.reject(error);
      this.commandResolvers.clear();
    });
  }

  initialize(snapshot?: WorldSnapshot): Promise<ReadyResponse> {
    return new Promise((resolve, reject) => {
      this.readyResolver = resolve;
      this.readyRejecter = reject;
      const request: WorkerRequest = {
        type: "initialize",
        ...(snapshot ? { snapshot } : {}),
      };
      this.worker.postMessage(request);
    });
  }

  command(command: GameCommand): Promise<CommandResponse> {
    return new Promise((resolve, reject) => {
      this.commandResolvers.set(command.seq, { resolve, reject });
      const request: WorkerRequest = { type: "command", command };
      this.worker.postMessage(request);
    });
  }

  dispose(): void {
    this.worker.terminate();
    const error = new Error("模拟 Worker 已关闭");
    this.readyRejecter?.(error);
    for (const pending of this.commandResolvers.values()) pending.reject(error);
    this.commandResolvers.clear();
  }
}
