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

test('hello sample', async () => {
  await h.load('hello');

  expect(await h.stepAll()).toMatchInlineSnapshot(`"<h1>Hello World</h1>"`);
  expect(await h.preview()).toMatchInlineSnapshot(`"Hello World"`);
});
