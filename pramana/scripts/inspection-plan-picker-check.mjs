import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const base = 'http://localhost:3008'; // Dedicated disposable database, never production.
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
async function api(route, method = 'GET', body) {
  const response = await fetch(`${base}${route}`, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  assert.ok(response.ok, `${route}: ${await response.clone().text()}`);
  return response.json();
}
const seed = await api('/api/rencana/RI-DT-UTYPE-01');
let plans = (await api('/api/rencana')).filter(plan => !plan.diarsipkan && plan.items.length);
for (let i = plans.length; i < 20; i++) {
  const plan = await api('/api/rencana', 'POST');
  await api(`/api/rencana/${plan.id}`, 'PATCH', { judul: `Inspection ${String(i).padStart(2, '0')} · Extended vehicle inspection with a long title that must wrap on mobile`, tipe_kendaraan: 'Workshop equipment', items: seed.items });
}
plans = (await api('/api/rencana')).filter(plan => !plan.diarsipkan && plan.items.length);
assert.equal(plans.length, 20);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
const out = '../docs/verification/screenshots'; mkdirSync(out, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', event => { if (event.type() === 'error') errors.push(event.text()); });
  await page.goto(`${base}/petugas?baru=1`, { waitUntil: 'networkidle' });
  const composer = page.getByRole('textbox', { name: 'Message Lumo' });
  await composer.fill('My name is Picker QA. I am at Riau. Please let me choose the inspection plan.');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  const trigger = page.getByRole('button', { name: 'Choose inspection plan', exact: true });
  await trigger.waitFor({ timeout: 120000 });
  const id = await page.evaluate(() => localStorage.getItem('pramana.inspection-draft'));
  const before = await api(`/api/laporan/${id}`);
  assert.equal(before.messages.at(-1).plan_choices.length, 20);
  assert.deepEqual(before.messages.at(-1).quick_replies, []);
  assert.equal(await page.locator('[data-inspection-choices]').count(), 0);
  async function settle() { await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); }); }
  async function bounds() {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const dialog = page.getByRole('dialog', { name: 'Choose inspection plan' });
    const box = await dialog.boundingBox(); const size = page.viewportSize();
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= size.width + 1 && box.y + box.height <= size.height + 1, JSON.stringify(box));
    const anchor = await trigger.boundingBox();
    assert.ok(Math.min(Math.abs(anchor.y - box.y - box.height), Math.abs(box.y - anchor.y - anchor.height)) <= 6, 'Filtered dropdown stays attached to its trigger');
  }
  await settle();
  await page.screenshot({ path: `${out}/inspection-plan-select-390.png`, animations: 'disabled' });
  await trigger.tap();
  const search = page.getByRole('combobox', { name: 'Search inspection plans' });
  await search.waitFor(); await settle(); await bounds();
  assert.equal(await page.getByRole('option').count(), 20);
  assert.equal(await search.evaluate(el => getComputedStyle(el).fontSize), '16px');
  assert.ok(await page.getByRole('listbox', { name: 'Inspection plans' }).evaluate(el => el.scrollHeight > el.clientHeight));
  assert.ok(await page.getByRole('option').first().locator('p').first().evaluate(el => el.clientHeight > parseFloat(getComputedStyle(el).lineHeight)), 'Long option title wraps');
  await page.screenshot({ path: `${out}/inspection-plan-select-open-390.png`, animations: 'disabled' });
  await search.fill('nothing-matches-this');
  await page.getByRole('status').filter({ hasText: 'No plans match' }).waitFor();
  assert.equal(await page.getByRole('option').count(), 0);
  await search.fill('u-type');
  assert.equal(await page.getByRole('option').count(), 1);
  await settle(); await bounds();
  await page.screenshot({ path: `${out}/inspection-plan-select-search-390.png`, animations: 'disabled' });
  await search.press('Escape');
  assert.equal(await page.getByRole('dialog').count(), 0);
  assert.equal(await trigger.evaluate(el => document.activeElement === el), true);
  await trigger.click(); await search.fill('workshop');
  assert.equal(await page.getByRole('option').count(), 19, 'Search also matches vehicle type');
  await page.getByRole('heading', { name: 'Lumo', exact: true }).click();
  assert.equal(await page.getByRole('dialog').count(), 0, 'Outside click closes the selector');
  await page.setViewportSize({ width: 1440, height: 900 });
  await trigger.click(); await search.fill('U-type'); await settle(); await bounds();
  await page.screenshot({ path: `${out}/inspection-plan-select-search-1440.png`, animations: 'disabled' });
  await search.press('Escape');
  await page.reload({ waitUntil: 'networkidle' });
  await trigger.waitFor(); await trigger.click();
  assert.equal(await page.getByRole('option').count(), 20, 'Draft reload keeps every plan available');
  await search.fill('U-type'); await search.press('ArrowDown');
  const selection = page.waitForRequest(request => /\/api\/laporan\/[^/]+\/turn$/.test(new URL(request.url()).pathname) && request.method() === 'POST');
  await search.press('Enter'); await selection;
  await page.waitForFunction(() => { const camera = document.querySelector('button[aria-label="Take a photo"]'); return camera && !camera.disabled; }, null, { timeout: 120000 });
  const after = await api(`/api/laporan/${id}`);
  assert.equal(after.rencana_id, seed.id);
  assert.equal(after.rencana_snapshot.items.length, 8);
  assert.equal(after.unit, null);
  assert.match(after.messages.at(-1).text, /unit|code|plate/i);
  assert.equal(await trigger.count(), 0, 'Plan picker disappears after selection');
  assert.ok(after.messages.some(message => message.role === 'user' && message.text === seed.judul));
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal((await api(`/api/laporan/${id}`)).rencana_id, seed.id);
  assert.deepEqual(errors, []);
  const result = { reportId: id, activePlans: 20, searchByTitleAndVehicle: true, longTitlesWrap: true, keyboardSelection: true, touchOpen: true, escapeAndOutsideClose: true, noMatchesState: true, persistedPlanId: after.rencana_id, snapshotItems: after.rencana_snapshot.items.length, followUp: after.messages.at(-1).text, browserErrors: errors };
  writeFileSync('../docs/verification/inspection-plan-picker.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
