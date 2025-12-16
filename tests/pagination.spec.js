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

test('pagination sample', async () => {
  await h.load('pagination');

  // Initial render - Suspense with Pending first
  expect(await h.stepAll()).toMatchInlineSnapshot(`
    "<div>
      <h1>Pagination</h1>
      <Suspense fallback={
        <p style={{ color: "#888" }}>Loading recipes...</p>
      }>
        Pending
      </Suspense>
    </div>"
  `);
  expect(await h.preview()).toMatchInlineSnapshot(`"Pagination Loading recipes..."`);

  // Then resolves to Paginator with initial items
  expect(await h.stepAll()).toMatchInlineSnapshot(`
    "<div>
      <h1>Pagination</h1>
      <Suspense fallback={
        <p style={{ color: "#888" }}>Loading recipes...</p>
      }>
        <Paginator initialItems={[
          <div key="1" style={{
              padding: 12,
              marginBottom: 8,
              background: "#f5f5f5",
              borderRadius: 6
            }}>
            <strong>Pasta Carbonara</strong>
            <p style={{
                margin: "4px 0 0",
                color: "#666",
                fontSize: 13
              }}>
              25 min · Medium
            </p>
          </div>,
          <div key="2" style={{
              padding: 12,
              marginBottom: 8,
              background: "#f5f5f5",
              borderRadius: 6
            }}>
            <strong>Grilled Cheese</strong>
            <p style={{
                margin: "4px 0 0",
                color: "#666",
                fontSize: 13
              }}>
              10 min · Easy
            </p>
          </div>
        ]} initialCursor={2} loadMoreAction={[Function: loadMore]} />
      </Suspense>
    </div>"
  `);
  expect(await h.preview()).toMatchInlineSnapshot(`"Pagination Loading recipes..."`);

  // First Load More
  await h.frame().locator('.preview-container button').click();
  expect(await h.preview()).toMatchInlineSnapshot(`"Pagination Pasta Carbonara 25 min · Medium Grilled Cheese 10 min · Easy Loading..."`);

  // Action returns new items
  expect(await h.stepAll()).toMatchInlineSnapshot(`
    "{
      newItems: [
        <div key="3" style={{
            padding: 12,
            marginBottom: 8,
            background: "#f5f5f5",
            borderRadius: 6
          }}>
          <strong>Chicken Stir Fry</strong>
          <p style={{
              margin: "4px 0 0",
              color: "#666",
              fontSize: 13
            }}>
            20 min · Easy
          </p>
        </div>,
        <div key="4" style={{
            padding: 12,
            marginBottom: 8,
            background: "#f5f5f5",
            borderRadius: 6
          }}>
          <strong>Beef Tacos</strong>
          <p style={{
              margin: "4px 0 0",
              color: "#666",
              fontSize: 13
            }}>
            30 min · Medium
          </p>
        </div>
      ],
      cursor: 4,
      hasMore: true
    }"
  `);
  expect(await h.preview()).toMatchInlineSnapshot(`"Pagination Pasta Carbonara 25 min · Medium Grilled Cheese 10 min · Easy Chicken Stir Fry 20 min · Easy Beef Tacos 30 min · Medium Load More"`);

  // Second Load More
  await h.frame().locator('.preview-container button').click();
  expect(await h.preview()).toMatchInlineSnapshot(`"Pagination Pasta Carbonara 25 min · Medium Grilled Cheese 10 min · Easy Chicken Stir Fry 20 min · Easy Beef Tacos 30 min · Medium Loading..."`);

  // Final items, hasMore: false
  expect(await h.stepAll()).toMatchInlineSnapshot(`
    "{
      newItems: [
        <div key="5" style={{
            padding: 12,
            marginBottom: 8,
            background: "#f5f5f5",
            borderRadius: 6
          }}>
          <strong>Caesar Salad</strong>
          <p style={{
              margin: "4px 0 0",
              color: "#666",
              fontSize: 13
            }}>
            15 min · Easy
          </p>
        </div>,
        <div key="6" style={{
            padding: 12,
            marginBottom: 8,
            background: "#f5f5f5",
            borderRadius: 6
          }}>
          <strong>Mushroom Risotto</strong>
          <p style={{
              margin: "4px 0 0",
              color: "#666",
              fontSize: 13
            }}>
            45 min · Hard
          </p>
        </div>
      ],
      cursor: 6,
      hasMore: false
    }"
  `);
  expect(await h.preview()).toMatchInlineSnapshot(`"Pagination Pasta Carbonara 25 min · Medium Grilled Cheese 10 min · Easy Chicken Stir Fry 20 min · Easy Beef Tacos 30 min · Medium Caesar Salad 15 min · Easy Mushroom Risotto 45 min · Hard"`);

  // No more items - button should be gone
  expect(await h.frame().locator('.preview-container button').isVisible()).toBe(false);
});
