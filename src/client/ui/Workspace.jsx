import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { encodeReply } from 'react-server-dom-webpack/client';
import { Timeline, SteppableStream, registerClientModule, evaluateClientModule } from '../runtime/index.js';
import { ServerWorker } from '../server-worker.js';
import { parseClientModule, parseServerActions, compileToCommonJS, buildManifest } from '../../shared/compiler.js';
import { CodeEditor } from './CodeEditor.jsx';
import { FlightLog } from './FlightLog.jsx';
import { LivePreview } from './LivePreview.jsx';

export function Workspace({ initialServerCode, initialClientCode, onCodeChange }) {
  const [serverCode, setServerCode] = useState(initialServerCode);
  const [clientCode, setClientCode] = useState(initialClientCode);
  const [serverWorker] = useState(() => new ServerWorker());
  const [timeline] = useState(() => new Timeline());
  const [callServerRef] = useState({ current: null });

  const snapshot = useSyncExternalStore(timeline.subscribe, timeline.getSnapshot);
  const { entries, cursor, totalChunks, isAtStart, isAtEnd } = snapshot;

  const [clientModuleReady, setClientModuleReady] = useState(false);
  const [error, setError] = useState(null);
  const [availableActions, setAvailableActions] = useState([]);
  const compileTimeoutRef = useRef(null);

  useEffect(() => {
    window.__DEBUG_TIMELINE__ = timeline;
  }, [timeline]);

  const handleServerChange = (code) => {
    setServerCode(code);
    onCodeChange?.(code, clientCode);
  };

  const handleClientChange = (code) => {
    setClientCode(code);
    onCodeChange?.(serverCode, code);
  };

  const handleStep = useCallback(() => {
    timeline.stepForward();
  }, [timeline]);

  const handleStepBack = useCallback(() => {
    timeline.stepBackward();
  }, [timeline]);

  const handleSeek = useCallback((position) => {
    timeline.seekTo(position);
  }, [timeline]);

  const handleSkip = useCallback(() => {
    timeline.skipToEntryEnd();
  }, [timeline]);

  const handleAddRawAction = useCallback(async (actionName, rawPayload) => {
    try {
      const responseRaw = await serverWorker.callActionRaw(actionName, rawPayload);
      const stream = new SteppableStream(responseRaw, { callServer: callServerRef.current });
      await stream.waitForBuffer();
      timeline.addAction(actionName, rawPayload, stream);
    } catch (err) {
      console.error('[raw action] Failed:', err);
    }
  }, [serverWorker, timeline, callServerRef]);

  const compile = useCallback(async (sCode, cCode) => {
    try {
      setError(null);
      timeline.clear();

      const clientExports = parseClientModule(cCode);
      const manifest = buildManifest('client', clientExports);
      const compiledClient = compileToCommonJS(cCode);
      const clientModule = evaluateClientModule(compiledClient);
      registerClientModule('client', clientModule);

      const actionNames = parseServerActions(sCode);
      const compiledServer = compileToCommonJS(sCode);
      setAvailableActions(actionNames);

      await serverWorker.deploy({
        compiledCode: compiledServer,
        manifest,
        actionNames,
      });

      const callServer = actionNames.length > 0
        ? async (actionId, args) => {
            const actionName = actionId.split('#')[0];
            const encodedArgs = await encodeReply(args);
            const argsDisplay = typeof encodedArgs === 'string'
              ? `0=${encodedArgs}`
              : new URLSearchParams(encodedArgs).toString();

            const responseRaw = await serverWorker.callAction(actionName, encodedArgs);
            const stream = new SteppableStream(responseRaw, { callServer });
            await stream.waitForBuffer();
            timeline.addAction(actionName, argsDisplay, stream);
            return stream.flightPromise;
          }
        : null;

      callServerRef.current = callServer;

      const renderRaw = await serverWorker.render();
      const renderStream = new SteppableStream(renderRaw, { callServer });
      await renderStream.waitForBuffer();

      timeline.setRender(renderStream);
      setClientModuleReady(true);
    } catch (err) {
      console.error('[compile] Error:', err);
      setError(err.message || String(err));
      timeline.clear();
      setClientModuleReady(false);
    }
  }, [timeline, serverWorker, callServerRef]);

  const handleReset = useCallback(() => {
    compile(serverCode, clientCode);
  }, [compile, serverCode, clientCode]);

  useEffect(() => {
    clearTimeout(compileTimeoutRef.current);
    compileTimeoutRef.current = setTimeout(() => {
      compile(serverCode, clientCode);
    }, 300);
  }, [serverCode, clientCode, compile]);

  useEffect(() => {
    return () => serverWorker.terminate();
  }, [serverWorker]);

  return (
    <main>
      <CodeEditor label="server" defaultValue={serverCode} onChange={handleServerChange} />
      <div className="pane">
        <div className="pane-header">flight</div>
        <FlightLog
          timeline={timeline}
          entries={entries}
          cursor={cursor}
          error={error}
          availableActions={availableActions}
          onAddRawAction={handleAddRawAction}
          onDeleteEntry={(idx) => timeline.deleteEntry(idx)}
        />
      </div>
      <CodeEditor label="client" defaultValue={clientCode} onChange={handleClientChange} />
      <LivePreview
        timeline={timeline}
        clientModuleReady={clientModuleReady}
        totalChunks={totalChunks}
        cursor={cursor}
        isAtStart={isAtStart}
        isAtEnd={isAtEnd}
        onStep={handleStep}
        onStepBack={handleStepBack}
        onSeek={handleSeek}
        onSkip={handleSkip}
        onReset={handleReset}
      />
    </main>
  );
}
