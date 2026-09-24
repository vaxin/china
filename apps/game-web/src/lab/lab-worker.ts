/// <reference lib="webworker" />

import {
  createProgrammableWorldRuntime,
  type ProgrammableWorldRuntime,
} from "@empire/world-kernel";

import type {
  LabPresentationFrame,
  LabSpeed,
  LabWorkerRequest,
  LabWorkerResponse,
} from "./lab-protocol";

const workerScope = self as unknown as DedicatedWorkerGlobalScope;
let runtime: ProgrammableWorldRuntime | undefined;
let running = false;
let speed: LabSpeed = 1;
let timer: number | undefined;

function currentRuntime(): ProgrammableWorldRuntime {
  runtime ??= createProgrammableWorldRuntime();
  return runtime;
}

function frame(): LabPresentationFrame {
  return { ...currentRuntime().frame(), running, speed };
}

function publishFrame(): void {
  const response: LabWorkerResponse = { type: "frame", frame: frame() };
  workerScope.postMessage(response);
}

function clearClock(): void {
  if (timer !== undefined) workerScope.clearInterval(timer);
  timer = undefined;
}

function configureClock(): void {
  clearClock();
  if (!running) return;
  timer = workerScope.setInterval(() => {
    currentRuntime().execute({ type: "advance", ticks: 1 });
    publishFrame();
  }, 600 / speed);
}

function postError(error: unknown): void {
  const response: LabWorkerResponse = {
    type: "worker-error",
    message: error instanceof Error ? error.message : "实验内核发生未知错误",
  };
  workerScope.postMessage(response);
}

workerScope.addEventListener(
  "message",
  (event: MessageEvent<LabWorkerRequest>) => {
    try {
      const request = event.data;
      switch (request.type) {
        case "initialize":
          running = false;
          speed = 1;
          clearClock();
          runtime = createProgrammableWorldRuntime(request.seed);
          publishFrame();
          break;
        case "command":
          currentRuntime().execute(request.command);
          publishFrame();
          break;
        case "set-running":
          running = request.running;
          configureClock();
          publishFrame();
          break;
        case "set-speed":
          speed = request.speed;
          configureClock();
          publishFrame();
          break;
        case "reset": {
          const seed = currentRuntime().seed;
          running = false;
          clearClock();
          runtime = createProgrammableWorldRuntime(seed);
          publishFrame();
          break;
        }
        case "replay": {
          const response: LabWorkerResponse = {
            type: "replay-report",
            report: currentRuntime().replay(),
          };
          workerScope.postMessage(response);
          break;
        }
      }
    } catch (error) {
      postError(error);
    }
  },
);
