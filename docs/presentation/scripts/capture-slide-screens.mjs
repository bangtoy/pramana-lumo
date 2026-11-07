import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'assets/screens');
const base = (process.env.APP_CAPTURE_BASE_URL || 'https://lumo.bangtoy.work').replace(/\/$/, '');
const selected = process.argv.slice(2);
const targets = [
  { id: 'dump-truck', file: 'dump-truck-inspection.png', route: '/supervisor/agent?rencana=RI-DT-UTYPE-01', width: 1440, height: 900, heading: 'P2H · U-type dump truck' },
  { id: 'excavator', file: 'excavator-inspection.png', route: '/supervisor/agent?rencana=RI-48ee9f27-fe3f-491b-93d2-e6ed24cf9081', width: 1916, height: 947, heading: 'JCB JS120 Excavator — Daily P2H Inspection' },
  { id: 'report', file: 'supervisor-report.png', route: '/supervisor/laporan/LI-ee9abbcb-7a1d-470a-beb0-d716984c73db', width: 1440, height: 900, heading: 'DEMO-1 is not roadworthy' },
].filter(target => !selected.length || selected.includes(target.id));
assert.ok(targets.length, 'Choose dump-truck, excavator, or report.');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
try {
  for (const target of targets) {
    const page = await browser.newPage({ viewport: { width: target.width, height: target.height }, reducedMotion: 'reduce' });
    const errors = [], blockedWrites = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.route('**/api/**', route => {
      if (['GET', 'HEAD'].includes(route.request().method())) return route.continue();
      blockedWrites.push({ method: route.request().method(), url: route.request().url() });
      return route.abort('blockedbyclient');
    });
    const response = await page.goto(base + target.route, { waitUntil: 'networkidle', timeout: 60000 });
    assert.equal(response?.status(), 200);
    if (target.id === 'report') await page.getByRole('heading', { name: target.heading, exact: true }).waitFor();
    else {
      const title = page.getByRole('textbox', { name: 'Plan title', exact: true });
      await title.waitFor();
      assert.equal(await title.inputValue(), target.heading);
    }
    await page.locator('.truck-svg').first().waitFor();
    const logo = page.locator('aside a[aria-label] img').first();
    await logo.waitFor();
    await logo.evaluate(image => image.decode());
    const branding = await logo.evaluate(image => ({ src: image.getAttribute('src'), width: image.naturalWidth, height: image.naturalHeight }));
    assert.ok(branding.src.includes('icon-lumo-face.png'), 'Use the current application logo.');
    assert.ok(branding.width && branding.height);
    if (target.id === 'report') {
      const finding = page.locator('button[aria-controls^="finding-detail-"]').filter({ hasText: 'Tyres & wheel nuts' });
      if (await finding.getAttribute('aria-expanded') !== 'true') await finding.click();
    }
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
    });
    const alerts = (await page.getByRole('alert').allTextContents()).map(text => text.trim()).filter(Boolean);
    assert.deepEqual(alerts, []);
    assert.deepEqual(blockedWrites, [], 'Captures must not write application data.');
    assert.deepEqual(errors, []);
    const file = path.join(output, target.file);
    await page.screenshot({ path: file });
    const metadata = {
      capturedAt: new Date().toISOString(), baseURL: base, route: target.route,
      viewport: { width: target.width, height: target.height }, title: await page.title(),
      image: `assets/screens/${target.file}`, sha256: createHash('sha256').update(await readFile(file)).digest('hex'),
      logo: branding, policy: 'Read-only capture of an existing plan or report. API writes are blocked.', errors, blockedWrites,
    };
    await writeFile(path.join(output, `${target.id}-capture.json`), JSON.stringify(metadata, null, 2) + '\n');
    console.log(JSON.stringify({ screenshot: metadata.image, route: target.route, logo: branding.src, errors }));
    await page.close();
  }
} finally { await browser.close(); }
