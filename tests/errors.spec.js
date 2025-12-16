import { test, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { chromium } from 'playwright';
import { createHelpers } from './helpers.js';

let browser, page, h;

beforeAll(async () => {
  browser = await chromium.launch();
  page = await browser.newPage();
  h = createHelpers(page);
});

afterAll(async () => {
  await browser.close();
});

afterEach(async () => {
  await h.checkNoRemainingSteps();
});

test('errors sample - error boundary catches thrown error', async () => {
  await h.load('errors');

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
  expect(await h.preview()).toContain('Error Handling');

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
  expect(await h.preview()).toContain('Failed to load user');
  expect(await h.preview()).toContain('Please try again later');
});
