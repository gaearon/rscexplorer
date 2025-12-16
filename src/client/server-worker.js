import workerUrl from '../server/worker.js?rolldown-worker';

const randomUUID = crypto.randomUUID?.bind(crypto) ?? function() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 1
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
};

function serializeForTransfer(encoded) {
  if (encoded instanceof FormData) {
    return { type: 'formdata', data: new URLSearchParams(encoded).toString() };
  }
  return { type: 'string', data: encoded };
}

export class ServerWorker {
  constructor() {
    this.worker = new Worker(workerUrl);
    this.pending = new Map();
    this.streams = new Map();
    this.readyPromise = new Promise(resolve => {
      this.readyResolve = resolve;
    });

    this.worker.onmessage = this.handleMessage.bind(this);
    this.worker.onerror = this.handleError.bind(this);
  }

  handleMessage(event) {
    const { type, requestId, error, chunk } = event.data;

    if (type === 'ready') {
      this.readyResolve();
      return;
    }

    if (type === 'stream-start') {
      const pending = this.pending.get(requestId);
      if (!pending) return;
      this.pending.delete(requestId);

      let controller;
      const stream = new ReadableStream({
        start: (c) => { controller = c; }
      });
      this.streams.set(requestId, controller);
      pending.resolve(stream);
      return;
    }

    if (type === 'stream-chunk') {
      const controller = this.streams.get(requestId);
      if (controller) controller.enqueue(chunk);
      return;
    }

    if (type === 'stream-end') {
      const controller = this.streams.get(requestId);
      if (controller) {
        controller.close();
        this.streams.delete(requestId);
      }
      return;
    }

    if (type === 'stream-error') {
      const controller = this.streams.get(requestId);
      if (controller) {
        controller.error(new Error(error.message));
        this.streams.delete(requestId);
      }
      return;
    }

    const pending = this.pending.get(requestId);
    if (!pending) {
      console.warn(`No pending request for ${requestId}`);
      return;
    }

    this.pending.delete(requestId);

    if (type === 'error') {
      const err = new Error(error.message);
      err.stack = error.stack;
      pending.reject(err);
    } else if (type === 'deployed') {
      pending.resolve();
    }
  }

  handleError(event) {
    const errorMsg = event.message || event.error?.message || 'Unknown worker error';
    console.error(`Worker error: ${errorMsg}`);

    for (const [, pending] of this.pending) {
      pending.reject(new Error(`Worker error: ${errorMsg}`));
    }
    this.pending.clear();
  }

  async deploy({ compiledCode, manifest, actionNames }) {
    await this.readyPromise;
    const requestId = randomUUID();

    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      this.worker.postMessage({
        type: 'deploy',
        requestId,
        compiledCode,
        manifest,
        actionNames,
      });
    });
  }

  async render() {
    await this.readyPromise;
    const requestId = randomUUID();

    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      this.worker.postMessage({ type: 'render', requestId });
    });
  }

  async callAction(actionId, encodedArgs) {
    await this.readyPromise;
    const requestId = randomUUID();

    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      this.worker.postMessage({
        type: 'action',
        requestId,
        actionId,
        encodedArgs: serializeForTransfer(encodedArgs),
      });
    });
  }

  async callActionRaw(actionId, rawPayload) {
    await this.readyPromise;
    const requestId = randomUUID();

    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      this.worker.postMessage({
        type: 'action',
        requestId,
        actionId,
        encodedArgs: { type: 'formdata', data: rawPayload },
      });
    });
  }

  terminate() {
    this.worker.terminate();
    for (const [, pending] of this.pending) {
      pending.reject(new Error('Worker terminated'));
    }
    this.pending.clear();
    for (const [, controller] of this.streams) {
      controller.error(new Error('Worker terminated'));
    }
    this.streams.clear();
  }
}
