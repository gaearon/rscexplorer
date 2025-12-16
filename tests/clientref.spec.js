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

test('clientref sample - renders client module exports passed as props', async () => {
  await h.load('clientref');

  // Check flight rows include client references for themes
  const rows = await h.getRows();
  expect(rows.some(r => r.text.includes('darkTheme') || r.text.includes('lightTheme'))).toBe(true);

  // Step to end - should show both themed boxes
  expect(await h.stepAll()).toMatchInlineSnapshot(`
    "<div>
      <h1>Client Reference</h1>
      <div style={{ display: "flex", gap: 12 }}>
        <ThemedBox theme={{ background: "#1a1a1a", color: "#fff" }} label="Dark" />
        <ThemedBox theme={{ background: "#f5f5f5", color: "#000" }} label="Light" />
      </div>
    </div>"
  `);
  expect(await h.preview()).toMatchInlineSnapshot(`"Client Reference Dark theme Light theme"`);
});
