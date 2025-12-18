import { encodeReply } from "react-server-dom-webpack/client";
import { Timeline } from "./runtime/timeline.ts";
import { SteppableStream, registerClientModule, evaluateClientModule } from "./runtime/index.ts";
import { WorkerClient, encodeArgs, type EncodedArgs } from "./worker-client.ts";
import {
  parseClientModule,
  parseServerActions,
  compileToCommonJS,
  buildManifest,
} from "../shared/compiler.ts";

export type SessionState =
  | { status: "ready"; availableActions: string[] }
  | { status: "error"; message: string };

let lastId = 0;

export class WorkspaceSession {
  readonly timeline = new Timeline();
  readonly state: SessionState;
  readonly id: number = lastId++;
  private worker: WorkerClient;

  private constructor(worker: WorkerClient, state: SessionState) {
    this.worker = worker;
    this.state = state;
  }

  static async create(
    serverCode: string,
    clientCode: string,
    signal: AbortSignal,
  ): Promise<WorkspaceSession> {
    const worker = new WorkerClient(signal);

    try {
      const clientExports = parseClientModule(clientCode);
      const manifest = buildManifest("client", clientExports);
      const compiledClient = compileToCommonJS(clientCode);
      const clientModule = evaluateClientModule(compiledClient);
      registerClientModule("client", clientModule);

      const actionNames = parseServerActions(serverCode);
      const compiledServer = compileToCommonJS(serverCode);

      await worker.deploy(compiledServer, manifest, actionNames);
      const renderRaw = await worker.render();

      const session = new WorkspaceSession(worker, {
        status: "ready",
        availableActions: actionNames,
      });

      const renderStream = new SteppableStream(renderRaw, {
        callServer: session.callServer.bind(session),
      });
      await renderStream.waitForBuffer();
      session.timeline.setRender(renderStream);

      return session;
    } catch (err) {
      return new WorkspaceSession(worker, {
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async runAction(
    actionName: string,
    args: EncodedArgs,
    argsDisplay: string,
  ): Promise<SteppableStream> {
    const responseRaw = await this.worker.callAction(actionName, args);
    const stream = new SteppableStream(responseRaw, {
      callServer: this.callServer.bind(this),
    });
    await stream.waitForBuffer();
    this.timeline.addAction(actionName, argsDisplay, stream);
    return stream;
  }

  private async callServer(actionId: string, args: unknown[]): Promise<unknown> {
    const actionName = actionId.split("#")[0] ?? actionId;
    const encodedArgs = await encodeReply(args);
    const argsDisplay =
      typeof encodedArgs === "string"
        ? `0=${encodedArgs}`
        : new URLSearchParams(encodedArgs as unknown as Record<string, string>).toString();
    const stream = await this.runAction(actionName, encodeArgs(encodedArgs), argsDisplay);
    return stream.flightPromise;
  }

  async addRawAction(actionName: string, rawPayload: string): Promise<void> {
    await this.runAction(actionName, { type: "formdata", data: rawPayload }, rawPayload);
  }
}
