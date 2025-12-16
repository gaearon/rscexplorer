// Shim webpack globals for react-server-dom-webpack/server in worker context
// Uses self instead of window since this runs in a Web Worker

const moduleCache = {};

self.__webpack_require__ = function(moduleId) {
  if (moduleCache[moduleId]) {
    return moduleCache[moduleId];
  }
  throw new Error(`Module ${moduleId} not found in webpack shim`);
};

self.__webpack_require__.m = {};
self.__webpack_require__.c = moduleCache;
self.__webpack_require__.d = function(exports, definition) {
  for (const key in definition) {
    if (Object.prototype.hasOwnProperty.call(definition, key) && !Object.prototype.hasOwnProperty.call(exports, key)) {
      Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
    }
  }
};
self.__webpack_require__.r = function(exports) {
  if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
  }
  Object.defineProperty(exports, '__esModule', { value: true });
};
self.__webpack_require__.o = function(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
};

self.__webpack_chunk_load__ = function(chunkId) {
  return Promise.resolve();
};

self.__webpack_require__.e = function(chunkId) {
  return Promise.resolve();
};

self.__webpack_require__.p = '/';
