import React, { Suspense, Component } from 'react';

function isReactElement(value) {
  if (!value || typeof value !== 'object') return false;
  const typeofSymbol = value.$$typeof;
  return typeofSymbol === Symbol.for('react.transitional.element');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function PendingFallback() {
  return <span className="tree-pending">Pending</span>;
}

function ErrorFallback({ error }) {
  const message = error?.message || String(error);
  return <span className="tree-error">Error: {message}</span>;
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

function Await({ promise, children }) {
  const value = React.use(promise);
  return children(value);
}

function LazyValue({ value, indent, ancestors = [] }) {
  const resolved = value._init(value._payload);
  return <JSXValue value={resolved} indent={indent} ancestors={ancestors} />;
}

function LazyType({ element, indent, ancestors = [] }) {
  const resolvedType = element.type._init(element.type._payload);
  const newElement = { ...element, type: resolvedType };
  return <JSXElement element={newElement} indent={indent} ancestors={ancestors} />;
}

// `ancestors` tracks the current path for cycle detection
function JSXValue({ value, indent = 0, ancestors = [] }) {
  if (value === null) return <span className="tree-null">null</span>;
  if (value === undefined) return <span className="tree-undefined">undefined</span>;

  if (typeof value === 'string') {
    const display = value.length > 50 ? value.slice(0, 50) + '...' : value;
    return <span className="tree-string">"{escapeHtml(display)}"</span>;
  }
  if (typeof value === 'number') {
    const display = Object.is(value, -0) ? '-0' : String(value);
    return <span className="tree-number">{display}</span>;
  }
  if (typeof value === 'bigint') {
    return <span className="tree-number">{String(value)}n</span>;
  }
  if (typeof value === 'boolean') return <span className="tree-boolean">{String(value)}</span>;
  if (typeof value === 'symbol') {
    return <span className="tree-symbol">{value.toString()}</span>;
  }
  if (typeof value === 'function') {
    return <span className="tree-function">[Function: {value.name || 'anonymous'}]</span>;
  }

  if (typeof value === 'object' && value !== null) {
    if (ancestors.includes(value)) {
      return <span className="tree-circular">[Circular]</span>;
    }
  }

  const nextAncestors = typeof value === 'object' && value !== null
    ? [...ancestors, value]
    : ancestors;

  if (value instanceof Date) {
    return <span className="tree-date">Date({value.toISOString()})</span>;
  }

  if (value instanceof Map) {
    if (value.size === 0) return <span className="tree-collection">Map(0) {'{}'}</span>;
    const pad = '  '.repeat(indent + 1);
    const closePad = '  '.repeat(indent);
    return (
      <>
        <span className="tree-collection">Map({value.size}) {'{\n'}</span>
        {Array.from(value.entries()).map(([k, v], i) => (
          <React.Fragment key={i}>
            {pad}<JSXValue value={k} indent={indent + 1} ancestors={nextAncestors} /> =&gt; <JSXValue value={v} indent={indent + 1} ancestors={nextAncestors} />
            {i < value.size - 1 ? ',' : ''}{'\n'}
          </React.Fragment>
        ))}
        {closePad}{'}'}
      </>
    );
  }

  if (value instanceof Set) {
    if (value.size === 0) return <span className="tree-collection">Set(0) {'{}'}</span>;
    const pad = '  '.repeat(indent + 1);
    const closePad = '  '.repeat(indent);
    return (
      <>
        <span className="tree-collection">Set({value.size}) {'{\n'}</span>
        {Array.from(value).map((v, i) => (
          <React.Fragment key={i}>
            {pad}<JSXValue value={v} indent={indent + 1} ancestors={nextAncestors} />
            {i < value.size - 1 ? ',' : ''}{'\n'}
          </React.Fragment>
        ))}
        {closePad}{'}'}
      </>
    );
  }

  if (value instanceof FormData) {
    const entries = Array.from(value.entries());
    if (entries.length === 0) return <span className="tree-collection">FormData {'{}'}</span>;
    const pad = '  '.repeat(indent + 1);
    const closePad = '  '.repeat(indent);
    return (
      <>
        <span className="tree-collection">FormData {'{\n'}</span>
        {entries.map(([k, v], i) => (
          <React.Fragment key={i}>
            {pad}<span className="tree-key">{k}</span>: <JSXValue value={v} indent={indent + 1} ancestors={nextAncestors} />
            {i < entries.length - 1 ? ',' : ''}{'\n'}
          </React.Fragment>
        ))}
        {closePad}{'}'}
      </>
    );
  }

  if (value instanceof Blob) {
    return <span className="tree-collection">Blob({value.size} bytes, "{value.type || 'application/octet-stream'}")</span>;
  }

  if (ArrayBuffer.isView(value)) {
    const name = value.constructor.name;
    const preview = Array.from(value.slice(0, 5)).join(', ');
    const suffix = value.length > 5 ? ', ...' : '';
    return <span className="tree-collection">{name}({value.length}) [{preview}{suffix}]</span>;
  }
  if (value instanceof ArrayBuffer) {
    return <span className="tree-collection">ArrayBuffer({value.byteLength} bytes)</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <>[]</>;
    const hasElements = value.some((v, i) => i in value && isReactElement(v));

    const renderItem = (i) => {
      if (!(i in value)) {
        return <span className="tree-empty">empty</span>;
      }
      return <JSXValue value={value[i]} indent={indent + 1} ancestors={nextAncestors} />;
    };

    if (hasElements || value.length > 3) {
      const pad = '  '.repeat(indent + 1);
      const closePad = '  '.repeat(indent);
      return (
        <>
          {'[\n'}
          {Array.from({ length: value.length }, (_, i) => (
            <React.Fragment key={i}>
              {pad}{renderItem(i)}
              {i < value.length - 1 ? ',' : ''}{'\n'}
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
            {i < value.length - 1 ? ', ' : ''}
          </React.Fragment>
        ))}
        ]
      </>
    );
  }

  if (isReactElement(value)) {
    return <JSXElement element={value} indent={indent} ancestors={nextAncestors} />;
  }

  if (typeof value === 'object') {
    if (typeof value.next === 'function' && typeof value[Symbol.iterator] === 'function') {
      return <span className="tree-iterator">Iterator {'{}'}</span>;
    }

    if (typeof value[Symbol.asyncIterator] === 'function') {
      return <span className="tree-iterator">AsyncIterator {'{}'}</span>;
    }

    if (value instanceof ReadableStream) {
      return <span className="tree-stream">ReadableStream {'{}'}</span>;
    }

    if (typeof value.then === 'function') {
      return (
        <ErrorBoundary>
          <Suspense fallback={<PendingFallback />}>
            <Await promise={value}>
              {(resolved) => <JSXValue value={resolved} indent={indent} ancestors={nextAncestors} />}
            </Await>
          </Suspense>
        </ErrorBoundary>
      );
    }

    if (value.$$typeof === Symbol.for('react.lazy')) {
      return (
        <ErrorBoundary>
          <Suspense fallback={<PendingFallback />}>
            <LazyValue value={value} indent={indent} ancestors={nextAncestors} />
          </Suspense>
        </ErrorBoundary>
      );
    }

    const entries = Object.entries(value)
    if (entries.length === 0) return <>{'{}'}</>;
    if (entries.length <= 2 && entries.every(([, v]) => typeof v !== 'object' || v === null)) {
      return (
        <>
          {'{ '}
          {entries.map(([k, v], i) => (
            <React.Fragment key={k}>
              <span className="tree-key">{k}</span>: <JSXValue value={v} indent={indent} ancestors={nextAncestors} />
              {i < entries.length - 1 ? ', ' : ''}
            </React.Fragment>
          ))}
          {' }'}
        </>
      );
    }
    const pad = '  '.repeat(indent + 1);
    const closePad = '  '.repeat(indent);
    return (
      <>
        {'{\n'}
        {entries.map(([k, v], i) => (
          <React.Fragment key={k}>
            {pad}<span className="tree-key">{k}</span>: <JSXValue value={v} indent={indent + 1} ancestors={nextAncestors} />
            {i < entries.length - 1 ? ',' : ''}{'\n'}
          </React.Fragment>
        ))}
        {closePad}{'}'}
      </>
    );
  }

  return <span className="tree-unknown">{String(value)}</span>;
}

function JSXElement({ element, indent, ancestors = [] }) {
  const { type, props, key } = element;
  const pad = '  '.repeat(indent);
  const padInner = '  '.repeat(indent + 1);

  let tagName, tagClass = 'tree-tag';
  if (typeof type === 'string') {
    tagName = type;
  } else if (typeof type === 'function') {
    tagName = type.displayName || type.name || 'Component';
    tagClass = 'tree-client-tag';
  } else if (typeof type === 'symbol') {
    switch (type) {
      case Symbol.for('react.fragment'):
        tagName = 'Fragment';
        break;
      case Symbol.for('react.profiler'):
        tagName = 'Profiler';
        break;
      case Symbol.for('react.strict_mode'):
        tagName = 'StrictMode';
        break;
      case Symbol.for('react.suspense'):
        tagName = 'Suspense';
        break;
      case Symbol.for('react.suspense_list'):
        tagName = 'SuspenseList';
        break;
      case Symbol.for('react.activity'):
        tagName = 'Activity';
        break;
      case Symbol.for('react.view_transition'):
        tagName = 'ViewTransition';
        break;
      default:
        tagName = 'Unknown';
    }
    tagClass = 'tree-react-tag';
  } else if (type && typeof type === 'object' && type.$$typeof) {
    if (type.$$typeof === Symbol.for('react.lazy')) {
      return (
        <ErrorBoundary>
          <Suspense fallback={<PendingFallback />}>
            <LazyType element={element} indent={indent} ancestors={ancestors} />
          </Suspense>
        </ErrorBoundary>
      );
    }
    tagName = 'Component';
    tagClass = 'tree-client-tag';
  } else {
    tagName = 'Unknown';
  }

  const { children, ...otherProps } = props || {};
  const propEntries = Object.entries(otherProps).filter(([k]) =>
    !['key', 'ref', '__self', '__source'].includes(k)
  );

  if (children === undefined || children === null || (Array.isArray(children) && children.length === 0)) {
    return (
      <>
        <span className={tagClass}>&lt;{tagName}</span>
        {key != null && <> <span className="tree-prop-name">key</span>=<span className="tree-string">"{key}"</span></>}
        {propEntries.map(([k, v]) => (
          <JSXProp key={k} name={k} value={v} indent={indent + 1} ancestors={ancestors} />
        ))}
        <span className={tagClass}> /&gt;</span>
      </>
    );
  }

  const hasComplexChildren = typeof children !== 'string' && typeof children !== 'number';
  return (
    <>
      <span className={tagClass}>&lt;{tagName}</span>
      {key != null && <> <span className="tree-prop-name">key</span>=<span className="tree-string">"{key}"</span></>}
      {propEntries.map(([k, v]) => (
        <JSXProp key={k} name={k} value={v} indent={indent + 1} ancestors={ancestors} />
      ))}
      <span className={tagClass}>&gt;</span>
      {hasComplexChildren ? (
        <>
          {'\n'}{padInner}<JSXChildren value={children} indent={indent + 1} ancestors={ancestors} />{'\n'}{pad}
        </>
      ) : (
        <JSXChildren value={children} indent={indent + 1} ancestors={ancestors} />
      )}
      <span className={tagClass}>&lt;/{tagName}&gt;</span>
    </>
  );
}

function JSXProp({ name, value, indent, ancestors = [] }) {
  if (typeof value === 'string') {
    return <> <span className="tree-prop-name">{name}</span>=<span className="tree-string">"{escapeHtml(value)}"</span></>;
  }
  if (isReactElement(value)) {
    const pad = '  '.repeat(indent);
    const closePad = '  '.repeat(indent - 1);
    return (
      <>
        {' '}<span className="tree-prop-name">{name}</span>={'{'}
        {'\n'}{pad}<JSXValue value={value} indent={indent} ancestors={ancestors} />{'\n'}{closePad}
        {'}'}
      </>
    );
  }
  if (Array.isArray(value) && value.some(v => isReactElement(v))) {
    const pad = '  '.repeat(indent);
    const closePad = '  '.repeat(indent - 1);
    return (
      <>
        {' '}<span className="tree-prop-name">{name}</span>={'{['}
        {'\n'}
        {value.map((v, i) => (
          <React.Fragment key={i}>
            {pad}<JSXValue value={v} indent={indent} ancestors={ancestors} />
            {i < value.length - 1 ? ',' : ''}{'\n'}
          </React.Fragment>
        ))}
        {closePad}{']}'}
      </>
    );
  }
  return <> <span className="tree-prop-name">{name}</span>={'{'}<JSXValue value={value} indent={indent} ancestors={ancestors} />{'}'}</>;
}

function JSXChildren({ value, indent, ancestors = [] }) {
  if (typeof value === 'string') return <>{escapeHtml(value)}</>;
  if (typeof value === 'number') return <>{'{' + value + '}'}</>;
  if (Array.isArray(value)) {
    const pad = '  '.repeat(indent);
    const hasComplex = value.some(v => isReactElement(v));
    if (hasComplex) {
      return (
        <>
          {value.map((child, i) => (
            <React.Fragment key={i}>
              <JSXChildren value={child} indent={indent} ancestors={ancestors} />
              {i < value.length - 1 ? '\n' + pad : ''}
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

export function FlightTreeView({ flightPromise }) {
  if (!flightPromise) {
    return (
      <div className="flight-tree">
        <pre className="jsx-output"><PendingFallback /></pre>
      </div>
    );
  }

  return (
    <div className="flight-tree">
      <pre className="jsx-output">
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
