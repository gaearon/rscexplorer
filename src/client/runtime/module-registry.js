import React from 'react';

export function registerClientModule(moduleId, moduleExports) {
  if (typeof __webpack_module_cache__ !== 'undefined') {
    __webpack_module_cache__[moduleId] = { exports: moduleExports };
  }
}

export function evaluateClientModule(compiledCode) {
  const module = { exports: {} };
  const require = (id) => {
    if (id === 'react') return React;
    throw new Error(`Module "${id}" not found in client context`);
  };
  const fn = new Function('module', 'exports', 'require', 'React', compiledCode);
  fn(module, module.exports, require, React);
  return module.exports;
}
