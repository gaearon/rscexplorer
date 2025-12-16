import React, { useState, useRef, useEffect } from 'react';
import { FlightTreeView } from './TreeView.jsx';

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function RenderLogView({ lines, chunkStart, cursor, flightPromise }) {
  const activeRef = useRef(null);
  const nextLineIndex = cursor >= chunkStart && cursor < chunkStart + lines.length
    ? cursor - chunkStart
    : -1;

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [nextLineIndex]);

  if (lines.length === 0) return null;

  const getLineClass = (i) => {
    const globalChunk = chunkStart + i;
    if (globalChunk < cursor) return 'line-done';
    if (globalChunk === cursor) return 'line-next';
    return 'line-pending';
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
          {showTree && <FlightTreeView flightPromise={flightPromise} />}
        </div>
      </div>
    </div>
  );
}

function FlightLogEntry({ entry, entryIndex, chunkStart, cursor, canDelete, onDelete, getChunkCount }) {
  const chunkCount = getChunkCount(entry);
  const entryEnd = chunkStart + chunkCount;
  const isEntryActive = cursor >= chunkStart && cursor < entryEnd;
  const isEntryDone = cursor >= entryEnd;

  const entryClass = isEntryActive ? 'active' : isEntryDone ? 'done-entry' : 'pending-entry';

  if (entry.type === 'render') {
    const lines = entry.stream?.rows || [];
    return (
      <div className={`log-entry ${entryClass}`}>
        <div className="log-entry-header">
          <span className="log-entry-label">Render</span>
          <span className="log-entry-header-right">
            {canDelete && (
              <button className="delete-entry-btn" onClick={() => onDelete(entryIndex)} title="Delete">×</button>
            )}
          </span>
        </div>
        <RenderLogView
          lines={lines}
          chunkStart={chunkStart}
          cursor={cursor}
          flightPromise={entry.stream?.flightPromise}
        />
      </div>
    );
  }

  if (entry.type === 'action') {
    const responseLines = entry.stream?.rows || [];

    return (
      <div className={`log-entry ${entryClass}`}>
        <div className="log-entry-header">
          <span className="log-entry-label">Action: {entry.name}</span>
          <span className="log-entry-header-right">
            {canDelete && (
              <button className="delete-entry-btn" onClick={() => onDelete(entryIndex)} title="Delete">×</button>
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
          flightPromise={entry.stream?.flightPromise}
        />
      </div>
    );
  }

  return null;
}

export function FlightLog({ timeline, entries, cursor, error, availableActions, onAddRawAction, onDeleteEntry }) {
  const logRef = useRef(null);
  const [showRawInput, setShowRawInput] = useState(false);
  const [selectedAction, setSelectedAction] = useState('');
  const [rawPayload, setRawPayload] = useState('');

  const handleAddRaw = () => {
    if (rawPayload.trim()) {
      onAddRawAction(selectedAction, rawPayload);
      setSelectedAction(availableActions[0] || '');
      setRawPayload('');
      setShowRawInput(false);
    }
  };

  const handleShowRawInput = () => {
    setSelectedAction(availableActions[0] || '');
    setShowRawInput(true);
  };

  if (error) {
    return <pre className="flight-output error">{error}</pre>;
  }

  if (entries.length === 0) {
    return <div className="flight-output"><span className="empty waiting-dots">Compiling</span></div>;
  }

  let chunkOffset = 0;
  const getChunkCount = (entry) => timeline.getChunkCount(entry);

  return (
    <div className="flight-log" ref={logRef}>
      {entries.map((entry, i) => {
        const chunkStart = chunkOffset;
        chunkOffset += getChunkCount(entry);

        return (
          <FlightLogEntry
            key={i}
            entry={entry}
            entryIndex={i}
            chunkStart={chunkStart}
            cursor={cursor}
            canDelete={timeline.canDeleteEntry(i)}
            onDelete={onDeleteEntry}
            getChunkCount={getChunkCount}
          />
        );
      })}
      {availableActions.length > 0 && (showRawInput ? (
        <div className="raw-input-form">
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="raw-input-action"
          >
            {availableActions.map(action => (
              <option key={action} value={action}>{action}</option>
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
            <button onClick={handleAddRaw} disabled={!rawPayload.trim()}>Add</button>
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
