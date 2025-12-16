// Server Worker - RSC server simulation
//
// Models a real server: deploy code once, then handle requests against it.
// - `deploy`: Store compiled code, manifest, etc. (like deploying to production)
// - `render`/`action`: Execute against deployed code

import './webpack-shim.js';
import '../client/byte-stream-polyfill.js';
import 'text-encoding';

import {
  renderToReadableStream,
  registerServerReference,
  createClientModuleProxy,
  decodeReply,
} from 'react-server-dom-webpack/server';
import React from 'react';

let deployed = null;

// Safari doesn't support transferable streams
async function streamToMain(stream, requestId) {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        self.postMessage({ type: 'stream-end', requestId });
        break;
      }
      self.postMessage({ type: 'stream-chunk', requestId, chunk: value });
    }
  } catch (err) {
    self.postMessage({ type: 'stream-error', requestId, error: { message: err.message } });
  }
}

self.onmessage = async (event) => {
  const { type, requestId } = event.data;

  try {
    switch (type) {
      case 'deploy':
        handleDeploy(event.data);
        break;
      case 'render':
        await handleRender(event.data);
        break;
      case 'action':
        await handleAction(event.data);
        break;
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      requestId,
      error: { message: error.message, stack: error.stack },
    });
  }
};

function handleDeploy({ compiledCode, manifest, actionNames, requestId }) {
  const clientModule = createClientModuleProxy('client');
  const modules = { 'react': React, './client': clientModule };
  const serverModule = evalModule(compiledCode, modules, actionNames);

  deployed = { manifest, serverModule, actionNames };

  self.postMessage({ type: 'deployed', requestId });
}

function requireDeployed() {
  if (!deployed) throw new Error('No code deployed');
  return deployed;
}

async function handleRender({ requestId }) {
  const { manifest, serverModule } = requireDeployed();

  const App = serverModule.default || serverModule;
  const element = typeof App === 'function' ? React.createElement(App) : App;

  const flightStream = renderToReadableStream(element, manifest, {
    onError: (error) => error.message || String(error),
  });

  self.postMessage({ type: 'stream-start', requestId });
  streamToMain(flightStream, requestId);
}

async function handleAction({ actionId, encodedArgs, requestId }) {
  const { manifest, serverModule } = requireDeployed();

  const actionFn = serverModule[actionId];
  if (typeof actionFn !== 'function') {
    throw new Error(`Action "${actionId}" not found`);
  }

  const toDecode = reconstructEncodedArgs(encodedArgs);
  const args = await decodeReply(toDecode, {});
  const result = await actionFn(...(Array.isArray(args) ? args : [args]));

  const flightStream = renderToReadableStream(result, manifest, {
    onError: (error) => error.message || String(error),
  });

  self.postMessage({ type: 'stream-start', requestId });
  streamToMain(flightStream, requestId);
}

function reconstructEncodedArgs(encodedArgs) {
  if (encodedArgs.type === 'formdata') {
    const formData = new FormData();
    for (const [key, value] of new URLSearchParams(encodedArgs.data)) {
      formData.append(key, value);
    }
    return formData;
  }
  return encodedArgs.data;
}

function evalModule(code, modules, actionNames) {
  let finalCode = code;
  if (actionNames?.length > 0) {
    finalCode += '\n' + actionNames
      .map(name => `__registerServerReference(${name}, "${name}", "${name}"); exports.${name} = ${name};`)
      .join('\n');
  }

  const module = { exports: {} };
  const require = (id) => {
    if (!modules[id]) throw new Error(`Module "${id}" not found`);
    return modules[id];
  };

  new Function('module', 'exports', 'require', 'React', '__registerServerReference', finalCode)(
    module, module.exports, require, React, registerServerReference
  );

  return module.exports;
}

self.postMessage({ type: 'ready' });
