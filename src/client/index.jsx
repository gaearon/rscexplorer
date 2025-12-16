// Must be first - shims webpack globals for react-server-dom-webpack
import './webpack-shim.js';

import './byte-stream-polyfill.js';
import 'web-streams-polyfill/polyfill';
import 'text-encoding';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App.jsx';

// Mount the app
document.addEventListener('DOMContentLoaded', () => {
  const root = createRoot(document.getElementById('app'));
  root.render(<App />);
});
