import React, { useState, useRef, useEffect } from "react";
import { FlightTreeView } from "./TreeView.tsx";
import type { Timeline, TimelineEntry, Thenable } from "../runtime/index.ts";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type RenderLogViewProps = {
  lines: string[];
  chunkStart: number;
  cursor: number;
  flightPromise: Thenable<unknown> | undefined;
};

function RenderLogView({
  lines,
  chunkStart,
  cursor,
  flightPromise,
}: RenderLogViewProps): React.ReactElement | null {
  const activeRef = useRef<HTMLSpanElement>(null);
  const nextLineIndex =
    cursor >= chunkStart && cursor < chunkStart + lines.length ? cursor - chunkStart : -1;

  useEffect(() => {
    if (activeRef.current && document.hasFocus()) {
      activeRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [nextLineIndex]);

  if (lines.length === 0) return null;

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
            {lines.map((line, i) => (
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
  entry: TimelineEntry;
  entryIndex: number;
  chunkStart: number;
  cursor: number;
  canDelete: boolean;
  onDelete: (index: number) => void;
  getChunkCount: (entry: TimelineEntry) => number;
};

function FlightLogEntry({
  entry,
  entryIndex,
  chunkStart,
  cursor,
  canDelete,
  onDelete,
  getChunkCount,
}: FlightLogEntryProps): React.ReactElement | null {
  const chunkCount = getChunkCount(entry);
  const entryEnd = chunkStart + chunkCount;
  const isEntryActive = cursor >= chunkStart && cursor < entryEnd;
  const isEntryDone = cursor >= entryEnd;

  const entryClass = isEntryActive ? "active" : isEntryDone ? "done-entry" : "pending-entry";

  if (entry.type === "render") {
    const lines = entry.stream.rows;
    return (
      <div className={`log-entry ${entryClass}`}>
        <div className="log-entry-header">
          <span className="log-entry-label">Render</span>
          <span className="log-entry-header-right">
            {canDelete && (
              <button
                className="delete-entry-btn"
                onClick={() => onDelete(entryIndex)}
                title="Delete"
              >
                ×
              </button>
            )}
          </span>
        </div>
        <RenderLogView
          lines={lines}
          chunkStart={chunkStart}
          cursor={cursor}
          flightPromise={entry.stream.flightPromise}
        />
      </div>
    );
  }

  if (entry.type === "action") {
    const responseLines = entry.stream.rows;

    return (
      <div className={`log-entry ${entryClass}`}>
        <div className="log-entry-header">
          <span className="log-entry-label">Action: {entry.name}</span>
          <span className="log-entry-header-right">
            {canDelete && (
              <button
                className="delete-entry-btn"
                onClick={() => onDelete(entryIndex)}
                title="Delete"
              >
                ×
              </button>
            )}
          </span>
        </div>
        {entry.args && (
          <div className="log-entry-request">
            <pre className="log-entry-request-args">{entry.args}</pre>
          </div>
        )}
        <RenderLogView
          lines={responseLines}
          chunkStart={chunkStart}
          cursor={cursor}
          flightPromise={entry.stream.flightPromise}
        />
      </div>
    );
  }

  return null;
}

type FlightLogProps = {
  timeline: Timeline;
  entries: TimelineEntry[];
  cursor: number;
  error: string | null;
  availableActions: string[];
  onAddRawAction: (actionName: string, rawPayload: string) => void;
  onDeleteEntry: (index: number) => void;
};

export function FlightLog({
  timeline,
  entries,
  cursor,
  error,
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

  if (error) {
    return <pre className="flight-output error">{error}</pre>;
  }

  if (entries.length === 0) {
    return (
      <div className="flight-output">
        <span className="empty waiting-dots">Compiling</span>
      </div>
    );
  }

  const getChunkCount = (entry: TimelineEntry): number => timeline.getChunkCount(entry);

  const entryElements: React.ReactElement[] = [];
  let chunkOffset = 0;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry) continue;
    const chunkStart = chunkOffset;
    chunkOffset += getChunkCount(entry);
    entryElements.push(
      <FlightLogEntry
        key={i}
        entry={entry}
        entryIndex={i}
        chunkStart={chunkStart}
        cursor={cursor}
        canDelete={timeline.canDeleteEntry(i)}
        onDelete={onDeleteEntry}
        getChunkCount={getChunkCount}
      />,
    );
  }

  return (
    <div className="flight-log" ref={logRef}>
      {entryElements}
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
