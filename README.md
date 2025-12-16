# RSC Explorer

A tool for educators and thinkerers curious about the React Server Components (RSC) protocol.

[RSC Explorer](https://rscexplorer.dev/) runs both the Server and the Client parts of RSC in the browser.

It lets you inspect the RSC stream step by step and observe the React tree that is being streamed at every step. It also hosts some examples that showcase how React Server and Client features can interplay.

![Screenshot](./screenshot.png)

This is a hobby project and is not affiliated with or endorsed by any person, living or dead.

## Examples

* [Hello World](https://rscexplorer.dev/?s=hello)
* [Async Component](https://rscexplorer.dev/?s=async)
* [Counter](https://rscexplorer.dev/?s=counter)
* [Form Action](https://rscexplorer.dev/?s=form)
* [Pagination](https://rscexplorer.dev/?s=pagination)
* [Router Refresh](https://rscexplorer.dev/?s=refresh)
* [Error Handling](https://rscexplorer.dev/?s=errors)
* [Client Reference](https://rscexplorer.dev/?s=clientref)
* [Bound Actions](https://rscexplorer.dev/?s=bound)
* [Kitchen Sink](https://rscexplorer.dev/?s=kitchensink)
* [CVE-2025-55182](https://rscexplorer.dev/?s=cve)

## Embedding

You can embed RSC Explorer onto a page. Press the `< >` button in the top bar for the embed code.

## Development

Key design decisions to keep in mind:

- The Server part runs in a worker.
- We try to approximate a real RSC environment as much as we can (while staying in browser).
- No dependencies on React internals. We use `react-server-dom-webpack` and shim the Webpack runtime.
- No dependencies on the protocol format. We display it, but treat it as an implementation detail of React.
- Only end-to-end tests.

This is fully vibecoded but heavily steered so individual pieces may be weird or suboptimal.

Improvements welcome.

## License

MIT
