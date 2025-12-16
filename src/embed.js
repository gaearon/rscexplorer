/**
 * RSC Explorer Embed API
 *
 * Usage:
 * ```html
 * <div id="demo" style="height: 500px;"></div>
 * <script type="module">
 * import { mount } from 'https://rscexplorer.dev/embed.js';
 *
 * mount('#demo', {
 *   server: `
 * export default function App() {
 *   return <h1>Hello RSC</h1>;
 * }
 *   `,
 *   client: `
 * 'use client'
 * export function Button() {
 *   return <button>Click</button>;
 * }
 *   `
 * });
 * </script>
 * ```
 */

// Get the embed URL relative to this script's location
const getEmbedUrl = () => {
  return new URL('embed.html', import.meta.url).href;
};

/**
 * Mount an RSC Explorer embed into a container element
 * @param {string|HTMLElement} container - CSS selector or DOM element
 * @param {Object} options - Configuration options
 * @param {string} options.server - Server component code
 * @param {string} options.client - Client component code
 * @returns {Object} - Control object with methods to interact with the embed
 */
export function mount(container, { server, client }) {
  const el =
    typeof container === "string"
      ? document.querySelector(container)
      : container;

  if (!el) {
    throw new Error(`RSC Explorer: Container not found: ${container}`);
  }

  // Create iframe
  const iframe = document.createElement("iframe");
  iframe.src = getEmbedUrl();
  iframe.style.cssText =
    "width: 100%; height: 100%; border: 1px solid #e0e0e0; border-radius: 8px;";

  // Wait for iframe to be ready, then send code
  const handleMessage = (event) => {
    if (event.source !== iframe.contentWindow) return;

    if (event.data?.type === "rsc-embed:ready") {
      iframe.contentWindow.postMessage(
        {
          type: "rsc-embed:init",
          code: { server: server.trim(), client: client.trim() },
        },
        "*",
      );
    }
  };

  window.addEventListener("message", handleMessage);

  // Clear container and add iframe
  el.innerHTML = "";
  el.appendChild(iframe);

  // Return control object
  return {
    iframe,
    destroy: () => {
      window.removeEventListener("message", handleMessage);
      el.innerHTML = "";
    },
  };
}
