// Safari doesn't implement ReadableByteStreamController.
// The standard web-streams-polyfill only polyfills ReadableStream, not byte streams.
// This adds the missing byte stream support.

import {
  ReadableStream as PolyfillReadableStream,
  ReadableByteStreamController as PolyfillReadableByteStreamController,
} from 'web-streams-polyfill';

if (typeof globalThis.ReadableByteStreamController === 'undefined') {
  // Safari doesn't have byte stream support - use the polyfill's ReadableStream
  // which includes full byte stream support
  globalThis.ReadableStream = PolyfillReadableStream;
  globalThis.ReadableByteStreamController = PolyfillReadableByteStreamController;
}
