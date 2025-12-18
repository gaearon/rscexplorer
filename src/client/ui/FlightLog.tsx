import React, { useState, useRef, useEffect } from "react";
import { FlightTreeView } from "./TreeView.tsx";
import { Select } from "./Select.tsx";
import type { EntryView } from "../runtime/index.ts";
import "./FlightLog.css";

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
    if (globalChunk < cursor) return "FlightLog-line--done";
    if (globalChunk === cursor) return "FlightLog-line--next";
    return "FlightLog-line--pending";
  };

  const showTree = cursor >= chunkStart;

  return (
    <div className="FlightLog-renderView">
      <div className="FlightLog-renderView-split">
        <div className="FlightLog-linesWrapper">
          <pre className="FlightLog-lines">
            {rows.map((line, i) => (
              <span
                key={i}
                ref={i === nextLineIndex ? activeRef : null}
                className={`FlightLog-line ${getLineClass(i)}`}
              >
                {escapeHtml(line)}
              </span>
            ))}
          </pre>
        </div>
        <div className="FlightLog-tree">
          {showTree && <FlightTreeView flightPromise={flightPromise ?? null} inEntry />}
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
  const modifierClass = entry.isActive
    ? "FlightLog-entry--active"
    : entry.isDone
      ? "FlightLog-entry--done"
      : "FlightLog-entry--pending";

  return (
    <div className={`FlightLog-entry ${modifierClass}`}>
      <div className="FlightLog-entry-header">
        <span className="FlightLog-entry-label">
          {entry.type === "render" ? "Render" : `Action: ${entry.name}`}
        </span>
        <span className="FlightLog-entry-headerRight">
          {entry.canDelete && (
            <button
              className="FlightLog-entry-deleteBtn"
              onClick={() => onDelete(index)}
              title="Delete"
            >
              ×
            </button>
          )}
        </span>
      </div>
      {entry.type === "action" && entry.args && (
        <div className="FlightLog-entry-request">
          <pre className="FlightLog-entry-requestArgs">{entry.args}</pre>
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
      <div className="FlightLog-output">
        <span className="FlightLog-empty FlightLog-empty--waiting">Compiling</span>
      </div>
    );
  }

  return (
    <div className="FlightLog" ref={logRef}>
      {entries.map((entry, i) => (
        <FlightLogEntry key={i} entry={entry} index={i} cursor={cursor} onDelete={onDeleteEntry} />
      ))}
      {availableActions.length > 0 &&
        (showRawInput ? (
          <div className="FlightLog-rawForm">
            <Select value={selectedAction} onChange={(e) => setSelectedAction(e.target.value)}>
              {availableActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </Select>
            <textarea
              placeholder="Paste a request payload from a real action"
              value={rawPayload}
              onChange={(e) => setRawPayload(e.target.value)}
              className="FlightLog-rawForm-textarea"
              rows={6}
            />
            <div className="FlightLog-rawForm-buttons">
              <button
                className="FlightLog-rawForm-submitBtn"
                onClick={handleAddRaw}
                disabled={!rawPayload.trim()}
              >
                Add
              </button>
              <button
                className="FlightLog-rawForm-cancelBtn"
                onClick={() => setShowRawInput(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="FlightLog-addButton-wrapper">
            <button className="FlightLog-addButton" onClick={handleShowRawInput} title="Add action">
              +
            </button>
          </div>
        ))}
    </div>
  );
}
