import { test, expect, beforeAll, afterAll } from 'vitest';
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

test('step backward returns to previous state', async () => {
  await h.load('hello');

  // Step forward and acknowledge preview changes
  await h.stepAll();
  await h.preview(); // Acknowledge preview change

  const endCursor = await h.getCursor();
  expect(endCursor.cursor).toBe(endCursor.total);

  // Step backward
  await h.stepBack();
  const cursorAfterBack = await h.getCursor();
  expect(cursorAfterBack.cursor).toBe(endCursor.total - 1);
});

test('step backward at start does nothing', async () => {
  await h.load('hello');

  // At start, cursor should be 0
  const cursorAtStart = await h.getCursor();
  expect(cursorAtStart.cursor).toBe(0);

  // Step backward should return null (button disabled)
  const result = await h.stepBack();
  expect(result).toBe(null);

  // Cursor should still be 0
  const cursorAfter = await h.getCursor();
  expect(cursorAfter.cursor).toBe(0);
});

test('step forward after backward continues correctly', async () => {
  await h.load('hello');

  // Step forward to end
  await h.stepAll();
  await h.preview(); // Acknowledge preview change
  const endCursor = await h.getCursor();

  // Step backward once
  await h.stepBack();
  await h.preview(); // Acknowledge preview change
  const cursor2 = await h.getCursor();
  expect(cursor2.cursor).toBe(endCursor.cursor - 1);

  // Step forward again - should return to end
  await h.stepAll();
  await h.preview(); // Acknowledge preview change
  const cursorForwardAgain = await h.getCursor();
  expect(cursorForwardAgain.cursor).toBe(endCursor.cursor);
});

test('multiple step backwards work correctly', async () => {
  await h.load('hello');

  // Step forward to end
  await h.stepAll();
  await h.preview(); // Acknowledge preview change
  const endCursor = await h.getCursor();
  expect(endCursor.cursor).toBe(endCursor.total);

  // Step backward multiple times
  await h.stepBack();
  await h.stepBack();
  await h.stepBack();

  const afterBackCursor = await h.getCursor();
  expect(afterBackCursor.cursor).toBe(endCursor.total - 3);
});

test('seek to specific position works', async () => {
  await h.load('hello');

  // Get total chunks
  const initial = await h.getCursor();
  const total = initial.total;

  // Seek to middle
  const midpoint = Math.floor(total / 2);
  await h.seek(midpoint);
  const midCursor = await h.getCursor();
  expect(midCursor.cursor).toBe(midpoint);

  // Seek to end
  await h.seek(total);
  const endCursor = await h.getCursor();
  expect(endCursor.cursor).toBe(total);

  // Seek back to start
  await h.seek(0);
  const startCursor = await h.getCursor();
  expect(startCursor.cursor).toBe(0);
});

test('seek backward replays stream correctly', async () => {
  await h.load('hello');

  // Step to end and capture tree
  const treeAtEnd = await h.stepAll();
  await h.preview(); // Acknowledge preview change

  // Seek backward to position 1
  await h.seek(1);
  await h.preview(); // Acknowledge preview change
  const cursor1 = await h.getCursor();
  expect(cursor1.cursor).toBe(1);

  // Step forward to end again - tree should match (using stepAll to properly complete)
  await h.stepAll();
  await h.preview(); // Acknowledge preview change
  const treeAtEndAgain = await h.tree();
  expect(treeAtEndAgain).toBe(treeAtEnd);
});

test('preview updates correctly after backward navigation', async () => {
  await h.load('hello');

  // Step to show content
  await h.stepAll();
  const previewAtEnd = await h.preview();
  expect(previewAtEnd).toMatchInlineSnapshot(`"Hello World"`);

  // Seek back to start
  await h.seek(0);
  const previewAtStart = await h.preview();
  expect(previewAtStart).toMatchInlineSnapshot(`"Step to begin..."`);

  // Step forward again
  await h.stepAll();
  const previewAtEndAgain = await h.preview();
  expect(previewAtEndAgain).toBe(previewAtEnd);
});
