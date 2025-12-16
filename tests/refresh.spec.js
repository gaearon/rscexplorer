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

test('refresh sample - renders router with async content', async () => {
  await h.load('refresh');

  // Step to initial render (shows Pending)
  expect(await h.stepAll()).toMatchInlineSnapshot(`
    "<div>
      <h1>Router Refresh</h1>
      <p style={{ marginBottom: 12, color: "#666" }}>Client state persists across server navigations</p>
      <Suspense fallback={
        <p>Loading...</p>
      }>
        <Router initial={Pending} refreshAction={[Function: renderPage]} />
      </Suspense>
    </div>"
  `);
  expect(await h.preview()).toMatchInlineSnapshot(`"Router Refresh Client state persists across server navigations Loading..."`);

  // Step to resolve async Timer content (color is random hsl value)
  const tree = await h.stepAll();
  expect(tree).toMatch(/Router Refresh/);
  expect(tree).toMatch(/<Timer color="hsl\(\d+, 70%, 85%\)" \/>/);

  // Wait for preview to render the timer (shows "0s" or similar)
  await h.waitFor(
    () => /\d+s/.test(document.querySelector('.preview-container')?.textContent || ''),
    { timeout: 5000 }
  );
  const preview = await h.preview();
  expect(preview).toMatch(/Router Refresh.*\d+s.*Refresh/);
});
