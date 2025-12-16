const moduleCache = {};
const moduleFactories = {};

window.__webpack_module_cache__ = moduleCache;
window.__webpack_modules__ = moduleFactories;

window.__webpack_require__ = function(moduleId) {
  if (moduleCache[moduleId]) {
    return moduleCache[moduleId].exports || moduleCache[moduleId];
  }
  if (moduleFactories[moduleId]) {
    const module = { exports: {} };
    moduleFactories[moduleId](module);
    moduleCache[moduleId] = module;
    return module.exports;
  }
  throw new Error(`Module ${moduleId} not found in webpack shim`);
};

window.__webpack_require__.m = moduleFactories;
window.__webpack_require__.c = moduleCache;
window.__webpack_require__.d = function(exports, definition) {
  for (const key in definition) {
    if (Object.prototype.hasOwnProperty.call(definition, key) && !Object.prototype.hasOwnProperty.call(exports, key)) {
      Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
    }
  }
};
window.__webpack_require__.r = function(exports) {
  if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
  }
  Object.defineProperty(exports, '__esModule', { value: true });
};
window.__webpack_require__.o = function(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
};

window.__webpack_chunk_load__ = function(chunkId) {
  return Promise.resolve();
};

window.__webpack_require__.e = function(chunkId) {
  return Promise.resolve();
};

window.__webpack_require__.p = '/';
