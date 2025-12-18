import React, { Suspense, Component, useState, useEffect, type ReactNode } from "react";
import type { EntryView, Thenable } from "../runtime/index.ts";

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
        <span className="empty error">
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
  onStep: () => void;
  onSkip: () => void;
  onReset: () => void;
};

export function LivePreview({
  entries,
  cursor,
  totalChunks,
  isAtStart,
  isAtEnd,
  onStep,
  onSkip,
  onReset,
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
  if (isAtStart) {
    statusText = "Ready";
  } else if (isAtEnd) {
    statusText = "Done";
  } else {
    statusText = `${cursor} / ${totalChunks}`;
  }

  return (
    <div className="pane preview-pane">
      <div className="pane-header">preview</div>
      <div className="playback-container">
        <div className="playback-controls">
          <button className="control-btn" onClick={handleReset} disabled={isAtStart} title="Reset">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 1 1-7 7h1.5a5.5 5.5 0 1 0 1.6-3.9L6 6H1V1l1.6 1.6A7 7 0 0 1 8 1z" />
            </svg>
          </button>
          <button
            className={`control-btn play-btn${isPlaying ? " playing" : ""}`}
            onClick={handlePlayPause}
            disabled={isAtEnd}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            )}
          </button>
          <button
            className={`control-btn ${!isAtEnd ? "step-btn" : ""}`}
            onClick={handleStep}
            disabled={isAtEnd}
            title="Step forward"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
          <button
            className="control-btn"
            onClick={handleSkip}
            disabled={isAtEnd}
            title="Skip to end"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
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
          className="step-slider"
        />
        <span className="step-info">{statusText}</span>
      </div>
      <div className="preview-container">
        {showPlaceholder ? (
          <span className="empty">{isAtStart ? "Step to begin..." : "Loading..."}</span>
        ) : flightPromise ? (
          <PreviewErrorBoundary>
            <Suspense fallback={<span className="empty">Loading...</span>}>
              <StreamingContent streamPromise={flightPromise} />
            </Suspense>
          </PreviewErrorBoundary>
        ) : null}
      </div>
    </div>
  );
}
