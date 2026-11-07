import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const integration = JSON.parse(readFileSync('../docs/verification/integration-check.json', 'utf8'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  for (const run of integration.runs) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`${integration.base}/petugas?laporan=${run.reportId}`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Inspection submitted' }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    for (const label of ['View report', 'Inspection history']) {
      const box = await page.getByRole('link', { name: label, exact: true }).boundingBox();
      assert.ok(box && box.y >= 0 && box.y + box.height <= 844, `${label} must be visible without scrolling`);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `../docs/verification/screenshots/integration-${run.run}-submitted-390.png` });
    results.push({ run: run.run, reportId: run.reportId, bothLinksVisibleWithoutScrolling: true, errors });
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync('../docs/verification/completion-check.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
