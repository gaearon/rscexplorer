import React, { useState, useEffect, useSyncExternalStore, startTransition } from "react";
import { WorkspaceSession } from "../workspace-session.ts";
import { CodeEditor } from "./CodeEditor.tsx";
import { FlightLog } from "./FlightLog.tsx";
import { LivePreview } from "./LivePreview.tsx";
import { Pane } from "./Pane.tsx";
import "./Workspace.css";

type WorkspaceProps = {
  initialServerCode: string;
  initialClientCode: string;
  onCodeChange?: (server: string, client: string) => void;
};

export function Workspace({
  initialServerCode,
  initialClientCode,
  onCodeChange,
}: WorkspaceProps): React.ReactElement {
  const [serverCode, setServerCode] = useState(initialServerCode);
  const [clientCode, setClientCode] = useState(initialClientCode);
  const [resetKey, setResetKey] = useState(0);
  const [session, setSession] = useState<WorkspaceSession | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    WorkspaceSession.create(serverCode, clientCode, abort.signal).then((nextSession) => {
      if (!abort.signal.aborted) {
        startTransition(() => {
          setSession(nextSession);
        });
      }
    });
    return () => abort.abort();
  }, [serverCode, clientCode, resetKey]);

  function handleServerChange(code: string) {
    setServerCode(code);
    onCodeChange?.(code, clientCode);
  }

  function handleClientChange(code: string) {
    setClientCode(code);
    onCodeChange?.(serverCode, code);
  }

  function reset() {
    setResetKey((k) => k + 1);
  }

  return (
    <main className="Workspace">
      <div className="Workspace-server">
        <CodeEditor label="server" defaultValue={serverCode} onChange={handleServerChange} />
      </div>
      <div className="Workspace-client">
        <CodeEditor label="client" defaultValue={clientCode} onChange={handleClientChange} />
      </div>
      {session ? (
        <WorkspaceContent session={session} onReset={reset} key={session.id} />
      ) : (
        <WorkspaceLoading />
      )}
    </main>
  );
}

function WorkspaceLoading(): React.ReactElement {
  return (
    <>
      <div className="Workspace-flight">
        <Pane label="flight">
          <div className="Workspace-loadingOutput">
            <span className="Workspace-loadingEmpty Workspace-loadingEmpty--waiting">
              Compiling
            </span>
          </div>
        </Pane>
      </div>
      <div className="Workspace-preview">
        <Pane label="preview">
          <div className="Workspace-loadingPreview">
            <span className="Workspace-loadingEmpty Workspace-loadingEmpty--waiting">
              Compiling
            </span>
          </div>
        </Pane>
      </div>
    </>
  );
}

type WorkspaceContentProps = {
  session: WorkspaceSession;
  onReset: () => void;
};

function WorkspaceContent({ session, onReset }: WorkspaceContentProps): React.ReactElement {
  const { entries, cursor, totalChunks, isAtStart, isAtEnd } = useSyncExternalStore(
    session.timeline.subscribe,
    session.timeline.getSnapshot,
  );

  if (session.state.status === "error") {
    return (
      <>
        <div className="Workspace-flight">
          <Pane label="flight">
            <pre className="Workspace-errorOutput">{session.state.message}</pre>
          </Pane>
        </div>
        <div className="Workspace-preview">
          <Pane label="preview">
            <div className="Workspace-errorPreview">
              <span className="Workspace-errorMessage">Compilation error</span>
            </div>
          </Pane>
        </div>
      </>
    );
  }

  const { availableActions } = session.state;

  return (
    <>
      <div className="Workspace-flight">
        <Pane label="flight">
          <FlightLog
            entries={entries}
            cursor={cursor}
            availableActions={availableActions}
            onAddRawAction={(name, payload) => session.addRawAction(name, payload)}
            onDeleteEntry={(idx) => session.timeline.deleteEntry(idx)}
          />
        </Pane>
      </div>
      <div className="Workspace-preview">
        <LivePreview
          entries={entries}
          cursor={cursor}
          totalChunks={totalChunks}
          isAtStart={isAtStart}
          isAtEnd={isAtEnd}
          onStep={() => session.timeline.stepForward()}
          onSkip={() => session.timeline.skipToEntryEnd()}
          onReset={onReset}
        />
      </div>
    </>
  );
}
