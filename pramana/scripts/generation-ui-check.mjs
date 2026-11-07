import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const base = `http://localhost:${process.env.PORT || 3002}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  for (const mode of ['reduced', 'no-webgl', 'failed']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
    if (mode === 'no-webgl') await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type === 'webgl' ? null : original.call(this, type, ...args); };
    });
    await page.route('**/api/models/MDL-DT-UTYPE', async route => {
      const response = await route.fetch(); const model = await response.json();
      await route.fulfill({ json: { ...model, status: mode === 'failed' ? 'gagal' : 'proses', pesan: 'The geometry audit did not pass. Try again or choose an existing model.', log: [{ jenis: 'fase', teks: 'Queued', at: new Date().toISOString() }, { jenis: 'fase', teks: 'Building vehicle', at: new Date().toISOString() }] } });
    });
    await page.goto(`${base}/supervisor/agent?rencana=RI-DT-UTYPE-01`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: mode === 'failed' ? 'Generation failed' : 'Building your vehicle' }).waitFor();
    await page.getByText('Generation activity · 2 events', { exact: true }).click();
    assert.ok(await page.getByText('Building vehicle', { exact: true }).isVisible());
    assert.ok(await page.getByRole('textbox', { name: /Message Lumo/ }).isEnabled());
    await page.screenshot({ path: `../docs/verification/screenshots/generation-${mode}.png` });
    assert.deepEqual(errors, []); results.push({ mode, activityVisible: true, composerEnabled: true, errors }); await page.close();
  }
} finally { await browser.close(); }
writeFileSync('../docs/verification/generation-ui-check.json', JSON.stringify(results, null, 2));
console.log(results);
