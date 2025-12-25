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

test("errors sample - error boundary catches thrown error", async () => {
  await h.load("errors");

  // Step to end - should show error fallback (fetchUser throws)
  expect(await h.stepAll()).toMatchInlineSnapshot(`
    "<div>
      <h1>Error Handling</h1>
      <ErrorBoundary fallback={
        <div style={{
          padding: 16,
          background: "#fee",
          borderRadius: 8,
          color: "#c00"
        }}>
          <strong>Failed to load user</strong>
          <p style={{ margin: "4px 0 0" }}>Please try again later.</p>
        </div>
      }>
        <Suspense fallback={
          <p>Loading user...</p>
        }>
          Pending
        </Suspense>
      </ErrorBoundary>
    </div>"
  `);
  expect(await h.preview("Loading user")).toMatchInlineSnapshot(`
    "Error Handling

    Loading user..."
  `);

  // After async resolves with error, error boundary catches it
  expect(await h.stepAll()).toMatchInlineSnapshot(`
    "<div>
      <h1>Error Handling</h1>
      <ErrorBoundary fallback={
        <div style={{
          padding: 16,
          background: "#fee",
          borderRadius: 8,
          color: "#c00"
        }}>
          <strong>Failed to load user</strong>
          <p style={{ margin: "4px 0 0" }}>Please try again later.</p>
        </div>
      }>
        <Suspense fallback={
          <p>Loading user...</p>
        }>
          Error: Network error
        </Suspense>
      </ErrorBoundary>
    </div>"
  `);
  expect(await h.preview("Failed to load user")).toMatchInlineSnapshot(
    `
    "Error Handling
    Failed to load user

    Please try again later."
  `,
  );
});
