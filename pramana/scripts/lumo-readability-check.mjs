import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const base = 'http://localhost:3002', evidenceDir = '../docs/verification';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [], failures = [];
const observe = page => { page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); }); page.on('response', response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); }); };
async function snapshot(page, name) {
  await page.locator('[data-tanya-scroll]').evaluate(element => { element.scrollTop = 0; });
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
  await page.screenshot({ path: `${evidenceDir}/screenshots/${name}.png`, animations: 'disabled' });
}
async function checkWidth(page, width) { await page.waitForFunction(value => document.querySelector('#supervisor-assistant-slot').getBoundingClientRect().width === value, width); }
async function ask(page, text) {
  await page.getByRole('textbox', { name: 'Question for Lumo' }).fill(text);
  const response = page.waitForResponse(response => response.url().endsWith('/api/tanya') && response.request().method() === 'POST', { timeout: 65000 });
  await page.getByRole('button', { name: 'Send question', exact: true }).click();
  const result = await response; assert.equal(result.status(), 200); const conversation = await result.json();
  await page.locator(`[data-analyst-message="${conversation.messages.at(-1).id}"]`).waitFor();
  return conversation;
}
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); observe(page);
  if (process.env.LUMO_TEST_CONVERSATION) await page.addInitScript(id => localStorage.setItem('pramana.tanya-id', id), process.env.LUMO_TEST_CONVERSATION);
  await page.goto(base + '/supervisor', { waitUntil: 'networkidle' });
  const panel = page.locator('#supervisor-assistant-slot'); await page.locator('[data-ready="true"]').waitFor();
  const conversation = process.env.LUMO_TEST_CONVERSATION ? await fetch(base + '/api/tanya/' + process.env.LUMO_TEST_CONVERSATION).then(response => response.json()) : await ask(page, 'Which units had STOP this week?');
  await page.locator('[data-answer-chart]').waitFor();
  console.log({newConversation:conversation.id});
  const reply = conversation.messages.at(-1); assert.equal(reply.fallback, false); assert.equal(reply.chart.view, 'bar');
  assert.doesNotMatch(reply.text, /\b(?:LI|WO)-[A-Za-z0-9-]+/); assert.ok(reply.text.length < 1000);
  const params = new URLSearchParams({ dari: reply.chart.from, sampai: reply.chart.to, stop: '1' });
  const reports = await fetch(base + '/api/laporan?' + params).then(response => response.json());
  assert.equal(reply.chart.total, reports.length); assert.equal(reply.chart.rows.reduce((n, row) => n + row.value, 0), reports.length);
  assert.equal(await panel.locator('[data-answer-sources]').getAttribute('open'), null);
  await page.waitForFunction(() => { const text = document.querySelector('[data-answer-text]'); return text && text.getBoundingClientRect().top >= 60; });
  await snapshot(page, 'lumo-bar-360-1440');
  const resize = page.getByRole('separator', { name: 'Resize Lumo panel' }); const box = await resize.boundingBox();
  await page.mouse.move(box.x + box.width / 2, 450); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 - 160, 450, { steps: 12 }); await page.mouse.up();
  await checkWidth(page, 520);
  await resize.focus(); await page.keyboard.press('ArrowLeft'); await checkWidth(page, 536);
  await page.keyboard.press('ArrowRight'); await checkWidth(page, 520);
  await page.reload({ waitUntil: 'networkidle' }); await page.locator('[data-answer-chart]').waitFor(); await checkWidth(page, 520);
  await page.getByRole('button', { name: 'Collapse Lumo panel' }).click(); await checkWidth(page, 48);
  await page.getByRole('button', { name: 'Expand Lumo panel' }).click(); await checkWidth(page, 520);
  for (const view of ['bar', 'pie', 'table', 'kpi']) {
    await page.getByLabel('Chart view', { exact: true }).selectOption(view); await snapshot(page, `lumo-${view}-1440`);
    assert.equal(await page.locator(`[data-answer-chart="${view}"]`).count(), 1);
  }
  await panel.locator('[data-answer-sources] summary').click();
  const source = panel.getByRole('link', { name: /^Open report / }).first();
  assert.ok(!(await source.innerText()).startsWith('LI-')); await source.click(); await page.waitForURL(url => url.pathname.includes('/supervisor/laporan/'));
  await page.getByRole('heading', { name: 'Findings by item' }).waitFor();
  await page.goto(base + '/supervisor', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'New conversation', exact: true }).click();
  const trend = await ask(page, 'Show all inspection report counts by day over the last seven days as a line chart.');
  const trendReply = trend.messages.at(-1); assert.equal(trendReply.fallback, false); assert.equal(trendReply.chart.view, 'line'); assert.equal(trendReply.chart.only_stop, false); assert.equal(trendReply.chart.rows.length, 7);
  await snapshot(page, 'lumo-line-1440');
  assert.equal(await page.locator('[data-answer-chart="line"] svg a').count(), 7);
  await resize.focus(); await page.keyboard.press('Home'); await checkWidth(page, 320);
  await page.keyboard.press('End'); await checkWidth(page, 720);
  await resize.dblclick(); await checkWidth(page, 360);
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }); observe(mobile);
  await mobile.addInitScript(id => { localStorage.setItem('pramana.tanya-id', id); localStorage.setItem('pramana.tanya-open', 'true'); localStorage.setItem('pramana.tanya-width', '720'); }, conversation.id);
  await mobile.goto(base + '/supervisor', { waitUntil: 'networkidle' }); await mobile.locator('[data-answer-chart]').waitFor();
  assert.equal((await mobile.locator('#supervisor-assistant-slot').boundingBox()).width, 390);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); await snapshot(mobile, 'lumo-chart-390');
  await mobile.getByLabel('Chart view', { exact: true }).selectOption('table'); assert.equal(await mobile.locator('figure table tbody tr').count(), reply.chart.rows.length);
  const legacy = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); observe(legacy);
  const legacyId = 'TL-readability-fixture';
  const oldReply = { ...reply, id: 'MSG-old', chart: undefined, text: `STOP findings were recorded this week.\nDT-03: LI-RW-21 (1 Nov); DT-07: LI-RW-45 (7 Nov).\nDEMO-1: LI-ee9abbcb-7a1d-470a-beb0-d716984c73db (7 Nov).\n\nThese historical records do not establish every unit’s current condition.`, sumber: ['LI-RW-21', 'LI-RW-45', 'LI-ee9abbcb-7a1d-470a-beb0-d716984c73db'] };
  await legacy.route(`**/api/tanya/${legacyId}`, route => route.fulfill({ json: { ...conversation, id: legacyId, messages: [oldReply] } }));
  await legacy.addInitScript(id => localStorage.setItem('pramana.tanya-id', id), legacyId);
  await legacy.goto(base + '/supervisor', { waitUntil: 'networkidle' }); await legacy.locator('[data-answer-text] ul').waitFor();
  assert.equal(await legacy.locator('[data-answer-text] li').count(), 3);
  assert.doesNotMatch(await legacy.locator('[data-answer-text]').innerText(), /LI-ee9abbcb/);
  assert.equal(await legacy.locator('[data-answer-text] a').count(), 3); await snapshot(legacy, 'lumo-legacy-1440');
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  const result = { conversationId: conversation.id, reply, trendConversationId: trend.id, trendReply, chartMatchesReports: true, allFiveViews: true, sourcesExpandAndNavigate: true, dragAndKeyboardResize: true, widthPersists: true, collapseRestoresWidth: true, responsive390: true, legacyFormatting: true, longAnswerStartsVisible: true, errors, failures };
  writeFileSync(`${evidenceDir}/lumo-readability-check.json`, JSON.stringify(result, null, 2));
  console.log({ conversationId: conversation.id, trendConversationId: trend.id, reports: reply.chart.total, allFiveViews: true, resize: true, legacyFormatting: true, errors, failures });
} finally { await browser.close(); }
