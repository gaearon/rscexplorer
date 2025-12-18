import React, { useState, useRef, useEffect, type ChangeEvent, type MouseEvent } from "react";
import { version } from "react";
import { SAMPLES, type Sample } from "../samples.ts";
import REACT_VERSIONS from "../../../scripts/versions.json";
import { Select } from "./Select.tsx";
import "./App.css";

const isDev = process.env.NODE_ENV === "development";

function BuildSwitcher(): React.ReactElement {
  const isDisabled = !import.meta.env.PROD;

  const handleVersionChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const newVersion = e.target.value;
    if (newVersion !== version) {
      const modePath = isDev ? "/dev" : "";
      window.location.href = `/${newVersion}${modePath}/` + window.location.search;
    }
  };

  const handleModeChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const newIsDev = e.target.value === "dev";
    if (newIsDev !== isDev) {
      const modePath = newIsDev ? "/dev" : "";
      window.location.href = `/${version}${modePath}/` + window.location.search;
    }
  };

  return (
    <div className="App-buildSwitcher">
      <label className="App-buildSwitcher-label">React</label>
      <div className="App-buildSwitcher-version">
        <Select value={version} onChange={handleVersionChange} disabled={isDisabled}>
          {(REACT_VERSIONS as string[]).map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </Select>
      </div>
      <div className="App-buildSwitcher-mode">
        <Select value={isDev ? "dev" : "prod"} onChange={handleModeChange} disabled={isDisabled}>
          <option value="prod">prod</option>
          <option value="dev">dev</option>
        </Select>
      </div>
    </div>
  );
}

type InitialCode = {
  server: string;
  client: string;
  sampleKey: string | null;
};

function getInitialCode(): InitialCode {
  const params = new URLSearchParams(window.location.search);
  const sampleKey = params.get("s");
  const encodedCode = params.get("c");

  if (encodedCode) {
    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(encodedCode)))) as {
        server: string;
        client: string;
      };
      return {
        server: decoded.server,
        client: decoded.client,
        sampleKey: null,
      };
    } catch (e) {
      console.error("Failed to decode URL code:", e);
    }
  }

  if (sampleKey && SAMPLES[sampleKey]) {
    const sample = SAMPLES[sampleKey] as Sample;
    return {
      server: sample.server,
      client: sample.client,
      sampleKey,
    };
  }

  const defaultSample = SAMPLES.pagination as Sample;
  return {
    server: defaultSample.server,
    client: defaultSample.client,
    sampleKey: "pagination",
  };
}

function saveToUrl(serverCode: string, clientCode: string): void {
  const json = JSON.stringify({ server: serverCode, client: clientCode });
  // btoa(unescape(encodeURIComponent(...))) is the standard way to base64 encode UTF-8
  // Don't wrap in encodeURIComponent - searchParams.set() handles that
  const encoded = btoa(unescape(encodeURIComponent(json)));
  const url = new URL(window.location.href);
  url.searchParams.delete("s");
  url.searchParams.set("c", encoded);
  window.history.pushState({}, "", url);
}

type CodeState = {
  server: string;
  client: string;
};

type EmbedModalProps = {
  code: CodeState;
  onClose: () => void;
};

function EmbedModal({ code, onClose }: EmbedModalProps): React.ReactElement {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);

  const [embedCode] = useState(() => {
    const base = window.location.origin + window.location.pathname.replace(/\/$/, "");
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
  });

  const handleCopy = (): void => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="App-embedModal-overlay" onClick={onClose}>
      <div className="App-embedModal" onClick={(e: MouseEvent) => e.stopPropagation()}>
        <div className="App-embedModal-header">
          <h2 className="App-embedModal-title">Embed this example</h2>
          <button className="App-embedModal-closeBtn" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="App-embedModal-body">
          <p className="App-embedModal-description">Copy and paste this code into your HTML:</p>
          <textarea
            ref={textareaRef}
            className="App-embedModal-textarea"
            readOnly
            value={embedCode}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
        </div>
        <div className="App-embedModal-footer">
          <button className="App-embedModal-copyBtn" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy to clipboard"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function App(): React.ReactElement {
  const [initialCode] = useState(getInitialCode);
  const [currentSample, setCurrentSample] = useState<string | null>(initialCode.sampleKey);
  const [workspaceCode, setWorkspaceCode] = useState<CodeState>({
    server: initialCode.server,
    client: initialCode.client,
  });
  const [liveCode, setLiveCode] = useState<CodeState>(workspaceCode);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent): void => {
      const data = event.data as { type?: string; code?: CodeState };
      if (data?.type === "rsc-embed:ready") {
        iframeRef.current?.contentWindow?.postMessage(
          {
            type: "rsc-embed:init",
            code: workspaceCode,
            showFullscreen: false,
          },
          "*",
        );
      }
      if (data?.type === "rsc-embed:code-changed" && data.code) {
        setLiveCode(data.code);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [workspaceCode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLiveCode(workspaceCode);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: "rsc-embed:init",
          code: workspaceCode,
          showFullscreen: false,
        },
        "*",
      );
    }
  }, [workspaceCode]);

  const handleSave = (): void => {
    saveToUrl(liveCode.server, liveCode.client);
    setCurrentSample(null);
  };

  const isDirty = currentSample
    ? liveCode.server !== (SAMPLES[currentSample] as Sample).server ||
      liveCode.client !== (SAMPLES[currentSample] as Sample).client
    : liveCode.server !== initialCode.server || liveCode.client !== initialCode.client;

  const handleSampleChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const key = e.target.value;
    if (key && SAMPLES[key]) {
      const sample = SAMPLES[key] as Sample;
      const newCode: CodeState = {
        server: sample.server,
        client: sample.client,
      };
      setWorkspaceCode(newCode);
      setCurrentSample(key);
      const url = new URL(window.location.href);
      url.searchParams.delete("c");
      url.searchParams.set("s", key);
      window.history.pushState({}, "", url);
    }
  };

  return (
    <>
      <header className="App-header">
        <h1 className="App-title">RSC Explorer</h1>
        <div className="App-exampleSelect">
          <label className="App-exampleSelect-label">Example</label>
          <div className="App-exampleSelect-selectWrapper">
            <Select value={currentSample ?? ""} onChange={handleSampleChange}>
              {!currentSample && <option value="">Custom</option>}
              {Object.entries(SAMPLES).map(([key, sample]) => (
                <option key={key} value={key}>
                  {sample.name}
                </option>
              ))}
            </Select>
          </div>
          <button
            className="App-exampleSelect-saveBtn"
            onClick={handleSave}
            disabled={!isDirty}
            title="Save to URL"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
          </button>
          <button
            className="App-exampleSelect-embedBtn"
            onClick={() => setShowEmbedModal(true)}
            title="Embed"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </button>
        </div>
        <div className="App-headerSpacer" />
        <div className="App-headerLinks">
          <a
            href="https://github.com/gaearon/rscexplorer"
            target="_blank"
            rel="noopener noreferrer"
            className="App-headerLink"
            title="View on GitHub"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
          <a
            href="https://tangled.sh/danabra.mov/rscexplorer"
            target="_blank"
            rel="noopener noreferrer"
            className="App-headerLink App-headerLink--tangled"
            title="View on Tangled"
          >
            <svg width="20" height="20" viewBox="0 0 26 26" fill="currentColor">
              <path d="m 16.775491,24.987061 c -0.78517,-0.0064 -1.384202,-0.234614 -2.033994,-0.631295 -0.931792,-0.490188 -1.643475,-1.31368 -2.152014,-2.221647 C 11.781409,23.136647 10.701392,23.744942 9.4922931,24.0886 8.9774725,24.238111 8.0757679,24.389777 6.5811304,23.84827 4.4270703,23.124679 2.8580086,20.883331 3.0363279,18.599583 3.0037061,17.652919 3.3488675,16.723769 3.8381157,15.925061 2.5329485,15.224503 1.4686756,14.048584 1.0611184,12.606459 0.81344502,11.816973 0.82385989,10.966486 0.91519098,10.154906 1.2422711,8.2387903 2.6795811,6.5725716 4.5299585,5.9732484 5.2685364,4.290122 6.8802592,3.0349975 8.706276,2.7794663 c 1.2124148,-0.1688264 2.46744,0.084987 3.52811,0.7011837 1.545426,-1.7139736 4.237779,-2.2205077 6.293579,-1.1676231 1.568222,0.7488935 2.689625,2.3113526 2.961888,4.0151464 1.492195,0.5977882 2.749007,1.8168898 3.242225,3.3644951 0.329805,0.9581836 0.340709,2.0135956 0.127128,2.9974286 -0.381606,1.535184 -1.465322,2.842146 -2.868035,3.556463 0.0034,0.273204 0.901506,2.243045 0.751284,3.729647 -0.03281,1.858525 -1.211631,3.619894 -2.846433,4.475452 -0.953967,0.556812 -2.084452,0.546309 -3.120531,0.535398 z m -4.470079,-5.349839 c 1.322246,-0.147248 2.189053,-1.300106 2.862307,-2.338363 0.318287,-0.472954 0.561404,-1.002348 0.803,-1.505815 0.313265,0.287151 0.578698,0.828085 1.074141,0.956909 0.521892,0.162542 1.133743,0.03052 1.45325,-0.443554 0.611414,-1.140449 0.31004,-2.516537 -0.04602,-3.698347 C 18.232844,11.92927 17.945151,11.232927 17.397785,10.751793 17.514522,9.9283111 17.026575,9.0919791 16.332883,8.6609491 15.741721,9.1323278 14.842258,9.1294949 14.271975,8.6252369 13.178927,9.7400102 12.177239,9.7029996 11.209704,8.8195135 10.992255,8.6209543 10.577326,10.031484 9.1211947,9.2324497 8.2846288,9.9333947 7.6359672,10.607693 7.0611981,11.578553 6.5026891,12.62523 5.9177873,13.554793 5.867393,14.69141 c -0.024234,0.66432 0.4948601,1.360337 1.1982269,1.306329 0.702996,0.06277 1.1815208,-0.629091 1.7138087,-0.916491 0.079382,0.927141 0.1688108,1.923227 0.4821259,2.828358 0.3596254,1.171275 1.6262605,1.915695 2.8251855,1.745211 0.08481,-0.0066 0.218672,-0.01769 0.218672,-0.0176 z m 0.686342,-3.497495 c -0.643126,-0.394168 -0.33365,-1.249599 -0.359402,-1.870938 0.064,-0.749774 0.115321,-1.538054 0.452402,-2.221125 0.356724,-0.487008 1.226721,-0.299139 1.265134,0.325689 -0.02558,0.628509 -0.314101,1.25416 -0.279646,1.9057 -0.07482,0.544043 0.05418,1.155133 -0.186476,1.652391 -0.197455,0.275121 -0.599638,0.355105 -0.892012,0.208283 z m -2.808766,-0.358124 c -0.605767,-0.328664 -0.4133176,-1.155655 -0.5083256,-1.73063 0.078762,-0.66567 0.013203,-1.510085 0.5705316,-1.976886 0.545037,-0.380109 1.286917,0.270803 1.029164,0.868384 -0.274913,0.755214 -0.09475,1.580345 -0.08893,2.34609 -0.104009,0.451702 -0.587146,0.691508 -1.002445,0.493042 z" />
            </svg>
          </a>
        </div>
        <BuildSwitcher />
      </header>
      <iframe ref={iframeRef} src="embed.html" style={{ flex: 1, border: "none", width: "100%" }} />
      {showEmbedModal && <EmbedModal code={liveCode} onClose={() => setShowEmbedModal(false)} />}
    </>
  );
}
