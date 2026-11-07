import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { jakartaDay } from '../lib/waktu.ts';
import { chooseDate, chooseOption } from './ui-controls.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const base = `http://localhost:${process.env.PORT || 3000}`;
const shots = process.env.PLANNER_SCREENSHOTS_DIR || join(tmpdir(), 'pramana-ui-polish');
await mkdir(shots, { recursive: true });
const errors = [];
function observe(page) {
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(`${message.text()} (${message.location().url})`); });
}
const result = {};
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  observe(page);
  await page.addInitScript(() => localStorage.setItem('pramana.tanya-open', 'false'));
  const snapshot = name => page.screenshot({ path: join(shots, name), animations: 'disabled' });
  const report = await (await page.request.get(`${base}/api/laporan/LI-RW-45`)).json();
  await page.goto(`${base}/supervisor/laporan`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('select, input[type="date"]').count(), 0);
  const inspector = page.getByRole('combobox', { name: 'Inspector', exact: true });
  await page.getByRole('textbox', { name: 'Search unit', exact: true }).fill('DT-07');
  await chooseOption(page, inspector, report.petugas);
  await page.waitForURL(url => url.searchParams.get('unit') === 'DT-07' && url.searchParams.get('petugas') === report.petugas);
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await inspector.innerText(), report.petugas);
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
  await page.waitForURL(url => !url.search);
  const from = page.getByRole('button', { name: 'From date (WIB)', exact: true });
  const to = page.getByRole('button', { name: 'To date (WIB)', exact: true });
  await from.press('ArrowDown');
  const calendar = page.locator('.date-picker-menu');
  const current = calendar.locator('button:focus');
  assert.equal(await current.getAttribute('data-value'), jakartaDay());
  await current.press('ArrowRight');
  assert.equal(await calendar.locator('button:focus').getAttribute('data-value'), jakartaDay(-1));
  await calendar.locator('button:focus').press('PageDown');
  await calendar.locator('button:focus').press('PageUp');
  assert.equal(await calendar.locator('button:focus').getAttribute('data-value'), jakartaDay(-1));
  await page.keyboard.press('Escape');
  assert.equal(await from.evaluate(node => node === document.activeElement), true);
  await chooseDate(page, from, jakartaDay(2));
  await page.waitForURL(url => url.searchParams.get('dari') === jakartaDay(2));
  await to.click();
  assert.equal(await calendar.locator(`button[data-value="${jakartaDay(3)}"]`).isDisabled(), true);
  await calendar.locator(`button[data-value="${jakartaDay(1)}"]`).click();
  await page.waitForURL(url => url.searchParams.get('sampai') === jakartaDay(1));
  await from.click();
  assert.equal(await calendar.locator(`button[data-value="${jakartaDay()}"]`).isDisabled(), true);
  await snapshot('filter-date-range-1440.png');
  await page.keyboard.press('Escape');
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await from.getAttribute('data-value'), jakartaDay(2));
  assert.equal(await to.getAttribute('data-value'), jakartaDay(1));
  await chooseDate(page, from, '');
  await page.waitForURL(url => !url.searchParams.has('dari'));
  await chooseDate(page, to, '');
  await page.waitForURL(url => !url.search);
  await page.setViewportSize({ width: 390, height: 844 });
  await from.click();
  const mobile = await calendar.boundingBox();
  assert.ok(mobile.x >= 8 && mobile.x + mobile.width <= 382 && mobile.y >= 8 && mobile.y + mobile.height <= 836, JSON.stringify(mobile));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await snapshot('filter-calendar-390.png');
  await page.keyboard.press('Escape');
  result.reportFilters = { customInspector: true, blurPreservesUnit: true, datesPersistInUrl: true, keyboard: true, minMax: true, clear: true, responsive390: true };

  const original = (await (await page.request.get(`${base}/api/work-order`)).json())[0];
  assert.ok(original);
  let orders = [
    { ...original, id: 'WO-PICKER-HIGH', prioritas: 'tinggi', status: 'terbuka', target: jakartaDay() },
    { ...original, id: 'WO-PICKER-MEDIUM', prioritas: 'sedang', status: 'terbuka', target: jakartaDay() },
    { ...original, id: 'WO-PICKER-DONE', prioritas: 'sedang', status: 'selesai', target: jakartaDay() },
  ];
  const patches = [];
  await page.route('**/api/work-order**', async route => {
    if (route.request().method() === 'PATCH') {
      const patch = route.request().postDataJSON(), id = new URL(route.request().url()).pathname.split('/').at(-1);
      patches.push(patch); orders = orders.map(order => order.id === id ? { ...order, ...patch } : order);
      return route.fulfill({ json: orders.find(order => order.id === id) });
    }
    return route.fulfill({ json: orders });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/supervisor/work-order`, { waitUntil: 'networkidle' });
  const priority = page.getByRole('combobox', { name: 'Priority', exact: true });
  await chooseOption(page, priority, 'Medium');
  await page.waitForURL(url => url.searchParams.get('prioritas') === 'sedang');
  await page.locator('[data-work-order="WO-PICKER-HIGH"]').waitFor({ state: 'detached' });
  const target = page.locator('[data-work-order="WO-PICKER-MEDIUM"]').getByRole('button', { name: /^Target for / });
  await chooseDate(page, target, jakartaDay(-1));
  await page.waitForFunction(day => document.querySelector('[data-work-order="WO-PICKER-MEDIUM"] .date-picker-trigger')?.dataset.value === day, jakartaDay(-1));
  assert.deepEqual(patches, [{ target: jakartaDay(-1) }]);
  await target.click();
  await snapshot('work-order-target-calendar-1440.png');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^All \d/ }).click();
  const completedTarget = page.locator('[data-work-order="WO-PICKER-DONE"]').getByRole('button', { name: /^Target for / });
  assert.equal(await completedTarget.isDisabled(), true);
  result.workOrders = { customPriority: true, targetPatch: true, completedDisabled: true, writesMocked: true };

  const chartPage = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  observe(chartPage);
  const conversationId = 'TL-picker-fixture';
  await chartPage.addInitScript(id => { localStorage.setItem('pramana.tanya-id', id); localStorage.setItem('pramana.tanya-open', 'true'); }, conversationId);
  await chartPage.route(`**/api/tanya/${conversationId}`, route => route.fulfill({ json: { id: conversationId, created_at: new Date().toISOString(), messages: [{ id: 'chart-reply', role: 'pramana', text: 'Inspection reports by unit.', created_at: new Date().toISOString(), chart: { view: 'bar', title: 'Reports by unit', from: jakartaDay(6), to: jakartaDay(), group_by: 'unit', only_stop: false, unit: null, total: 3, omitted_groups: 0, rows: [{ label: 'DT-07', value: 2 }, { label: 'DT-03', value: 1 }] } }] } }));
  await chartPage.goto(`${base}/supervisor`, { waitUntil: 'networkidle' });
  const chartView = chartPage.getByRole('combobox', { name: 'Chart view', exact: true });
  for (const [view, label] of [['pie', 'Pie chart'], ['table', 'Table'], ['kpi', 'KPI'], ['bar', 'Bar chart']]) {
    await chooseOption(chartPage, chartView, label);
    await chartPage.locator(`[data-answer-chart="${view}"]`).waitFor();
  }
  assert.equal(await chartPage.locator('select').count(), 0);
  result.chart = { customViews: true, barPieTableKpi: true };

  const sticky = [];
  for (const mode of ['pin', 'dock']) {
    await page.goto(`${base}/supervisor/agent?rencana=RI-DT-UTYPE-01&chat=${mode}`, { waitUntil: 'networkidle' });
    await page.locator('[data-item-id="ITEM-3"] > button').click();
    await page.getByRole('button', { name: 'Edit Tyres & wheel nuts', exact: true }).click();
    if (mode === 'dock') await page.getByLabel('Attach Spec Sheet', { exact: true }).setInputFiles('test/dum-trcuk-spel.webp');
    const model = page.getByRole('region', { name: 'Vehicle model', exact: true });
    await page.locator('[data-plan-scroll]').evaluate(node => { node.scrollTop = node.scrollHeight; });
    const modelBox = await model.boundingBox(), scrollBox = await page.locator('[data-plan-scroll]').boundingBox();
    assert.equal(await model.evaluate(node => getComputedStyle(node).position), 'sticky');
    assert.ok(Math.abs(modelBox.y - scrollBox.y) < 1, JSON.stringify({ mode, modelBox, scrollBox }));
    assert.ok(modelBox.y + modelBox.height <= scrollBox.y + scrollBox.height, JSON.stringify({ mode, modelBox, scrollBox }));
    await snapshot(`agent-model-sticky-${mode}.png`);
    await page.setViewportSize({ width: 1440, height: 600 });
    await page.waitForFunction(() => {
      const model = document.querySelector('section[aria-label="Vehicle model"]')?.getBoundingClientRect();
      const scroll = document.querySelector('[data-plan-scroll]')?.getBoundingClientRect();
      return model && scroll && model.bottom <= scroll.bottom + 1;
    });
    const shortModel = await model.boundingBox(), shortScroll = await page.locator('[data-plan-scroll]').boundingBox();
    assert.ok(shortModel.y + shortModel.height <= shortScroll.y + shortScroll.height + 1, JSON.stringify({ mode, shortModel, shortScroll }));
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await model.evaluate(node => getComputedStyle(node).position), 'static');
    await page.setViewportSize({ width: 1440, height: 900 });
    sticky.push(mode);
  }
  const seed = await (await page.request.get(`${base}/api/rencana/RI-DT-UTYPE-01`)).json();
  await page.route('**/api/rencana/RI-NO-MODEL', route => route.fulfill({ json: { ...seed, id: 'RI-NO-MODEL', model_id: null, messages: [] } }));
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.goto(`${base}/supervisor/agent?rencana=RI-NO-MODEL&chat=dock`, { waitUntil: 'networkidle' });
  await page.getByRole('region', { name: 'Vehicle model', exact: true }).getByRole('button', { name: 'Choose a model', exact: true }).click();
  await page.getByRole('heading', { name: 'Choose a vehicle model', exact: true }).waitFor();
  assert.deepEqual(errors, []);
  result.agentModel = { sticky, fitsComposerAndShortViewport: true, mobileStatic: true, emptyModelActionAccessible: true };
  await writeFile(join(shots, 'pickers-ui-check.json'), JSON.stringify({ ...result, errors }, null, 2));
  console.log(JSON.stringify({ ...result, errors, screenshots: shots }, null, 2));
} finally { await browser.close(); }
