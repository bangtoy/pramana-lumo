import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { counts, itemsOf } from '../lib/rules.ts';
import { dayKey } from '../lib/waktu.ts';
const base = `http://localhost:${process.env.PORT || 3002}`;
async function get(path) { const response = await fetch(base + path); assert.equal(response.status, 200, path); return response.json(); }
const all = await get('/api/laporan?status=terkirim'), orders = await get('/api/work-order');
const summary = await get('/api/dashboard'), today = summary.hari_ini;
const current = all.find(report => report.id === 'LI-RW-45'); assert.ok(current);
const openReports = new Set(orders.filter(order => order.status === 'terbuka').map(order => order.laporan_id));
const lower = value => (value || '').toLowerCase();
const cases = [
  {}, { unit: 'dt-07' }, { unit: '9123' }, { petugas: current.petugas },
  { dari: today, sampai: today }, { stop: '1' }, { wo: '1' }, { item: 'Tyres' },
  { item: 'ban_roda' }, { unit: 'DT-07', petugas: current.petugas, dari: today, sampai: today, stop: '1', wo: '1', item: 'Tyres' },
  { unit: 'NO-SUCH-UNIT' },
];
const apiChecks = [];
for (const filter of cases) {
  const actual = await get('/api/laporan?status=terkirim&' + new URLSearchParams(filter));
  const componentIds = new Set(filter.item ? all.flatMap(report => itemsOf(report).filter(item => lower(item.nama).includes(lower(filter.item)) || lower(item.comp_id).includes(lower(filter.item))).map(item => item.comp_id).filter(Boolean)) : []);
  const expected = all.filter(report => (!filter.unit || lower(report.unit).includes(lower(filter.unit))) &&
    (!filter.petugas || lower(report.petugas) === lower(filter.petugas)) &&
    (!filter.stop || counts(report).stop > 0) && (!filter.wo || openReports.has(report.id)) &&
    (!filter.dari || dayKey(report.submitted_at || report.started_at) >= filter.dari) &&
    (!filter.sampai || dayKey(report.submitted_at || report.started_at) <= filter.sampai) &&
    (!filter.item || itemsOf(report).some(item => report.hasil[item.id]?.status === 'tidak_baik' && (lower(item.nama).includes(lower(filter.item)) || lower(item.comp_id).includes(lower(filter.item)) || componentIds.has(item.comp_id)))))
    .sort((a, b) => ((!filter.dari && !filter.sampai) ? Number(!!counts(b).stop) - Number(!!counts(a).stop) : 0) || Date.parse(b.submitted_at || b.started_at) - Date.parse(a.submitted_at || a.started_at) || a.id.localeCompare(b.id));
  assert.deepEqual(actual.map(r => r.id), expected.map(r => r.id));
  assert.ok(actual.every(r => !('agent_history' in r)));
  apiChecks.push({ filter, count: actual.length });
}
for (const query of ['dari=2026-02-30', 'dari=2026-11-07&sampai=2026-11-06', 'stop=true', 'wo=yes']) assert.equal((await fetch(base + '/api/laporan?' + query)).status, 400);
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
const params = () => new URL(page.url()).searchParams;
async function results() {
  const expected = await get('/api/laporan?status=terkirim&' + params());
  await page.waitForFunction(ids => JSON.stringify([...document.querySelectorAll('[data-report]')].map(el => el.dataset.report)) === JSON.stringify(ids), expected.map(r => r.id));
  await page.waitForFunction(count => document.querySelector('[data-report-count]')?.textContent === `${count} report${count === 1 ? '' : 's'}`, expected.length);
  return expected;
}
async function urlValue(key, value) { await page.waitForURL(url => url.searchParams.get(key) === value); }
async function snapshot(name) {
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
  await page.screenshot({ path: `../docs/verification/screenshots/${name}.png`, animations: 'disabled' });
}
try {
  await page.goto(base + '/supervisor', { waitUntil: 'networkidle' });
  await page.locator('[data-kpi="stop"]').click(); await urlValue('stop', '1');
  assert.ok((await results()).every(r => counts(r).stop > 0));
  const historyLength = await page.evaluate(() => history.length);
  const unit = page.getByRole('textbox', { name: 'Search unit' }), inspector = page.getByRole('combobox', { name: 'Inspector', exact: true });
  const names = [...new Set(all.map(r => r.petugas).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(await inspector.locator('option').evaluateAll(options => options.slice(1).map(o => o.value)), names);
  await unit.fill('DT-07'); await unit.press('Enter'); await urlValue('unit', 'DT-07'); await results();
  await inspector.selectOption(current.petugas); await urlValue('petugas', current.petugas); await results();
  await page.getByRole('button', { name: 'Open WO', exact: true }).click(); await urlValue('wo', '1'); await results();
  await page.getByLabel('From date (WIB)', { exact: true }).fill(today); await urlValue('dari', today);
  await page.getByLabel('To date (WIB)', { exact: true }).fill(today); await urlValue('sampai', today);
  assert.deepEqual((await results()).map(r => r.id), ['LI-RW-45']);
  assert.equal(await page.evaluate(() => history.length), historyLength, 'Filter updates replace the URL');
  const bookmark = page.url(); await page.reload({ waitUntil: 'networkidle' }); assert.equal(page.url(), bookmark); await results();
  assert.equal(await unit.inputValue(), 'DT-07'); assert.equal(await inspector.inputValue(), current.petugas);
  assert.equal(await page.getByRole('button', { name: 'Only STOP', exact: true }).getAttribute('aria-pressed'), 'true');
  await snapshot('report-filters-combined-1440');
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click(); await page.waitForURL(url => !url.search); await results();
  assert.equal(await unit.inputValue(), ''); assert.equal(await inspector.inputValue(), '');
  await unit.fill('DT-07'); await page.getByRole('button', { name: 'Only STOP', exact: true }).click();
  await urlValue('unit', 'DT-07'); await urlValue('stop', '1'); await results();
  await page.getByRole('button', { name: 'Only STOP', exact: true }).click(); await urlValue('stop', null); await results();
  assert.equal(params().get('unit'), 'DT-07');
  await page.getByRole('link', { name: 'Summary', exact: true }).click();
  await page.locator('[data-component="ban_roda"]').click(); await urlValue('item', summary.komponen.find(c => c.comp_id === 'ban_roda').nama);
  const componentReports = await results(); assert.ok(componentReports.length > 0);
  assert.deepEqual(componentReports.map(r => r.id), (await get('/api/laporan?status=terkirim&item=ban_roda')).map(r => r.id));
  await page.getByRole('button', { name: 'Remove component filter' }).waitFor(); await snapshot('report-filters-component-1440');
  await page.getByRole('button', { name: 'Remove component filter' }).click(); await urlValue('item', null); await results();
  await page.getByLabel('From date (WIB)', { exact: true }).fill(today); await urlValue('dari', today);
  await page.getByLabel('To date (WIB)', { exact: true }).fill(today); await urlValue('sampai', today);
  const dated = await results();
  assert.ok(dated.every((r, i) => !i || Date.parse(dated[i - 1].submitted_at || dated[i - 1].started_at) >= Date.parse(r.submitted_at || r.started_at)));
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click(); await page.waitForURL(url => !url.search); await results();
  await page.locator('#supervisor-content').evaluate(el => { el.scrollTop = 70; });
  await page.getByRole('button', { name: 'Only STOP', exact: true }).click(); await urlValue('stop', '1'); await results();
  assert.equal(await page.locator('#supervisor-content').evaluate(el => el.scrollTop), 70);
  await page.locator('#supervisor-content').evaluate(el => { el.scrollTop = 0; });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector('aside[aria-label="Supervisor navigation"]').getBoundingClientRect().width === 64);
  await snapshot('report-filters-390');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal(await page.locator('#supervisor-content').evaluate(el => el.scrollWidth <= el.clientWidth), true);
  await unit.fill('NO-SUCH-UNIT'); await unit.press('Tab'); await urlValue('unit', 'NO-SUCH-UNIT'); await results();
  await page.getByRole('heading', { name: 'No matching reports', exact: true }).waitFor();
  await page.getByText('Try broadening the filters above.', { exact: true }).waitFor();
  await snapshot('report-filters-empty-390');
  assert.deepEqual(errors, []);
  const fault = await browser.newPage();
  await fault.route('**/api/laporan?*', route => route.fulfill({ status: 503, json: { error: 'Reports temporarily unavailable.' } }));
  await fault.goto(base + '/supervisor/laporan?stop=1');
  await fault.getByRole('alert').filter({ hasText: 'Reports temporarily unavailable.' }).waitFor({ timeout: 20000 });
  await fault.close();
  const result = { apiChecks, invalidFiltersRejected: true, summaryLinks: true, allInspectorOptions: true, combinedFilters: true, urlReplaceAndScrollPreserved: true, refreshPersists: true, blurAndTogglePreserveBothChanges: true, removableComponent: true, dateOrderChronological: true, resetWorks: true, mobileOverflowContained: true, emptyAndErrorStates: true, errors };
  writeFileSync('../docs/verification/report-filters-check.json', JSON.stringify(result, null, 2)); console.log(result);
} finally { await browser.close(); }
