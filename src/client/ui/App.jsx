import React, { useState, useRef, useEffect, useMemo, version } from 'react';
import { SAMPLES } from '../samples.js';
import REACT_VERSIONS from '../../../scripts/versions.json';

const isDev = process.env.NODE_ENV === 'development';

function BuildSwitcher() {
  if (!import.meta.env.PROD) return null;

  const handleVersionChange = (e) => {
    const newVersion = e.target.value;
    if (newVersion !== version) {
      const modePath = isDev ? '/dev' : '';
      window.location.href = `/${newVersion}${modePath}/` + window.location.search;
    }
  };

  const handleModeChange = (e) => {
    const newIsDev = e.target.value === 'dev';
    if (newIsDev !== isDev) {
      const modePath = newIsDev ? '/dev' : '';
      window.location.href = `/${version}${modePath}/` + window.location.search;
    }
  };

  return (
    <div className="build-switcher">
      <label>React</label>
      <select value={version} onChange={handleVersionChange}>
        {REACT_VERSIONS.map((v) => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>
      <select value={isDev ? 'dev' : 'prod'} onChange={handleModeChange} className="mode-select">
        <option value="prod">prod</option>
        <option value="dev">dev</option>
      </select>
    </div>
  );
}

function getInitialCode() {
  const params = new URLSearchParams(window.location.search);
  const sampleKey = params.get('s');
  const encodedCode = params.get('c');

  if (encodedCode) {
    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(encodedCode))));
      return { server: decoded.server, client: decoded.client, sampleKey: null };
    } catch (e) {
      console.error('Failed to decode URL code:', e);
    }
  }

  if (sampleKey && SAMPLES[sampleKey]) {
    return { server: SAMPLES[sampleKey].server, client: SAMPLES[sampleKey].client, sampleKey };
  }

  return { server: SAMPLES.pagination.server, client: SAMPLES.pagination.client, sampleKey: 'pagination' };
}

function saveToUrl(serverCode, clientCode) {
  const json = JSON.stringify({ server: serverCode, client: clientCode });
  // btoa(unescape(encodeURIComponent(...))) is the standard way to base64 encode UTF-8
  // Don't wrap in encodeURIComponent - searchParams.set() handles that
  const encoded = btoa(unescape(encodeURIComponent(json)));
  const url = new URL(window.location.href);
  url.searchParams.delete('s');
  url.searchParams.set('c', encoded);
  window.history.pushState({}, '', url);
}

function EmbedModal({ code, onClose }) {
  const textareaRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const embedCode = useMemo(() => {
    const base = window.location.origin + window.location.pathname.replace(/\/$/, '');
    const id = Math.random().toString(36).slice(2, 6);
    return `<div id="rsc-${id}" style="height: 500px;"></div>
<script type="module">
import { mount } from '${base}/embed.js';

mount('#rsc-${id}', {
  server: \`
${code.server}
  \`,
  client: \`
${code.client}
  \`
});
</script>`;
  }, [code]);

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Embed this example</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p>Copy and paste this code into your HTML:</p>
          <textarea
            ref={textareaRef}
            readOnly
            value={embedCode}
            onClick={e => e.target.select()}
          />
        </div>
        <div className="modal-footer">
          <button className="copy-btn" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const [initialCode] = useState(getInitialCode);
  const [currentSample, setCurrentSample] = useState(initialCode.sampleKey);
  const [workspaceCode, setWorkspaceCode] = useState({
    server: initialCode.server,
    client: initialCode.client,
  });
  const [liveCode, setLiveCode] = useState(workspaceCode);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'rsc-embed:ready') {
        iframeRef.current?.contentWindow?.postMessage({
          type: 'rsc-embed:init',
          code: workspaceCode,
          showFullscreen: false
        }, '*');
      }
      if (event.data?.type === 'rsc-embed:code-changed') {
        setLiveCode(event.data.code);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [workspaceCode]);

  useEffect(() => {
    setLiveCode(workspaceCode);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'rsc-embed:init',
        code: workspaceCode,
        showFullscreen: false
      }, '*');
    }
  }, [workspaceCode]);

  const handleSave = () => {
    saveToUrl(liveCode.server, liveCode.client);
    setCurrentSample(null);
  };

  const isDirty = currentSample
    ? liveCode.server !== SAMPLES[currentSample].server || liveCode.client !== SAMPLES[currentSample].client
    : liveCode.server !== initialCode.server || liveCode.client !== initialCode.client;

  const handleSampleChange = (e) => {
    const key = e.target.value;
    if (key && SAMPLES[key]) {
      const newCode = {
        server: SAMPLES[key].server,
        client: SAMPLES[key].client,
      };
      setWorkspaceCode(newCode);
      setCurrentSample(key);
      const url = new URL(window.location.href);
      url.searchParams.delete('c');
      url.searchParams.set('s', key);
      window.history.pushState({}, '', url);
    }
  };

  return (
    <>
      <header>
        <h1>RSC Explorer</h1>
        <div className="example-select-wrapper">
          <label>Example</label>
          <select value={currentSample || ''} onChange={handleSampleChange}>
            {!currentSample && <option value="">Custom</option>}
            {Object.entries(SAMPLES).map(([key, sample]) => (
              <option key={key} value={key}>{sample.name}</option>
            ))}
          </select>
          <button className="save-btn" onClick={handleSave} disabled={!isDirty} title="Save to URL">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
          </button>
          <button className="embed-btn" onClick={() => setShowEmbedModal(true)} title="Embed">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </button>
        </div>
        <div className="header-spacer" />
        <BuildSwitcher />
      </header>
      <iframe
        ref={iframeRef}
        src="embed.html"
        style={{ flex: 1, border: 'none', width: '100%' }}
      />
      {showEmbedModal && (
        <EmbedModal code={liveCode} onClose={() => setShowEmbedModal(false)} />
      )}
    </>
  );
}
