import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const base = `http://localhost:${process.env.PORT || 3001}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
try {
  await page.goto(`${base}/petugas?baru=1`, { waitUntil: 'networkidle' });
  const composer = page.getByRole('textbox', { name: 'Message Lumo' }); await composer.waitFor();
  const id = await page.evaluate(() => localStorage.getItem('pramana.inspection-draft'));
  assert.equal(await composer.evaluate(el => getComputedStyle(el).fontSize), '16px');
  assert.equal(await page.getByLabel('Take an inspection photo').getAttribute('capture'), 'environment');
  assert.equal(await page.getByLabel('Attach an image').getAttribute('capture'), null);
  await page.screenshot({ path: '../docs/verification/screenshots/inspector-opening-390.png' });
  async function send(text) {
    await composer.fill(text);
    const request = page.waitForRequest(request => /\/api\/laporan\/[^/]+\/turn$/.test(new URL(request.url()).pathname) && request.method() === 'POST');
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    await request;
    await page.waitForFunction(() => { const camera = document.querySelector('button[aria-label="Take a photo"]'); return camera && !camera.disabled; }, null, { timeout: 120000 });
  }
  await send('I am Alex at Tanjung Enim. Use RI-DT-UTYPE-01 for DT-11 · B 9111 KD. The truck is safely parked, isolated and chocked.');
  await page.locator('.truck-svg [data-comp="kabin"].is-focus').first().waitFor();
  await page.screenshot({ path: '../docs/verification/screenshots/inspector-active-390.png' });
  await page.getByRole('button', { name: 'Vehicle model' }).click(); assert.equal(await page.locator('.truck-svg').count(), 0);
  await page.getByRole('button', { name: 'Vehicle model' }).click();
  await page.getByLabel(process.env.PHOTO_SOURCE === 'gallery' ? 'Attach an image' : 'Take an inspection photo').setInputFiles('public/demo/apar-label.jpg');
  await page.getByText('Ready to send', { exact: true }).waitFor();
  const previewText = await page.getByRole('img', { name: 'Preview of apar-label.jpg', exact: true }).locator('..').locator('..').innerText();
  await page.screenshot({ path: '../docs/verification/screenshots/inspector-photo-390.png' });
  await send('Record cabin safety as cannot inspect, STOP pending safe reinspection: access and functional safety checks are unavailable. This photo only documents the extinguisher label, not a complete cabin inspection.');
  const report = await (await fetch(`${base}/api/laporan/${id}`)).json(); assert.ok(report.hasil['ITEM-1']);
  const evidenceId = report.hasil['ITEM-1'].bukti_ids[0];
  const bytes = (await (await fetch(`${base}/api/files/${evidenceId}`)).arrayBuffer()).byteLength;
  assert.ok(bytes < 300 * 1024, `Uploaded photo ${bytes} bytes`);
  await page.goto(`${base}/petugas`, { waitUntil: 'networkidle' }); await page.getByText(/1\/8 recorded/).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('pramana.inspection-draft')), id);
  page.once('dialog', dialog => dialog.dismiss()); await page.getByRole('button', { name: 'New inspection', exact: true }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem('pramana.inspection-draft')), id);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: '../docs/verification/screenshots/inspector-resumed-390.png' });
  await page.goto(`${base}/petugas?laporan=LI-2026-10-29-DT07`, { waitUntil: 'networkidle' }); await page.getByRole('heading', { name: 'Inspection submitted' }).waitFor();
  await page.screenshot({ path: '../docs/verification/screenshots/inspector-complete-390.png' });
  assert.deepEqual(errors, []);
  const result = { reportId: id, fontSize: 16, capture: 'environment', source: process.env.PHOTO_SOURCE || 'camera', compressedPreview: previewText, uploadedPhotoBytes: bytes, resumed: true, newInspectionConfirmation: true, highlighted: true, errors, device: 'Chromium mobile emulation; user confirmed the physical-phone camera flow works' };
  writeFileSync('../docs/verification/inspector-ui-check.json', JSON.stringify(result, null, 2)); console.log(result);
} finally { await browser.close(); }
