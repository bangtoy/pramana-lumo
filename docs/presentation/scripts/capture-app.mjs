import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'assets/live');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
const evidence = { capturedAt: new Date().toISOString(), baseURL: 'https://p2h.apta.works', policy: 'Read-only navigation of existing records; no chat, report, or work order submitted. Avoid /supervisor/agent without a rencana ID because that page creates a draft on load.', pages: [] };
const routes = [ ['home', '/', 1440, 900], ['laporan', '/supervisor/laporan', 1440, 900], ['report-detail', '/supervisor/laporan/LI-2026-10-29-DT07', 1440, 900], ['rencana', '/supervisor/rencana', 1440, 900], ['plan-detail', '/supervisor/agent?rencana=RI-DT-UTYPE-01', 1440, 900], ['work-order', '/supervisor/work-order', 1440, 900], ['ringkasan', '/supervisor', 1440, 900], ['petugas', '/petugas', 390, 844] ];
for (const [name, route, width, height] of routes) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.route('**/api/**', route => ['GET','HEAD','OPTIONS'].includes(route.request().method()) ? route.continue() : route.abort('blockedbyclient'));
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    const response = await page.goto(evidence.baseURL + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(1800);
    const text = await page.locator('body').innerText();
    const result = { name, route, status: response?.status(), finalURL: page.url(), title: await page.title(), text, errors, links: await page.locator('a').evaluateAll(links => links.map(a => ({ text: a.innerText, href: a.getAttribute('href') }))) };
    if (response?.ok() && !text.includes('This page could not be found')) { await page.screenshot({ path: path.join(out, name + '.png') }); result.screenshot = `assets/live/${name}.png`; }
    evidence.pages.push(result);
    console.log(JSON.stringify({ name, status: result.status, url: result.finalURL, text: text.slice(0,5500), errors }));
  } catch (error) { evidence.pages.push({ name, route, error: error.message }); console.log(name + ': ' + error.message); }
  await page.close();
}
await browser.close();
await writeFile(path.join(out, 'capture.json'), JSON.stringify(evidence, null, 2));
