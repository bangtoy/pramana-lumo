import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
const base = `http://localhost:${process.env.PORT || 3000}`;
try {
  await page.goto(`${base}/supervisor/laporan`, { waitUntil: 'networkidle' });
  const rail = page.getByRole('complementary', { name: 'Supervisor navigation' });
  assert.equal(await rail.evaluate(n => n.getBoundingClientRect().width), 240);
  await page.keyboard.press('Control+b');
  assert.equal(await rail.getAttribute('data-collapsed'), 'true');
  assert.equal(await rail.evaluate(n => n.getBoundingClientRect().width), 64);
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await rail.getAttribute('data-collapsed'), 'true');
  // The Next.js development indicator occupies the bottom-left footer button.
  // Exercise the same accessible toggle through its documented keyboard shortcut.
  await page.keyboard.press('Control+b');
  await page.getByRole('navigation', { name: 'Workspace' }).getByRole('link', { name: 'Agent', exact: true }).click();
  await page.getByRole('region', { name: 'Plan history' }).waitFor();
  await page.getByRole('textbox', { name: 'Search plans' }).fill('nonexistent-search');
  await page.getByText('No matching plans.', { exact: true }).waitFor();
  await page.getByRole('textbox', { name: 'Search plans' }).fill('');
  await page.getByRole('button', { name: 'New plan', exact: true }).click();
  await page.waitForURL(/rencana=RI-/);
  const id = new URL(page.url()).searchParams.get('rencana');
  const plan = await (await page.request.get(`${base}/api/rencana/${id}`)).json();
  assert.equal(plan.items.length, 0);
  await page.getByLabel('Actions for Untitled inspection plan').click();
  await page.getByRole('button', { name: 'Archive plan', exact: true }).click();
  await page.waitForURL(`${base}/supervisor/agent`);
  assert.equal((await (await page.request.get(`${base}/api/rencana/${id}`)).json()).diarsipkan, true);
  await page.getByRole('navigation', { name: 'Workspace' }).getByRole('link', { name: 'Dashboard' }).click();
  await page.getByRole('navigation', { name: 'Dashboard pages' }).waitFor();
  await page.goto(`${base}/petugas`, { waitUntil: 'networkidle' });
  assert.equal(await page.getByRole('navigation', { name: 'Inspector navigation' }).count(), 0);
  await page.getByRole('link', { name: 'History', exact: true }).click();
  await page.getByRole('navigation', { name: 'Inspector navigation' }).waitFor();
  assert.deepEqual(errors, []);
  writeFileSync('../docs/verification/screenshots/shell-check.json', JSON.stringify({ sidebarWidths: [240, 64], persistence: true, modeSwitch: true, search: true, createdAndArchived: id, inspectorTabs: true, errors }, null, 2));
  console.log('Shell interactions passed');
} finally { await browser.close(); }
