import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import "./ResizablePanes.css";

type ResizablePanesProps = {
  topLeft: ReactNode;
  topRight: ReactNode;
  bottomLeft: ReactNode;
  bottomRight: ReactNode;
};

// Constants for sizing constraints
const MIN_SIZE_PERCENT = 20;
const MAX_SIZE_PERCENT = 80;
const KEYBOARD_STEP = 2;

type DragAxis = "horizontal" | "vertical";

type DragState = {
  axis: DragAxis;
  startPos: number;
  startPercent: number;
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

  // Start drag (mouse)
  const handleMouseDown = useCallback(
    (axis: DragAxis) => (e: ReactMouseEvent) => {
      e.preventDefault();
      const startPos = axis === "horizontal" ? e.clientX : e.clientY;
      const startPercent = axis === "horizontal" ? colPercent : rowPercent;
      dragStateRef.current = { axis, startPos, startPercent };
      document.body.style.cursor = axis === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
    },
    [colPercent, rowPercent],
  );

  // Start drag (touch)
  const handleTouchStart = useCallback(
    (axis: DragAxis) => (e: ReactTouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const startPos = axis === "horizontal" ? touch.clientX : touch.clientY;
      const startPercent = axis === "horizontal" ? colPercent : rowPercent;
      dragStateRef.current = { axis, startPos, startPercent };
    },
    [colPercent, rowPercent],
  );

  // Keyboard handler for accessibility
  const handleKeyDown = useCallback(
    (axis: DragAxis) => (e: ReactKeyboardEvent) => {
      const setter = axis === "horizontal" ? setColPercent : setRowPercent;

      switch (e.key) {
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          setter((prev) => clamp(prev - KEYBOARD_STEP));
          break;
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          setter((prev) => clamp(prev + KEYBOARD_STEP));
          break;
        case "Home":
          e.preventDefault();
          setter(MIN_SIZE_PERCENT);
          break;
        case "End":
          e.preventDefault();
          setter(MAX_SIZE_PERCENT);
          break;
      }
    },
    [],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      const dragState = dragStateRef.current;
      if (!dragState || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const currentPos = dragState.axis === "horizontal" ? e.clientX : e.clientY;
      const size = dragState.axis === "horizontal" ? rect.width : rect.height;
      const deltaPercent = ((currentPos - dragState.startPos) / size) * 100;
      const newPercent = clamp(dragState.startPercent + deltaPercent);

      if (dragState.axis === "horizontal") {
        setColPercent(newPercent);
      } else {
        setRowPercent(newPercent);
      }
    };

    const handleTouchMove = (e: TouchEvent): void => {
      const dragState = dragStateRef.current;
      if (!dragState || !containerRef.current) return;

      const touch = e.touches[0];
      if (!touch) return;

      e.preventDefault();

      const rect = containerRef.current.getBoundingClientRect();
      const currentPos = dragState.axis === "horizontal" ? touch.clientX : touch.clientY;
      const size = dragState.axis === "horizontal" ? rect.width : rect.height;
      const deltaPercent = ((currentPos - dragState.startPos) / size) * 100;
      const newPercent = clamp(dragState.startPercent + deltaPercent);

      if (dragState.axis === "horizontal") {
        setColPercent(newPercent);
      } else {
        setRowPercent(newPercent);
      }
    };

    const handleDragEnd = (): void => {
      if (dragStateRef.current) {
        dragStateRef.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleDragEnd);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleDragEnd);
    document.addEventListener("touchcancel", handleDragEnd);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleDragEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleDragEnd);
      document.removeEventListener("touchcancel", handleDragEnd);
    };
  }, []);

  // Reset to 50/50 on double-click
  const handleDoubleClick = useCallback(
    (axis: DragAxis) => () => {
      if (axis === "horizontal") {
        setColPercent(50);
      } else {
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

      {/* Top-right pane */}
      <div className="ResizablePanes-pane ResizablePanes-topRight">{topRight}</div>

      {/* Bottom-left pane */}
      <div className="ResizablePanes-pane ResizablePanes-bottomLeft">{bottomLeft}</div>

      {/* Bottom-right pane */}
      <div className="ResizablePanes-pane ResizablePanes-bottomRight">{bottomRight}</div>

      {/* Vertical divider (full height) - controls column split */}
      <div
        className="ResizablePanes-divider ResizablePanes-divider--vertical"
        onMouseDown={handleMouseDown("horizontal")}
        onTouchStart={handleTouchStart("horizontal")}
        onDoubleClick={handleDoubleClick("horizontal")}
        onKeyDown={handleKeyDown("horizontal")}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize left and right columns"
        aria-valuenow={Math.round(colPercent)}
        aria-valuemin={MIN_SIZE_PERCENT}
        aria-valuemax={MAX_SIZE_PERCENT}
        tabIndex={0}
      />

      {/* Horizontal divider (full width) - controls row split */}
      <div
        className="ResizablePanes-divider ResizablePanes-divider--horizontal"
        onMouseDown={handleMouseDown("vertical")}
        onTouchStart={handleTouchStart("vertical")}
        onDoubleClick={handleDoubleClick("vertical")}
        onKeyDown={handleKeyDown("vertical")}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize top and bottom rows"
        aria-valuenow={Math.round(rowPercent)}
        aria-valuemin={MIN_SIZE_PERCENT}
        aria-valuemax={MAX_SIZE_PERCENT}
        tabIndex={0}
      />
    </div>
  );
}
