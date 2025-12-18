import React, { useState, useRef, useEffect } from "react";
import { FlightTreeView } from "./TreeView.tsx";
import type { EntryView } from "../runtime/index.ts";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type RenderLogViewProps = {
  entry: EntryView;
  cursor: number;
};

function RenderLogView({ entry, cursor }: RenderLogViewProps): React.ReactElement | null {
  const activeRef = useRef<HTMLSpanElement>(null);
  const { rows, chunkStart, flightPromise } = entry;

  const nextLineIndex =
    cursor >= chunkStart && cursor < chunkStart + rows.length ? cursor - chunkStart : -1;

  useEffect(() => {
    if (activeRef.current && document.hasFocus()) {
      activeRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [nextLineIndex]);

  if (rows.length === 0) return null;

  const getLineClass = (i: number): string => {
    const globalChunk = chunkStart + i;
    if (globalChunk < cursor) return "line-done";
    if (globalChunk === cursor) return "line-next";
    return "line-pending";
  };

  const showTree = cursor >= chunkStart;

  return (
    <div className="log-entry-preview">
      <div className="log-entry-split">
        <div className="log-entry-flight-lines-wrapper">
          <pre className="log-entry-flight-lines">
            {rows.map((line, i) => (
              <span
                key={i}
                ref={i === nextLineIndex ? activeRef : null}
                className={`flight-line ${getLineClass(i)}`}
              >
                {escapeHtml(line)}
              </span>
            ))}
          </pre>
        </div>
        <div className="log-entry-tree">
          {showTree && <FlightTreeView flightPromise={flightPromise ?? null} />}
        </div>
      </div>
    </div>
  );
}

type FlightLogEntryProps = {
  entry: EntryView;
  index: number;
  cursor: number;
  onDelete: (index: number) => void;
};

function FlightLogEntry({
  entry,
  index,
  cursor,
  onDelete,
}: FlightLogEntryProps): React.ReactElement {
  const entryClass = entry.isActive ? "active" : entry.isDone ? "done-entry" : "pending-entry";

  return (
    <div className={`log-entry ${entryClass}`}>
      <div className="log-entry-header">
        <span className="log-entry-label">
          {entry.type === "render" ? "Render" : `Action: ${entry.name}`}
        </span>
        <span className="log-entry-header-right">
          {entry.canDelete && (
            <button className="delete-entry-btn" onClick={() => onDelete(index)} title="Delete">
              ×
            </button>
          )}
        </span>
      </div>
      {entry.type === "action" && entry.args && (
        <div className="log-entry-request">
          <pre className="log-entry-request-args">{entry.args}</pre>
        </div>
      )}
      <RenderLogView entry={entry} cursor={cursor} />
    </div>
  );
}

type FlightLogProps = {
  entries: EntryView[];
  cursor: number;
  availableActions: string[];
  onAddRawAction: (actionName: string, rawPayload: string) => void;
  onDeleteEntry: (index: number) => void;
};

export function FlightLog({
  entries,
  cursor,
  availableActions,
  onAddRawAction,
  onDeleteEntry,
}: FlightLogProps): React.ReactElement {
  const logRef = useRef<HTMLDivElement>(null);
  const [showRawInput, setShowRawInput] = useState(false);
  const [selectedAction, setSelectedAction] = useState("");
  const [rawPayload, setRawPayload] = useState("");

  const handleAddRaw = (): void => {
    if (rawPayload.trim()) {
      onAddRawAction(selectedAction, rawPayload);
      setSelectedAction(availableActions[0] ?? "");
      setRawPayload("");
      setShowRawInput(false);
    }
  };

  const handleShowRawInput = (): void => {
    setSelectedAction(availableActions[0] ?? "");
    setShowRawInput(true);
  };

  if (entries.length === 0) {
    return (
      <div className="flight-output">
        <span className="empty waiting-dots">Compiling</span>
      </div>
    );
  }

  return (
    <div className="flight-log" ref={logRef}>
      {entries.map((entry, i) => (
        <FlightLogEntry key={i} entry={entry} index={i} cursor={cursor} onDelete={onDeleteEntry} />
      ))}
      {availableActions.length > 0 &&
        (showRawInput ? (
          <div className="raw-input-form">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="raw-input-action"
            >
              {availableActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
            <textarea
              placeholder="Paste a request payload from a real action"
              value={rawPayload}
              onChange={(e) => setRawPayload(e.target.value)}
              className="raw-input-payload"
              rows={6}
            />
            <div className="raw-input-buttons">
              <button onClick={handleAddRaw} disabled={!rawPayload.trim()}>
                Add
              </button>
              <button onClick={() => setShowRawInput(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="add-raw-btn-wrapper">
            <button className="add-raw-btn" onClick={handleShowRawInput} title="Add action">
              +
            </button>
          </div>
        ))}
    </div>
  );
}
