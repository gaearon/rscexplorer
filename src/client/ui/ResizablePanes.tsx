import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from "react";
import "./ResizablePanes.css";

type ResizablePanesProps = {
  topLeft: ReactNode;
  topRight: ReactNode;
  bottomLeft: ReactNode;
  bottomRight: ReactNode;
};

// Constants for sizing constraints
const MIN_SIZE_PERCENT = 20; // Minimum 20% for any pane
const MAX_SIZE_PERCENT = 80; // Maximum 80% for any pane

type DragState = {
  type: "horizontal" | "vertical" | "both";
  startX: number;
  startY: number;
  startColPercent: number;
  startRowPercent: number;
};

export function ResizablePanes({
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
}: ResizablePanesProps): React.ReactElement {
  // Column split: percentage of width for left column (0-100)
  const [colPercent, setColPercent] = useState(50);
  // Row split: percentage of height for top row (0-100)
  const [rowPercent, setRowPercent] = useState(50);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const clamp = (value: number): number => {
    return Math.min(MAX_SIZE_PERCENT, Math.max(MIN_SIZE_PERCENT, value));
  };

  const handleMouseDown = useCallback(
    (type: "horizontal" | "vertical" | "both") => (e: ReactMouseEvent) => {
      e.preventDefault();
      dragStateRef.current = {
        type,
        startX: e.clientX,
        startY: e.clientY,
        startColPercent: colPercent,
        startRowPercent: rowPercent,
      };
      document.body.style.cursor =
        type === "horizontal" ? "col-resize" : type === "vertical" ? "row-resize" : "move";
      document.body.style.userSelect = "none";
    },
    [colPercent, rowPercent],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      const dragState = dragStateRef.current;
      if (!dragState || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();

      if (dragState.type === "horizontal" || dragState.type === "both") {
        const deltaX = e.clientX - dragState.startX;
        const deltaPercent = (deltaX / rect.width) * 100;
        setColPercent(clamp(dragState.startColPercent + deltaPercent));
      }

      if (dragState.type === "vertical" || dragState.type === "both") {
        const deltaY = e.clientY - dragState.startY;
        const deltaPercent = (deltaY / rect.height) * 100;
        setRowPercent(clamp(dragState.startRowPercent + deltaPercent));
      }
    };

    const handleMouseUp = (): void => {
      if (dragStateRef.current) {
        dragStateRef.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Reset to 50/50 on double-click
  const handleDoubleClick = useCallback(
    (type: "horizontal" | "vertical" | "both") => () => {
      if (type === "horizontal" || type === "both") {
        setColPercent(50);
      }
      if (type === "vertical" || type === "both") {
        setRowPercent(50);
      }
    },
    [],
  );

  return (
    <div
      className="ResizablePanes"
      ref={containerRef}
      style={
        {
          "--col-percent": `${colPercent}%`,
          "--row-percent": `${rowPercent}%`,
        } as React.CSSProperties
      }
    >
      {/* Top-left pane */}
      <div className="ResizablePanes-pane ResizablePanes-topLeft">{topLeft}</div>

      {/* Vertical handle (between top-left and top-right) */}
      <div
        className="ResizablePanes-handle ResizablePanes-handle--vertical ResizablePanes-handle--top"
        onMouseDown={handleMouseDown("horizontal")}
        onDoubleClick={handleDoubleClick("horizontal")}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize left and right panes"
        tabIndex={0}
      />

      {/* Top-right pane */}
      <div className="ResizablePanes-pane ResizablePanes-topRight">{topRight}</div>

      {/* Horizontal handle (between top row and bottom row) */}
      <div
        className="ResizablePanes-handle ResizablePanes-handle--horizontal ResizablePanes-handle--left"
        onMouseDown={handleMouseDown("vertical")}
        onDoubleClick={handleDoubleClick("vertical")}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize top and bottom panes"
        tabIndex={0}
      />

      {/* Center intersection handle */}
      <div
        className="ResizablePanes-handle ResizablePanes-handle--intersection"
        onMouseDown={handleMouseDown("both")}
        onDoubleClick={handleDoubleClick("both")}
        role="separator"
        aria-label="Resize all panes"
        tabIndex={0}
      />

      {/* Horizontal handle (right side) */}
      <div
        className="ResizablePanes-handle ResizablePanes-handle--horizontal ResizablePanes-handle--right"
        onMouseDown={handleMouseDown("vertical")}
        onDoubleClick={handleDoubleClick("vertical")}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize top and bottom panes"
        tabIndex={0}
      />

      {/* Bottom-left pane */}
      <div className="ResizablePanes-pane ResizablePanes-bottomLeft">{bottomLeft}</div>

      {/* Vertical handle (between bottom-left and bottom-right) */}
      <div
        className="ResizablePanes-handle ResizablePanes-handle--vertical ResizablePanes-handle--bottom"
        onMouseDown={handleMouseDown("horizontal")}
        onDoubleClick={handleDoubleClick("horizontal")}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize left and right panes"
        tabIndex={0}
      />

      {/* Bottom-right pane */}
      <div className="ResizablePanes-pane ResizablePanes-bottomRight">{bottomRight}</div>
    </div>
  );
}
