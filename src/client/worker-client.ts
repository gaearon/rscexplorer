import workerUrl from "../server/worker-server.ts?rolldown-worker";
import type { Response, EncodedArgs, Deploy, Render, CallAction } from "../server/worker-server.ts";
import type { ClientManifest } from "../shared/compiler.ts";

export type { EncodedArgs, ClientManifest };

export function encodeArgs(encoded: FormData | string): EncodedArgs {
  if (encoded instanceof FormData) {
    return {
      type: "formdata",
      data: new URLSearchParams(encoded as unknown as Record<string, string>).toString(),
    };
  }
  return { type: "string", data: encoded };
}

export class WorkerClient {
  private worker: Worker;
  private requests = new Map<string, ReadableStreamDefaultController<Uint8Array>>();
  private readyPromise: Promise<void>;
  private readyResolve!: () => void;

  constructor(signal: AbortSignal) {
    this.worker = new Worker(workerUrl);

    const dispose = (reason: unknown) => {
      for (const controller of this.requests.values()) {
        controller.error(reason);
      }
      this.worker.terminate();
      this.requests.clear();
    };

    this.readyPromise = new Promise((resolve, reject) => {
      this.readyResolve = resolve;
      signal.addEventListener("abort", () => {
        reject(signal.reason);
        dispose(signal.reason);
      });
    });
    this.worker.onmessage = (msg) => this.handleMessage(msg);
    this.worker.onerror = (e) => dispose(e.error);
  }

  private handleMessage(event: MessageEvent<Response>): void {
    const msg = event.data;

    if (msg.type === "ready") {
      this.readyResolve();
      return;
    }

    const controller = this.requests.get(msg.requestId);
    if (!controller) throw new Error(`Unknown request: ${msg.requestId}`);

    switch (msg.type) {
      case "next":
        controller.enqueue(msg.value);
        break;

      case "done":
        controller.close();
        this.requests.delete(msg.requestId);
        break;

      case "throw": {
        const err = new Error(msg.error);
        if (msg.stack) {
          err.stack = msg.stack;
        }
        controller.error(err);
        this.requests.delete(msg.requestId);
        break;
      }
    }
  }

  private nextRequestId = 0;

  private async request(body: Record<string, unknown>): Promise<ReadableStream<Uint8Array>> {
    await this.readyPromise;
    const requestId = String(this.nextRequestId++);
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const stream = new ReadableStream<Uint8Array>({
      start: (c) => {
        controller = c;
      },
    });
    this.requests.set(requestId, controller);
    this.worker.postMessage({ ...body, requestId });
    return stream;
  }

  deploy(...args: Parameters<Deploy>): Promise<ReturnType<Deploy>> {
    return this.request({ method: "deploy", args });
  }

  render(...args: Parameters<Render>): Promise<ReturnType<Render>> {
    return this.request({ method: "render", args });
  }

  callAction(...args: Parameters<CallAction>): ReturnType<CallAction> {
    return this.request({ method: "action", args });
  }
}
