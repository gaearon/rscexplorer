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

test('counter sample', async () => {
  await h.load('counter');

  expect(await h.stepAll()).toMatchInlineSnapshot(`
    "<div>
      <h1>Counter</h1>
      <Counter initialCount={0} />
    </div>"
  `);
  expect(await h.preview()).toMatchInlineSnapshot(`"Counter Count: 0 − +"`);

  // Client interactivity works
  await h.frame().locator('.preview-container button').last().click();
  expect(await h.preview()).toContain('Count: 1');
});
