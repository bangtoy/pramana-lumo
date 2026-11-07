// Requires the Compose app to be running; only restarts this project's app.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const base = `http://localhost:${process.env.PRAMANA_PORT || 3000}`;
const docker = args => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const container = docker(['compose', 'ps', '-q', 'app']);
const config = JSON.parse(docker(['exec', container, 'node', '-e', 'console.log(JSON.stringify({endpoint:process.env.OPENAI_BASE_URL,model:process.env.OPENAI_MODEL,keyConfigured:!!process.env.OPENAI_API_KEY,dataDir:process.env.DATA_DIR,uid:process.getuid()}))']));
assert.equal(config.dataDir, '/data'); assert.notEqual(config.uid, 0); assert.ok(config.keyConfigured);
const get = async route => { const response = await fetch(`${base}${route}`); assert.ok(response.ok); return response.json(); };
const before = { plans: await get('/api/rencana'), reports: await get('/api/laporan?status=terkirim') };
assert.ok(before.plans.some(p => p.id === 'RI-DT-UTYPE-01'));
assert.ok(before.reports.some(r => r.id === 'LI-2026-10-29-DT07'));
docker(['compose', 'restart', 'app']);
let ready = false;
for (let n = 0; n < 30 && !ready; n++) {
  try { ready = (await fetch(`${base}/api/rencana`)).ok; } catch {}
  if (!ready) await new Promise(resolve => setTimeout(resolve, 1000));
}
assert.ok(ready, 'App did not restart');
assert.deepEqual((await get('/api/rencana')).map(p => p.id).sort(), before.plans.map(p => p.id).sort());
assert.deepEqual((await get('/api/laporan?status=terkirim')).map(r => r.id).sort(), before.reports.map(r => r.id).sort());
assert.ok((await fetch(`${base}/api/files/FILE-DT07-BAN`)).ok);
const tunnel = docker(['compose', 'logs', '--no-color', 'tunnel']).match(/https:\/\/[a-z-]+\.trycloudflare\.com/)?.[0];
assert.ok(tunnel, 'No tunnel URL in logs');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const response = await page.goto(`${tunnel}/petugas`, { waitUntil: 'networkidle' });
  assert.equal(response.status(), 200);
  await page.getByLabel('Take an inspection photo').waitFor({ state: 'attached' });
  assert.equal(await page.getByLabel('Take an inspection photo').getAttribute('capture'), 'environment');
  assert.equal(await page.getByLabel('Attach inspection photos', { exact: true }).getAttribute('capture'), null);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: '../docs/verification/screenshots/docker-tunnel-390.png', fullPage: true });
} finally { await browser.close(); }
assert.deepEqual(errors, []);
const evidence = { config, localPort: process.env.PRAMANA_PORT || '3000', tunnel, persistenceAfterRestart: true, seedPlan: true, seedReport: true, evidenceReadable: true, mobileViewport: '390x844', cameraAndGallery: true, errors };
writeFileSync('../docs/verification/docker-check.json', JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
