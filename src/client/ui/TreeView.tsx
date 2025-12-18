import React, { Suspense, Component, type ReactNode } from "react";
import type { Thenable } from "../runtime/index.ts";
import "./TreeView.css";

// Internal React element type with $$typeof
type ReactElementInternal = {
  $$typeof: symbol;
  type: unknown;
  key: string | null;
  ref: unknown;
  props: Record<string, unknown>;
};

// Lazy element type
type ReactLazy = {
  $$typeof: symbol;
  _payload: unknown;
  _init: (payload: unknown) => unknown;
};

function isReactElement(value: unknown): value is ReactElementInternal {
  if (!value || typeof value !== "object") return false;
  const typeofSymbol = (value as { $$typeof?: symbol }).$$typeof;
  return typeofSymbol === Symbol.for("react.transitional.element");
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function PendingFallback(): React.ReactElement {
  return <span className="TreeView-pending">Pending</span>;
}

type ErrorFallbackProps = {
  error: unknown;
};

function ErrorFallback({ error }: ErrorFallbackProps): React.ReactElement {
  const message = error instanceof Error ? error.message : String(error);
  return <span className="TreeView-error">Error: {message}</span>;
}

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render(): ReactNode {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

type AwaitProps<T> = {
  promise: Thenable<T>;
  children: (value: T) => ReactNode;
};

function Await<T>({ promise, children }: AwaitProps<T>): ReactNode {
  const value = React.use(promise);
  return children(value);
}

type LazyValueProps = {
  value: ReactLazy;
  indent: number;
  ancestors?: unknown[];
};

function LazyValue({ value, indent, ancestors = [] }: LazyValueProps): React.ReactElement {
  const resolved = value._init(value._payload);
  return <JSXValue value={resolved} indent={indent} ancestors={ancestors} />;
}

type LazyTypeProps = {
  element: ReactElementInternal & { type: ReactLazy };
  indent: number;
  ancestors?: unknown[];
};

function LazyType({ element, indent, ancestors = [] }: LazyTypeProps): React.ReactElement {
  const resolvedType = element.type._init(element.type._payload);
  const newElement = { ...element, type: resolvedType };
  return (
    <JSXElement
      element={newElement as ReactElementInternal}
      indent={indent}
      ancestors={ancestors}
    />
  );
}

type JSXValueProps = {
  value: unknown;
  indent?: number;
  ancestors?: unknown[];
};

// `ancestors` tracks the current path for cycle detection
function JSXValue({ value, indent = 0, ancestors = [] }: JSXValueProps): React.ReactElement {
  if (value === null) return <span className="TreeView-null">null</span>;
  if (value === undefined) return <span className="TreeView-undefined">undefined</span>;

  if (typeof value === "string") {
    const display = value.length > 50 ? value.slice(0, 50) + "..." : value;
    return <span className="TreeView-string">"{escapeHtml(display)}"</span>;
  }
  if (typeof value === "number") {
    const display = Object.is(value, -0) ? "-0" : String(value);
    return <span className="TreeView-number">{display}</span>;
  }
  if (typeof value === "bigint") {
    return <span className="TreeView-number">{String(value)}n</span>;
  }
  if (typeof value === "boolean") return <span className="TreeView-boolean">{String(value)}</span>;
  if (typeof value === "symbol") {
    return <span className="TreeView-symbol">{value.toString()}</span>;
  }
  if (typeof value === "function") {
    return (
      <span className="TreeView-function">
        [Function: {(value as { name?: string }).name || "anonymous"}]
      </span>
    );
  }

  if (typeof value === "object" && value !== null) {
    if (ancestors.includes(value)) {
      return <span className="TreeView-circular">[Circular]</span>;
    }
  }

  const nextAncestors =
    typeof value === "object" && value !== null ? [...ancestors, value] : ancestors;

  if (value instanceof Date) {
    return <span className="TreeView-date">Date({value.toISOString()})</span>;
  }

  if (value instanceof Map) {
    if (value.size === 0) return <span className="TreeView-collection">Map(0) {"{}"}</span>;
    const pad = "  ".repeat(indent + 1);
    const closePad = "  ".repeat(indent);
    return (
      <>
        <span className="TreeView-collection">
          Map({value.size}) {"{\n"}
        </span>
        {Array.from(value.entries()).map(([k, v], i) => (
          <React.Fragment key={i}>
            {pad}
            <JSXValue value={k} indent={indent + 1} ancestors={nextAncestors} /> =&gt;{" "}
            <JSXValue value={v} indent={indent + 1} ancestors={nextAncestors} />
            {i < value.size - 1 ? "," : ""}
            {"\n"}
          </React.Fragment>
        ))}
        {closePad}
        {"}"}
      </>
    );
  }

  if (value instanceof Set) {
    if (value.size === 0) return <span className="TreeView-collection">Set(0) {"{}"}</span>;
    const pad = "  ".repeat(indent + 1);
    const closePad = "  ".repeat(indent);
    return (
      <>
        <span className="TreeView-collection">
          Set({value.size}) {"{\n"}
        </span>
        {Array.from(value).map((v, i) => (
          <React.Fragment key={i}>
            {pad}
            <JSXValue value={v} indent={indent + 1} ancestors={nextAncestors} />
            {i < value.size - 1 ? "," : ""}
            {"\n"}
          </React.Fragment>
        ))}
        {closePad}
        {"}"}
      </>
    );
  }

  if (value instanceof FormData) {
    const entries = Array.from(value.entries());
    if (entries.length === 0) return <span className="TreeView-collection">FormData {"{}"}</span>;
    const pad = "  ".repeat(indent + 1);
    const closePad = "  ".repeat(indent);
    return (
      <>
        <span className="TreeView-collection">FormData {"{\n"}</span>
        {entries.map(([k, v], i) => (
          <React.Fragment key={i}>
            {pad}
            <span className="TreeView-key">{k}</span>:{" "}
            <JSXValue value={v} indent={indent + 1} ancestors={nextAncestors} />
            {i < entries.length - 1 ? "," : ""}
            {"\n"}
          </React.Fragment>
        ))}
        {closePad}
        {"}"}
      </>
    );
  }

  if (value instanceof Blob) {
    return (
      <span className="TreeView-collection">
        Blob({value.size} bytes, "{value.type || "application/octet-stream"}")
      </span>
    );
  }

  if (ArrayBuffer.isView(value)) {
    const name = value.constructor.name;
    const arr = value as Uint8Array;
    const preview = Array.from(arr.slice(0, 5)).join(", ");
    const suffix = arr.length > 5 ? ", ..." : "";
    return (
      <span className="TreeView-collection">
        {name}({arr.length}) [{preview}
        {suffix}]
      </span>
    );
  }
  if (value instanceof ArrayBuffer) {
    return <span className="TreeView-collection">ArrayBuffer({value.byteLength} bytes)</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <>[]</>;
    const hasElements = value.some((v, i) => i in value && isReactElement(v));

    const renderItem = (i: number): React.ReactElement => {
      if (!(i in value)) {
        return <span className="TreeView-empty">empty</span>;
      }
      return <JSXValue value={value[i]} indent={indent + 1} ancestors={nextAncestors} />;
    };

    if (hasElements || value.length > 3) {
      const pad = "  ".repeat(indent + 1);
      const closePad = "  ".repeat(indent);
      return (
        <>
          {"[\n"}
          {Array.from({ length: value.length }, (_, i) => (
            <React.Fragment key={i}>
              {pad}
              {renderItem(i)}
              {i < value.length - 1 ? "," : ""}
              {"\n"}
            </React.Fragment>
          ))}
          {closePad}]
        </>
      );
    }
    return (
      <>
        [
        {Array.from({ length: value.length }, (_, i) => (
          <React.Fragment key={i}>
            {renderItem(i)}
            {i < value.length - 1 ? ", " : ""}
          </React.Fragment>
        ))}
        ]
      </>
    );
  }

  if (isReactElement(value)) {
    return <JSXElement element={value} indent={indent} ancestors={nextAncestors} />;
  }

  if (typeof value === "object") {
    const obj = value as Record<string | symbol, unknown>;

    if (typeof obj.next === "function" && typeof obj[Symbol.iterator] === "function") {
      return <span className="TreeView-iterator">Iterator {"{}"}</span>;
    }

    if (typeof obj[Symbol.asyncIterator] === "function") {
      return <span className="TreeView-iterator">AsyncIterator {"{}"}</span>;
    }

    if (value instanceof ReadableStream) {
      return <span className="TreeView-stream">ReadableStream {"{}"}</span>;
    }

    if (typeof obj.then === "function") {
      return (
        <ErrorBoundary>
          <Suspense fallback={<PendingFallback />}>
            <Await promise={value as Thenable<unknown>}>
              {(resolved) => (
                <JSXValue value={resolved} indent={indent} ancestors={nextAncestors} />
              )}
            </Await>
          </Suspense>
        </ErrorBoundary>
      );
    }

    if (obj.$$typeof === Symbol.for("react.lazy")) {
      return (
        <ErrorBoundary>
          <Suspense fallback={<PendingFallback />}>
            <LazyValue value={value as ReactLazy} indent={indent} ancestors={nextAncestors} />
          </Suspense>
        </ErrorBoundary>
      );
    }

    const entries = Object.entries(obj);
    if (entries.length === 0) return <>{"{}"}</>;
    if (entries.length <= 2 && entries.every(([, v]) => typeof v !== "object" || v === null)) {
      return (
        <>
          {"{ "}
          {entries.map(([k, v], i) => (
            <React.Fragment key={k}>
              <span className="TreeView-key">{k}</span>:{" "}
              <JSXValue value={v} indent={indent} ancestors={nextAncestors} />
              {i < entries.length - 1 ? ", " : ""}
            </React.Fragment>
          ))}
          {" }"}
        </>
      );
    }
    const pad = "  ".repeat(indent + 1);
    const closePad = "  ".repeat(indent);
    return (
      <>
        {"{\n"}
        {entries.map(([k, v], i) => (
          <React.Fragment key={k}>
            {pad}
            <span className="TreeView-key">{k}</span>:{" "}
            <JSXValue value={v} indent={indent + 1} ancestors={nextAncestors} />
            {i < entries.length - 1 ? "," : ""}
            {"\n"}
          </React.Fragment>
        ))}
        {closePad}
        {"}"}
      </>
    );
  }

  return <span className="TreeView-unknown">{String(value)}</span>;
}

type JSXElementProps = {
  element: ReactElementInternal;
  indent: number;
  ancestors?: unknown[];
};

function JSXElement({ element, indent, ancestors = [] }: JSXElementProps): React.ReactElement {
  const { type, props, key } = element;
  const pad = "  ".repeat(indent);
  const padInner = "  ".repeat(indent + 1);

  let tagName: string;
  let tagClass = "TreeView-tag";
  if (typeof type === "string") {
    tagName = type;
  } else if (typeof type === "function") {
    const funcType = type as { displayName?: string; name?: string };
    tagName = funcType.displayName || funcType.name || "Component";
    tagClass = "TreeView-clientTag";
  } else if (typeof type === "symbol") {
    switch (type) {
      case Symbol.for("react.fragment"):
        tagName = "Fragment";
        break;
      case Symbol.for("react.profiler"):
        tagName = "Profiler";
        break;
      case Symbol.for("react.strict_mode"):
        tagName = "StrictMode";
        break;
      case Symbol.for("react.suspense"):
        tagName = "Suspense";
        break;
      case Symbol.for("react.suspense_list"):
        tagName = "SuspenseList";
        break;
      case Symbol.for("react.activity"):
        tagName = "Activity";
        break;
      case Symbol.for("react.view_transition"):
        tagName = "ViewTransition";
        break;
      default:
        tagName = "Unknown";
    }
    tagClass = "TreeView-reactTag";
  } else if (type && typeof type === "object" && (type as { $$typeof?: symbol }).$$typeof) {
    const lazyType = type as ReactLazy;
    if (lazyType.$$typeof === Symbol.for("react.lazy")) {
      return (
        <ErrorBoundary>
          <Suspense fallback={<PendingFallback />}>
            <LazyType
              element={element as ReactElementInternal & { type: ReactLazy }}
              indent={indent}
              ancestors={ancestors}
            />
          </Suspense>
        </ErrorBoundary>
      );
    }
    tagName = "Component";
    tagClass = "TreeView-clientTag";
  } else {
    tagName = "Unknown";
  }

  const { children, ...otherProps } = props;
  const propEntries = Object.entries(otherProps).filter(
    ([k]) => !["key", "ref", "__self", "__source"].includes(k),
  );

  if (
    children === undefined ||
    children === null ||
    (Array.isArray(children) && children.length === 0)
  ) {
    return (
      <>
        <span className={tagClass}>&lt;{tagName}</span>
        {key != null && (
          <>
            {" "}
            <span className="TreeView-propName">key</span>=
            <span className="TreeView-string">"{key}"</span>
          </>
        )}
        {propEntries.map(([k, v]) => (
          <JSXProp key={k} name={k} value={v} indent={indent + 1} ancestors={ancestors} />
        ))}
        <span className={tagClass}> /&gt;</span>
      </>
    );
  }

  const hasComplexChildren = typeof children !== "string" && typeof children !== "number";
  return (
    <>
      <span className={tagClass}>&lt;{tagName}</span>
      {key != null && (
        <>
          {" "}
          <span className="TreeView-propName">key</span>=
          <span className="TreeView-string">"{key}"</span>
        </>
      )}
      {propEntries.map(([k, v]) => (
        <JSXProp key={k} name={k} value={v} indent={indent + 1} ancestors={ancestors} />
      ))}
      <span className={tagClass}>&gt;</span>
      {hasComplexChildren ? (
        <>
          {"\n"}
          {padInner}
          <JSXChildren value={children} indent={indent + 1} ancestors={ancestors} />
          {"\n"}
          {pad}
        </>
      ) : (
        <JSXChildren value={children} indent={indent + 1} ancestors={ancestors} />
      )}
      <span className={tagClass}>&lt;/{tagName}&gt;</span>
    </>
  );
}

type JSXPropProps = {
  name: string;
  value: unknown;
  indent: number;
  ancestors?: unknown[];
};

function JSXProp({ name, value, indent, ancestors = [] }: JSXPropProps): React.ReactElement {
  if (typeof value === "string") {
    return (
      <>
        {" "}
        <span className="TreeView-propName">{name}</span>=
        <span className="TreeView-string">"{escapeHtml(value)}"</span>
      </>
    );
  }
  if (isReactElement(value)) {
    const pad = "  ".repeat(indent);
    const closePad = "  ".repeat(indent - 1);
    return (
      <>
        {" "}
        <span className="TreeView-propName">{name}</span>={"{"}
        {"\n"}
        {pad}
        <JSXValue value={value} indent={indent} ancestors={ancestors} />
        {"\n"}
        {closePad}
        {"}"}
      </>
    );
  }
  if (Array.isArray(value) && value.some((v) => isReactElement(v))) {
    const pad = "  ".repeat(indent);
    const closePad = "  ".repeat(indent - 1);
    return (
      <>
        {" "}
        <span className="TreeView-propName">{name}</span>={"{["}
        {"\n"}
        {value.map((v, i) => (
          <React.Fragment key={i}>
            {pad}
            <JSXValue value={v} indent={indent} ancestors={ancestors} />
            {i < value.length - 1 ? "," : ""}
            {"\n"}
          </React.Fragment>
        ))}
        {closePad}
        {"]}"}
      </>
    );
  }
  return (
    <>
      {" "}
      <span className="TreeView-propName">{name}</span>={"{"}
      <JSXValue value={value} indent={indent} ancestors={ancestors} />
      {"}"}
    </>
  );
}

type JSXChildrenProps = {
  value: unknown;
  indent: number;
  ancestors?: unknown[];
};

function JSXChildren({ value, indent, ancestors = [] }: JSXChildrenProps): React.ReactElement {
  if (typeof value === "string") return <>{escapeHtml(value)}</>;
  if (typeof value === "number") return <>{"{" + value + "}"}</>;
  if (Array.isArray(value)) {
    const pad = "  ".repeat(indent);
    const hasComplex = value.some((v) => isReactElement(v));
    if (hasComplex) {
      return (
        <>
          {value.map((child, i) => (
            <React.Fragment key={i}>
              <JSXChildren value={child} indent={indent} ancestors={ancestors} />
              {i < value.length - 1 ? "\n" + pad : ""}
            </React.Fragment>
          ))}
        </>
      );
    }
    return (
      <>
        {value.map((child, i) => (
          <React.Fragment key={i}>
            <JSXChildren value={child} indent={indent} ancestors={ancestors} />
          </React.Fragment>
        ))}
      </>
    );
  }
  return <JSXValue value={value} indent={indent} ancestors={ancestors} />;
}

type FlightTreeViewProps = {
  flightPromise: Thenable<unknown> | null;
  inEntry?: boolean;
};

export function FlightTreeView({
  flightPromise,
  inEntry,
}: FlightTreeViewProps): React.ReactElement {
  const className = inEntry ? "TreeView TreeView--inEntry" : "TreeView";

  if (!flightPromise) {
    return (
      <div className={className}>
        <pre className="TreeView-output">
          <PendingFallback />
        </pre>
      </div>
    );
  }

  return (
    <div className={className}>
      <pre className="TreeView-output">
        <ErrorBoundary>
          <Suspense fallback={<PendingFallback />}>
            <Await promise={flightPromise}>
              {(element) => <JSXValue value={element} indent={0} ancestors={[]} />}
            </Await>
          </Suspense>
        </ErrorBoundary>
      </pre>
    </div>
  );
}
