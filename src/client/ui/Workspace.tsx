import React, { useState, useEffect, useSyncExternalStore } from "react";
import { WorkspaceSession, loadingTimeline } from "../workspace-session.ts";
import { CodeEditor } from "./CodeEditor.tsx";
import { FlightLog } from "./FlightLog.tsx";
import { LivePreview } from "./LivePreview.tsx";
import { Pane } from "./Pane.tsx";
import { ResizablePanes } from "./ResizablePanes.tsx";
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
    const timeoutId = setTimeout(() => {
      setSession(null);
    }, 1000);
    WorkspaceSession.create(serverCode, clientCode, abort.signal).then((nextSession) => {
      if (!abort.signal.aborted) {
        clearTimeout(timeoutId);
        setSession(nextSession);
      }
    });
    return () => {
      clearTimeout(timeoutId);
      abort.abort();
    };
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

  const timeline = session?.timeline ?? loadingTimeline;

  const { entries, cursor, totalChunks, isAtStart, isAtEnd, isStreaming } = useSyncExternalStore(
    timeline.subscribe,
    timeline.getSnapshot,
  );

  const isLoading = !session;
  const isError = session?.state.status === "error";

  return (
    <main className="Workspace">
      <ResizablePanes
        topLeft={
          <CodeEditor label="server" defaultValue={serverCode} onChange={handleServerChange} />
        }
        bottomLeft={
          <CodeEditor label="client" defaultValue={clientCode} onChange={handleClientChange} />
        }
        topRight={
          <Pane label="flight">
            {isLoading ? (
              <div className="Workspace-loadingOutput">
                <span className="Workspace-loadingEmpty Workspace-loadingEmpty--waiting">
                  Loading
                </span>
              </div>
            ) : isError ? (
              <pre className="Workspace-errorOutput">{session.state.message}</pre>
            ) : (
              <FlightLog
                entries={entries}
                cursor={cursor}
                availableActions={session.state.availableActions}
                onAddRawAction={session.addRawAction}
                onDeleteEntry={session.timeline.deleteEntry}
              />
            )}
          </Pane>
        }
        bottomRight={
          <LivePreview
            entries={entries}
            cursor={cursor}
            totalChunks={totalChunks}
            isAtStart={isAtStart}
            isAtEnd={isAtEnd}
            isStreaming={isStreaming}
            isLoading={isLoading || isError}
            onStep={timeline.stepForward}
            onSkip={timeline.skipToEntryEnd}
            onReset={reset}
          />
        }
      />
    </main>
  );
}
