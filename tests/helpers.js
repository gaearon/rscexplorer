import { expect } from 'vitest';

let prevRowTexts = [];
let prevStatuses = [];
let prevPreview = '';
let previewAsserted = true;
let pageRef = null;
let frameRef = null;

export function createHelpers(page) {
  pageRef = page;

  async function load(sample) {
    await page.goto(`http://localhost:5599/?s=${sample}`);
    // Wait for iframe to load and get frame reference
    const iframe = page.frameLocator('iframe');
    frameRef = iframe;
    // Wait for content inside iframe
    await iframe.locator('.log-entry').first().waitFor({ timeout: 10000 });
    await page.waitForTimeout(100);
    prevRowTexts = [];
    prevStatuses = [];
    prevPreview = await getPreviewText();
    previewAsserted = true;
  }

  async function getPreviewText() {
    return (await frameRef.locator('.preview-container').innerText()).trim().replace(/\s+/g, ' ');
  }

  async function doStep() {
    const btn = frameRef.locator('.control-btn').nth(2);
    if (await btn.isDisabled()) return null;
    await btn.click();
    await pageRef.waitForTimeout(50);

    const rows = await getRows();
    const texts = rows.map(r => r.text);
    const statuses = rows.map(r => r.status);

    for (let i = 0; i < Math.min(prevRowTexts.length, texts.length); i++) {
      expect(texts[i], `row ${i} content changed`).toBe(prevRowTexts[i]);
    }

    for (let i = 0; i < Math.min(prevStatuses.length, statuses.length); i++) {
      const prev = prevStatuses[i];
      const curr = statuses[i];
      if (prev === 'done') {
        expect(curr, `row ${i}: done should stay done`).toBe('done');
      } else if (prev === 'next') {
        expect(curr, `row ${i}: next should become done`).toBe('done');
      }
    }

    const prevNextIdx = prevStatuses.indexOf('next');
    if (prevNextIdx !== -1 && prevNextIdx < statuses.length) {
      expect(statuses[prevNextIdx], `previous "next" row should be "done"`).toBe('done');
    }

    prevRowTexts = texts;
    prevStatuses = statuses;

    return await tree();
  }

  async function step() {
    // Check for unasserted preview changes before stepping
    const currentPreview = await getPreviewText();
    if (currentPreview !== prevPreview && !previewAsserted) {
      expect.fail(`preview changed without assertion. Was: "${prevPreview}" Now: "${currentPreview}"`);
    }
    previewAsserted = false;
    return await doStep();
  }

  async function waitForStepButton() {
    const btn = frameRef.locator('.control-btn').nth(2);
    // Wait for button to be enabled
    await expect.poll(async () => {
      return !(await btn.isDisabled());
    }, { timeout: 10000 }).toBe(true);
    await pageRef.waitForTimeout(50);
  }

  async function stepAll() {
    // Check for unasserted preview changes before stepping
    const currentPreview = await getPreviewText();
    if (currentPreview !== prevPreview && !previewAsserted) {
      expect.fail(`preview changed without assertion. Was: "${prevPreview}" Now: "${currentPreview}"`);
    }

    // Wait for steps to be available
    await waitForStepButton();

    // Step once first to get initial state after stepping
    let lastTree = await doStep();
    if (lastTree === null) {
      previewAsserted = false;
      return await tree();
    }
    let lastPreview = await getPreviewText();

    // Keep stepping while tree and preview stay the same
    while (true) {
      const nextTree = await doStep();
      if (nextTree === null) break;

      const nextPreview = await getPreviewText();

      // If tree or preview changed from previous step, return new state
      if (nextTree !== lastTree || nextPreview !== lastPreview) {
        previewAsserted = false;
        return nextTree;
      }

      lastTree = nextTree;
      lastPreview = nextPreview;
    }

    previewAsserted = false;
    return await tree();
  }

  async function preview() {
    const current = await getPreviewText();
    if (current !== prevPreview) {
      prevPreview = current;
      previewAsserted = true;
    }
    return current;
  }

  async function stepInfo() {
    return (await frameRef.locator('.step-info').innerText()).trim();
  }

  async function getRows() {
    return frameRef.locator('.flight-line').evaluateAll(els =>
      els.map(el => ({
        text: el.textContent,
        status: el.classList.contains('line-done') ? 'done'
              : el.classList.contains('line-next') ? 'next'
              : 'pending'
      })).filter(({ text }) =>
        !text.startsWith(':N') &&
        !/^\w+:D/.test(text) &&
        !/^\w+:\{.*"name"/.test(text) &&
        !/^\w+:\[\[/.test(text)
      )
    );
  }

  async function tree() {
    // Find the log entry containing the "next" line, or the last done entry
    const treeText = await frameRef.locator('.log-entry').evaluateAll(entries => {
      const nextLine = document.querySelector('.line-next');
      if (nextLine) {
        const entry = nextLine.closest('.log-entry');
        const tree = entry?.querySelector('.log-entry-tree');
        return tree?.innerText?.trim() || null;
      }
      // No next line - get the last entry's tree
      if (entries.length === 0) return null;
      const lastEntry = entries[entries.length - 1];
      const tree = lastEntry.querySelector('.log-entry-tree');
      return tree?.innerText?.trim() || null;
    });
    return treeText;
  }

  async function checkNoRemainingSteps() {
    const initialTree = await tree();
    const initialPreview = await getPreviewText();

    // Consume remaining steps, but fail if tree or preview changes
    while (true) {
      const btn = frameRef.locator('.control-btn').nth(2);
      if (await btn.isDisabled()) break;

      await btn.click();
      await pageRef.waitForTimeout(50);

      const currentTree = await tree();
      const currentPreview = await getPreviewText();

      if (currentTree !== initialTree) {
        expect.fail(`Unasserted tree change at end of test.\nWas: ${initialTree}\nNow: ${currentTree}`);
      }
      if (currentPreview !== initialPreview) {
        expect.fail(`Unasserted preview change at end of test.\nWas: "${initialPreview}"\nNow: "${currentPreview}"`);
      }
    }
  }

  function frame() {
    return frameRef;
  }

  async function waitFor(predicate, options = {}) {
    const timeout = options.timeout || 10000;
    const interval = 50;
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const result = await frameRef.locator('body').evaluate(predicate);
      if (result) return;
      await pageRef.waitForTimeout(interval);
    }
    throw new Error(`waitFor timed out after ${timeout}ms`);
  }

  return { load, step, stepAll, stepInfo, getRows, preview, tree, checkNoRemainingSteps, frame, waitFor };
}
