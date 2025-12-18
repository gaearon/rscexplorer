import React, { useState, useEffect, useSyncExternalStore, startTransition } from "react";
import { WorkspaceSession } from "../workspace-session.ts";
import { CodeEditor } from "./CodeEditor.tsx";
import { FlightLog } from "./FlightLog.tsx";
import { LivePreview } from "./LivePreview.tsx";

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
    <main>
      <CodeEditor
        label="server"
        defaultValue={serverCode}
        onChange={handleServerChange}
        className="editor-server"
      />
      <CodeEditor
        label="client"
        defaultValue={clientCode}
        onChange={handleClientChange}
        className="editor-client"
      />
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
      <div className="pane flight-pane">
        <div className="pane-header">flight</div>
        <div className="flight-output">
          <span className="empty waiting-dots">Compiling</span>
        </div>
      </div>
      <div className="pane preview-pane">
        <div className="pane-header">preview</div>
        <div className="preview-container">
          <span className="empty waiting-dots">Compiling</span>
        </div>
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
        <div className="pane flight-pane">
          <div className="pane-header">flight</div>
          <pre className="flight-output error">{session.state.message}</pre>
        </div>
        <div className="pane preview-pane">
          <div className="pane-header">preview</div>
          <div className="preview-container">
            <span className="empty error">Compilation error</span>
          </div>
        </div>
      </>
    );
  }

  const { availableActions } = session.state;

  return (
    <>
      <div className="pane flight-pane">
        <div className="pane-header">flight</div>
        <FlightLog
          entries={entries}
          cursor={cursor}
          availableActions={availableActions}
          onAddRawAction={(name, payload) => session.addRawAction(name, payload)}
          onDeleteEntry={(idx) => session.timeline.deleteEntry(idx)}
        />
      </div>
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
    </>
  );
}
