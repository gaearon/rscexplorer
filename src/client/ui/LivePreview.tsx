import React, { Suspense, Component, useState, useEffect, type ReactNode } from "react";
import type { EntryView, Thenable } from "../runtime/index.ts";
import { Pane } from "./Pane.tsx";
import "./LivePreview.css";

type PreviewErrorBoundaryProps = {
  children: ReactNode;
};

type PreviewErrorBoundaryState = {
  error: Error | null;
};

class PreviewErrorBoundary extends Component<PreviewErrorBoundaryProps, PreviewErrorBoundaryState> {
  constructor(props: PreviewErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): PreviewErrorBoundaryState {
    return { error };
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <span className="LivePreview-empty LivePreview-empty--error">
          Error: {this.state.error.message || String(this.state.error)}
        </span>
      );
    }
    return this.props.children;
  }
}

type StreamingContentProps = {
  streamPromise: Thenable<unknown>;
};

function StreamingContent({ streamPromise }: StreamingContentProps): ReactNode {
  return React.use(streamPromise) as ReactNode;
}

type LivePreviewProps = {
  entries: EntryView[];
  cursor: number;
  totalChunks: number;
  isAtStart: boolean;
  isAtEnd: boolean;
  isLoading: boolean;
  onStep: () => void;
  onSkip: () => void;
  onReset: () => void;
  autoSkip: boolean;
  setAutoSkip: (enabled: boolean) => void;
};

export function LivePreview({
  entries,
  cursor,
  totalChunks,
  isAtStart,
  isAtEnd,
  isLoading,
  onStep,
  onSkip,
  onReset,
  autoSkip,
  setAutoSkip,
}: LivePreviewProps): React.ReactElement {
  const renderEntry = entries[0];
  const flightPromise = renderEntry?.flightPromise;

  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying || isAtEnd) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (isAtEnd) setIsPlaying(false);
      return;
    }
    const timer = setTimeout(() => onStep(), 300);
    return () => clearTimeout(timer);
  }, [isPlaying, isAtEnd, onStep, cursor]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsPlaying(false);
  }, [totalChunks]);

  const showPlaceholder = entries.length === 0 || cursor === 0;

  const handlePlayPause = (): void => setIsPlaying(!isPlaying);
  const handleStep = (): void => {
    setIsPlaying(false);
    onStep();
  };
  const handleSkip = (): void => {
    setIsPlaying(false);
    onSkip();
  };
  const handleReset = (): void => {
    setIsPlaying(false);
    onReset();
  };

  let statusText = "";
  if (isLoading) {
    statusText = "Loading";
  } else if (isAtStart) {
    statusText = "Ready";
  } else if (isAtEnd) {
    statusText = "Done";
  } else {
    statusText = `${cursor} / ${totalChunks}`;
  }

  return (
    <Pane label="preview">
      <div className="LivePreview-playback">
        <div className="LivePreview-controls" role="toolbar" aria-label="Playback controls">
          <button
            className="LivePreview-controlBtn"
            onClick={handleReset}
            disabled={isLoading || isAtStart}
            aria-label="Reset"
            title="Reset"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 1a7 7 0 1 1-7 7h1.5a5.5 5.5 0 1 0 1.6-3.9L6 6H1V1l1.6 1.6A7 7 0 0 1 8 1z" />
            </svg>
          </button>
          <button
            className={`LivePreview-controlBtn${isPlaying ? " LivePreview-controlBtn--playing" : ""}`}
            onClick={handlePlayPause}
            disabled={isLoading || isAtEnd}
            aria-label={isPlaying ? "Pause" : "Play"}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            )}
          </button>
          <button
            className={`LivePreview-controlBtn${!isLoading && !isAtEnd ? " LivePreview-controlBtn--step" : ""}`}
            onClick={handleStep}
            disabled={isLoading || isAtEnd}
            aria-label="Step forward"
            title="Step forward"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
          <button
            className="LivePreview-controlBtn"
            onClick={handleSkip}
            disabled={isLoading || isAtEnd}
            aria-label="Skip to end"
            title="Skip to end"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M5.5 18V6l9 6-9 6zm9-12h2v12h-2V6z" />
            </svg>
          </button>
        </div>
        <input
          type="range"
          min="0"
          max={totalChunks}
          value={cursor}
          onChange={() => {}}
          disabled
          className="LivePreview-slider"
          aria-label="Playback progress"
        />
        <span
          className="LivePreview-stepInfo"
          data-testid="step-info"
          role="status"
          aria-live="polite"
        >
          {statusText}
        </span>
      </div>
      <div className="LivePreview-subcontrols">
        <label id="autoSkip">
          <input
            aria-label="autoSkip"
            type="checkbox"
            checked={autoSkip}
            onChange={(e) => {
              if (e.target.checked) {
                handleSkip();
              }
              setAutoSkip(e.target.checked);
            }}
          />
          Auto Skip
        </label>
      </div>
      <div className="LivePreview-container" data-testid="preview-container">
        {isLoading ? (
          <span className="LivePreview-empty">Loading...</span>
        ) : showPlaceholder ? (
          <span className="LivePreview-empty">{isAtStart ? "Step to begin..." : "Loading..."}</span>
        ) : flightPromise ? (
          <PreviewErrorBoundary>
            <Suspense fallback={<span className="LivePreview-empty">Loading...</span>}>
              <StreamingContent streamPromise={flightPromise} />
            </Suspense>
          </PreviewErrorBoundary>
        ) : null}
      </div>
    </Pane>
  );
}
