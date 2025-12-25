import { test, expect, beforeAll, afterAll, afterEach } from "vitest";
import { createHelpers, launchBrowser, type TestHelpers } from "./helpers.ts";
import type { Browser, Page } from "playwright";

let browser: Browser;
let page: Page;
let h: TestHelpers;

beforeAll(async () => {
  browser = await launchBrowser();
  page = await browser.newPage();
  h = createHelpers(page);
});

afterAll(async () => {
  await browser.close();
});

afterEach(async () => {
  await h.checkNoRemainingSteps();
});

test("kitchensink sample - renders all RSC protocol types", async () => {
  await h.load("kitchensink");

  // Should have many rows for all the different types
  const rows = await h.getRows();
  expect(rows.length).toBeGreaterThan(5);

  // Step to initial suspense
  expect(await h.stepAll()).toMatchInlineSnapshot(`
    "<div>
      <h1>Kitchen Sink</h1>
      <Suspense fallback={
        <p>Loading...</p>
      }>
        Pending
      </Suspense>
    </div>"
  `);
  expect(await h.preview("Loading...")).toMatchInlineSnapshot(`
    "Kitchen Sink

    Loading..."
  `);

  // Step to resolve async content (with delayed promise still pending)
  expect(await h.stepAll()).toMatchInlineSnapshot(`
    "<div>
      <h1>Kitchen Sink</h1>
      <Suspense fallback={
        <p>Loading...</p>
      }>
        <DataDisplay data={{
          primitives: {
            null: null,
            true: true,
            false: false,
            int: 42,
            float: 3.14159,
            string: "hello world",
            empty: "",
            dollar: "$special",
            unicode: "Hello 世界 🌍"
          },
          special: {
            negZero: -0,
            inf: Infinity,
            negInf: -Infinity,
            nan: NaN
          },
          types: {
            date: Date(2024-01-15T12:00:00.000Z),
            bigint: 12345678901234567890n,
            symbol: Symbol(mySymbol)
          },
          binary: {
            uint8: Uint8Array(5) [1, 2, 3, 4, 5],
            int32: Int32Array(3) [-1, 0, 2147483647],
            float64: Float64Array(2) [3.14159, 2.71828]
          },
          collections: {
            map: Map(2) {
              "a" => 1,
              "b" => { nested: true }
            },
            set: Set(3) {
              1,
              2,
              "three"
            },
            formData: FormData {
              key: "value"
            },
            blob: Blob(5 bytes, "text/plain")
          },
          arrays: {
            simple: [1, 2, 3],
            sparse: [
              1,
              empty,
              empty,
              4
            ],
            nested: [[1], [2, [3]]]
          },
          objects: {
            simple: { a: 1 },
            nested: {
              x: {
                y: { z: "deep" }
              }
            }
          },
          elements: {
            div: <div className="test">Hello</div>,
            fragment: [
              <span>a</span>,
              <span>b</span>
            ],
            suspense: <Suspense fallback="...">
              <p>content</p>
            </Suspense>
          },
          promises: {
            resolved: "immediate",
            delayed: Pending
          },
          iterators: {
            sync: Iterator {}
          },
          refs: {
            dup: {
              a: { id: 1 },
              b: { id: 1 }
            },
            cyclic: {
              name: "cyclic",
              self: [Circular]
            }
          },
          action: [Function: serverAction]
        }} />
      </Suspense>
    </div>"
  `);
  expect(await h.preview("Loading...")).toMatchInlineSnapshot(`
    "Kitchen Sink

    Loading..."
  `);

  // Step to resolve delayed promise
  expect(await h.stepAll()).toMatchInlineSnapshot(`
    "<div>
      <h1>Kitchen Sink</h1>
      <Suspense fallback={
        <p>Loading...</p>
      }>
        <DataDisplay data={{
          primitives: {
            null: null,
            true: true,
            false: false,
            int: 42,
            float: 3.14159,
            string: "hello world",
            empty: "",
            dollar: "$special",
            unicode: "Hello 世界 🌍"
          },
          special: {
            negZero: -0,
            inf: Infinity,
            negInf: -Infinity,
            nan: NaN
          },
          types: {
            date: Date(2024-01-15T12:00:00.000Z),
            bigint: 12345678901234567890n,
            symbol: Symbol(mySymbol)
          },
          binary: {
            uint8: Uint8Array(5) [1, 2, 3, 4, 5],
            int32: Int32Array(3) [-1, 0, 2147483647],
            float64: Float64Array(2) [3.14159, 2.71828]
          },
          collections: {
            map: Map(2) {
              "a" => 1,
              "b" => { nested: true }
            },
            set: Set(3) {
              1,
              2,
              "three"
            },
            formData: FormData {
              key: "value"
            },
            blob: Blob(5 bytes, "text/plain")
          },
          arrays: {
            simple: [1, 2, 3],
            sparse: [
              1,
              empty,
              empty,
              4
            ],
            nested: [[1], [2, [3]]]
          },
          objects: {
            simple: { a: 1 },
            nested: {
              x: {
                y: { z: "deep" }
              }
            }
          },
          elements: {
            div: <div className="test">Hello</div>,
            fragment: [
              <span>a</span>,
              <span>b</span>
            ],
            suspense: <Suspense fallback="...">
              <p>content</p>
            </Suspense>
          },
          promises: {
            resolved: "immediate",
            delayed: "delayed"
          },
          iterators: {
            sync: Iterator {}
          },
          refs: {
            dup: {
              a: { id: 1 },
              b: { id: 1 }
            },
            cyclic: {
              name: "cyclic",
              self: [Circular]
            }
          },
          action: [Function: serverAction]
        }} />
      </Suspense>
    </div>"
  `);
  expect(await h.preview("hello world")).toMatchInlineSnapshot(
    `
    "Kitchen Sink
    primitives
    null: null
    true: true
    false: false
    int: 42
    float: 3.14159
    string: hello world
    empty:
    dollar: $special
    unicode: Hello 世界 🌍
    special
    negZero: 0
    inf: Infinity
    negInf: -Infinity
    nan: NaN
    types
    date: 2024-01-15T12:00:00.000Z
    bigint: 12345678901234567890n
    symbol: Symbol(mySymbol)
    binary
    uint8: Uint8Array(5)
    int32: Int32Array(3)
    float64: Float64Array(2)
    collections
    map: Map(2)
    set: Set(3)
    formData: FormData
    blob: Blob(5)
    arrays
    simple: [3 items]
    sparse: [4 items]
    nested: [2 items]
    objects
    simple: {...}
    nested: {...}
    elements
    div: {...}
    fragment: [2 items]
    suspense: {...}
    promises
    resolved: {...}
    delayed: {...}
    iterators
    sync: {...}
    refs
    dup: {...}
    cyclic: {...}
    action
    Call serverAction"
  `,
  );
});
