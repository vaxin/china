/// <reference lib="webworker" />

import type { WorkerResponse } from "@empire/protocol";
import { createSimulationRuntime } from "@empire/simulation";

const runtime = createSimulationRuntime();

self.addEventListener("message", (event: MessageEvent<unknown>) => {
  const response: WorkerResponse = runtime.handle(event.data);
  self.postMessage(response);
});
