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

test('bound sample - renders bound actions with different greetings', async () => {
  await h.load('bound');

  // Step to end - should show 3 Greeter forms
  expect(await h.stepAll()).toMatchInlineSnapshot(`
    "<div>
      <h1>Bound Actions</h1>
      <p style={{ color: "#888", marginBottom: 16 }}>Same action, different bound greetings:</p>
      <Greeter action={[Function: bound greet]} />
      <Greeter action={[Function: bound greet]} />
      <Greeter action={[Function: bound greet]} />
    </div>"
  `);
  expect(await h.preview()).toMatchInlineSnapshot(`"Bound Actions Same action, different bound greetings: Greet Greet Greet"`);
});

test('bound sample - three concurrent actions', async () => {
  await h.load('bound');

  // Step to end to render UI
  expect(await h.stepAll()).toMatchInlineSnapshot(`
    "<div>
      <h1>Bound Actions</h1>
      <p style={{ color: "#888", marginBottom: 16 }}>Same action, different bound greetings:</p>
      <Greeter action={[Function: bound greet]} />
      <Greeter action={[Function: bound greet]} />
      <Greeter action={[Function: bound greet]} />
    </div>"
  `);
  expect(await h.preview()).toMatchInlineSnapshot(`"Bound Actions Same action, different bound greetings: Greet Greet Greet"`);

  // Fill all three inputs and submit all three forms
  const inputs = h.frame().locator('.preview-container input');
  const buttons = h.frame().locator('.preview-container button');

  await inputs.nth(0).fill('Alice');
  await inputs.nth(1).fill('Bob');
  await inputs.nth(2).fill('Charlie');

  await buttons.nth(0).click();
  await buttons.nth(1).click();
  await buttons.nth(2).click();

  // First action pending
  expect(await h.stepAll()).toMatchInlineSnapshot(`"Pending"`);
  expect(await h.preview()).toMatchInlineSnapshot(`"Bound Actions Same action, different bound greetings: Greet Greet Greet"`);

  // First action resolves - Hello greeting (second still pending)
  expect(await h.stepAll()).toMatchInlineSnapshot(`"Pending"`);
  expect(await h.preview()).toMatchInlineSnapshot(`"Bound Actions Same action, different bound greetings: GreetHello, Alice! Greet Greet"`);

  // Second action resolves - Howdy greeting (third still pending)
  expect(await h.stepAll()).toMatchInlineSnapshot(`"Pending"`);
  expect(await h.preview()).toMatchInlineSnapshot(`"Bound Actions Same action, different bound greetings: GreetHello, Alice! GreetHowdy, Bob! Greet"`);

  // Third action resolves - Hey greeting
  expect(await h.stepAll()).toMatchInlineSnapshot(`""Hey, Charlie!""`);
  expect(await h.preview()).toMatchInlineSnapshot(`"Bound Actions Same action, different bound greetings: GreetHello, Alice! GreetHowdy, Bob! GreetHey, Charlie!"`);
});
