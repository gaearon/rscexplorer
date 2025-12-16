// Must be first - shims webpack globals for react-server-dom-webpack
import './webpack-shim.js';

import './byte-stream-polyfill.js';
import 'web-streams-polyfill/polyfill';
import 'text-encoding';

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Workspace } from './ui/Workspace.jsx';
import './styles/workspace.css';

// Default code shown when no code is provided
const DEFAULT_SERVER = `export default function App() {
  return <h1>RSC Explorer</h1>;
}`;

const DEFAULT_CLIENT = `'use client'

export function Button({ children }) {
  return <button>{children}</button>;
}`;

function EmbedApp() {
  const [code, setCode] = useState(null);
  const [showFullscreen, setShowFullscreen] = useState(false);

  useEffect(() => {
    const handleMessage = (event) => {
      const { data } = event;
      if (data?.type === 'rsc-embed:init') {
        setCode({
          server: (data.code?.server || DEFAULT_SERVER).trim(),
          client: (data.code?.client || DEFAULT_CLIENT).trim(),
        });
        if (data.showFullscreen !== false) {
          setShowFullscreen(true);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Signal to parent that we're ready to receive code
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'rsc-embed:ready' }, '*');
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Report code changes back to parent
  const handleCodeChange = (server, client) => {
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'rsc-embed:code-changed',
        code: { server, client }
      }, '*');
    }
  };

  // Generate fullscreen URL
  const getFullscreenUrl = () => {
    if (!code) return '#';
    const json = JSON.stringify({ server: code.server, client: code.client });
    const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(json))));
    return `https://rscexplorer.dev/?c=${encoded}`;
  };

  // Show nothing until we receive code from parent
  if (!code) {
    return null;
  }

  return (
    <>
      {showFullscreen && (
        <div className="embed-header">
          <span className="embed-title">RSC Explorer</span>
          <a
            href={getFullscreenUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="embed-fullscreen-link"
            title="Open in RSC Explorer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
            </svg>
          </a>
        </div>
      )}
      <Workspace
        key={`${code.server}:${code.client}`}
        initialServerCode={code.server}
        initialClientCode={code.client}
        onCodeChange={handleCodeChange}
      />
    </>
  );
}

document.addEventListener('DOMContentLoaded', () => {
  const root = createRoot(document.getElementById('embed-root'));
  root.render(<EmbedApp />);
});
