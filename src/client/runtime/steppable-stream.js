import { createFromReadableStream } from 'react-server-dom-webpack/client';

/**
 * SteppableStream - makes a Flight stream steppable for debugging.
 *
 * Buffers incoming rows and controls their release to the Flight decoder.
 * The flightPromise only resolves when all rows have been released.
 */
export class SteppableStream {
  constructor(source, { callServer } = {}) {
    this.rows = [];
    this.releasedCount = 0;
    this.buffered = false;
    this.closed = false;

    const encoder = new TextEncoder();
    let controller;
    const output = new ReadableStream({
      start: (c) => { controller = c; }
    });

    this.release = (count) => {
      while (this.releasedCount < count && this.releasedCount < this.rows.length) {
        controller.enqueue(encoder.encode(this.rows[this.releasedCount] + '\n'));
        this.releasedCount++;
      }
      if (this.releasedCount >= this.rows.length && this.buffered && !this.closed) {
        controller.close();
        this.closed = true;
      }
    };

    this.flightPromise = createFromReadableStream(output, { callServer });
    this.bufferPromise = this.buffer(source);
  }

  async buffer(stream) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let partial = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        partial += decoder.decode(value, { stream: true });
        const lines = partial.split('\n');
        partial = lines.pop();

        for (const line of lines) {
          if (line.trim()) this.rows.push(line);
        }
      }

      partial += decoder.decode();
      if (partial.trim()) this.rows.push(partial);
    } finally {
      this.buffered = true;
    }
  }

  async waitForBuffer() {
    await this.bufferPromise;
  }
}
