import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { LINE_ENDS } from '../skills/anatomy/scripts/line-ends.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const base = `http://localhost:${process.env.PORT || 3002}`;
const id = process.env.PLAN_ID;
assert.ok(id, 'Set PLAN_ID');
const plan = await (await fetch(`${base}/api/rencana/${id}`)).json();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 4, reducedMotion: 'reduce' });
const errors = [], results = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
try {
  await page.goto(`${base}/supervisor/agent?rencana=${id}&chat=dock`, { waitUntil: 'networkidle' });
  await page.locator('.truck-svg').waitFor();
  for (const item of plan.items) {
    await page.locator(`[data-item-id="${item.id}"] > button`).click();
    await page.mouse.move(400, 80);
    await page.waitForFunction(comp => !!document.querySelector(`.truck-svg [data-comp="${comp}"].is-focus`), item.comp_id);
    const groups = page.locator(`.truck-svg [data-comp="${item.comp_id}"].is-focus`);
    assert.ok(await groups.count(), `Missing highlight for ${item.nama}`);
  }
  await page.locator(`[data-item-id="${plan.items.at(-1).id}"] > button`).click();
  await page.mouse.move(400, 80);
  for (const theme of ['light', 'dark']) {
    await page.locator('.iso').evaluate((n, theme) => n.setAttribute('data-theme', theme), theme);
    const audit = await page.evaluate(`(${LINE_ENDS})({select:'.iso'})`);
    results.push({ theme, ends: audit.ends, problems: audit.problems });
    await page.locator('.iso').screenshot({ path: `../docs/verification/screenshots/generated-model-${theme}-4x.png`, animations: 'disabled' });
  }
  assert.deepEqual(errors, []);
  writeFileSync('../docs/verification/generated-model-check.json', JSON.stringify({ planId: id, modelId: plan.model_id, highlights: plan.items.length, results, errors }, null, 2));
  console.log(JSON.stringify({ highlights: plan.items.length, results: results.map(r => ({ theme: r.theme, problems: r.problems.length })), errors }, null, 2));
  assert.equal(results.reduce((total, r) => total + r.problems.length, 0), 0, 'Anatomy line ends must pass');
} finally { await browser.close(); }
