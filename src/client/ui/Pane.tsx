import React, { type ReactNode } from "react";
import "./Pane.css";

type PaneProps = {
  label: string;
  children: ReactNode;
};

export function Pane({ label, children }: PaneProps): React.ReactElement {
  return (
    <div className="Pane">
      <div className="Pane-header">{label}</div>
      {children}
    </div>
  );
}
