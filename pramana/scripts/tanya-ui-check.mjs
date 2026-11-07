import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const offline = 'http://localhost:3004', online = 'http://localhost:3002';
const errors = [], failures = [], requests = [];
function observe(page) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
  page.on('request', request => { if (request.url().includes('/api/tanya')) requests.push({ url: request.url(), method: request.method() }); });
}
async function snapshot(page, name) {
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
  await page.screenshot({ path: `../docs/verification/screenshots/${name}.png`, animations: 'disabled' });
}
async function ready(page) { await page.locator('#supervisor-assistant-slot[data-ready="true"]').waitFor(); }
async function waitAnswer(page, trigger) {
  const response = page.waitForResponse(r => r.url().endsWith('/api/tanya') && r.request().method() === 'POST', { timeout: 60000 });
  await trigger();
  await page.locator('[data-pending-question]').waitFor(); await page.getByText('Reading the evidence…', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'New conversation', exact: true }).isDisabled(), true);
  const result = await response; assert.equal(result.status(), 200); const conversation = await result.json();
  await page.locator(`[data-analyst-message="${conversation.messages.at(-1).id}"]`).waitFor();
  await page.locator('[data-pending-question]').waitFor({ state: 'detached' });
  return conversation;
}
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); observe(page);
  await page.addInitScript(() => { if (!sessionStorage.getItem('invalid-id-tested')) { localStorage.setItem('pramana.tanya-id', 'null'); sessionStorage.setItem('invalid-id-tested', 'true'); } });
  await page.goto(offline + '/supervisor', { waitUntil: 'networkidle' }); await ready(page);
  const panel = page.locator('#supervisor-assistant-slot'); assert.equal(await panel.getAttribute('data-open'), 'true');
  await page.getByText('Create a work order for DT-07:', { exact: false }).waitFor();
  assert.equal((await panel.boundingBox()).width, 360);
  assert.equal(await panel.locator('h2').evaluate(el => getComputedStyle(el).fontSize), '16px');
  assert.equal(await page.locator('h1.t-display').count(), 1);
  await snapshot(page, 'tanya-empty-1440');
  const first = await waitAnswer(page, () => page.getByRole('button', { name: 'Which components fail most often?', exact: true }).click());
  assert.equal(first.messages.at(-1).fallback, true); assert.equal(first.messages.at(-1).rekomendasi.length, 4);
  assert.equal(await panel.locator('img[src*="avatar-serius"]').count(), 1);
  await page.getByText('Data-based fallback · agent is currently unavailable', { exact: true }).waitFor();
  const firstSources = first.messages.at(-1).sumber;
  assert.equal(await panel.getByRole('link').count(), firstSources.length);
  await snapshot(page, 'tanya-fallback-1440');
  assert.equal(await page.evaluate(() => localStorage.getItem('pramana.tanya-id')), first.id);
  await page.reload({ waitUntil: 'networkidle' }); await ready(page);
  await page.locator(`[data-analyst-message="${first.messages.at(-1).id}"]`).waitFor();
  const reportLink = panel.getByRole('link', { name: `Open report ${firstSources[0]}`, exact: true });
  await panel.locator('[data-answer-sources] summary').click();
  await reportLink.click(); await page.waitForURL(url => url.pathname.endsWith('/laporan/' + firstSources[0]));
  await page.getByRole('heading', { name: 'Findings by item' }).waitFor();
  await page.getByRole('button', { name: 'Collapse Lumo panel' }).click();
  const start = requests.length; await page.reload({ waitUntil: 'networkidle' }); await ready(page);
  assert.equal(await panel.getAttribute('data-open'), 'false');
  assert.equal(requests.slice(start).filter(request => request.url.includes('/api/tanya')).length, 0, 'Collapsed panel must not fetch conversations or suggestions');
  await page.getByRole('link', { name: 'Summary', exact: true }).click(); await page.locator('[data-kpi="stop"]').waitFor();
  const wide = (await page.locator('#supervisor-content').boundingBox()).width;
  await snapshot(page, 'tanya-collapsed-1440');
  await page.getByRole('button', { name: 'Expand Lumo panel' }).click();
  await page.waitForFunction(width => document.querySelector('#supervisor-content').getBoundingClientRect().width === width - 312, wide);
  await page.getByRole('button', { name: 'New conversation', exact: true }).click();
  await page.getByRole('heading', { name: 'Example questions' }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('pramana.tanya-id')), null);
  const composer = page.getByRole('textbox', { name: 'Question for Lumo', exact: true });
  const posts = requests.filter(request => request.method === 'POST').length;
  await composer.fill('Which work orders'); await composer.press('Shift+Enter'); await composer.pressSequentially('are overdue?');
  assert.match(await composer.inputValue(), /\n/); assert.equal(requests.filter(request => request.method === 'POST').length, posts);
  const work = await waitAnswer(page, () => composer.press('Enter'));
  const workId = work.messages.at(-1).sumber.find(id => id.startsWith('WO-')); assert.ok(workId);
  await panel.locator('[data-answer-sources] summary').click();
  await panel.getByRole('link', { name: `Open work order ${workId}`, exact: true }).click();
  await page.waitForURL(url => url.searchParams.get('wo') === workId);
  const row = page.locator(`[data-work-order="${workId}"]`); await row.waitFor(); assert.match(await row.getAttribute('class'), /accent-subtle/);
  await page.goto(offline + '/supervisor/laporan/LI-RW-45', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'New conversation', exact: true }).click();
  await page.getByRole('button', { name: 'Collapse Lumo panel' }).click();
  const beforeDraft = requests.filter(request => request.method === 'POST').length;
  await page.getByRole('button', { name: 'Ask Lumo about this report', exact: true }).click();
  await composer.waitFor(); assert.match(await composer.inputValue(), /LI-RW-45/);
  assert.equal(requests.filter(request => request.method === 'POST').length, beforeDraft);
  const report = await waitAnswer(page, () => composer.press('Enter')); assert.ok(report.messages.at(-1).sumber.includes('LI-RW-45'));
  assert.match(report.messages.at(-1).text, /DT-07 is not roadworthy/);
  await page.goto(offline + '/supervisor/agent?rencana=RI-DT-UTYPE-01', { waitUntil: 'networkidle' });
  assert.equal(await panel.count(), 0);

  const compact = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' }); observe(compact);
  await compact.goto(offline + '/supervisor', { waitUntil: 'networkidle' }); await ready(compact);
  assert.equal(await compact.locator('#supervisor-assistant-slot').getAttribute('data-open'), 'false');
  await compact.getByRole('button', { name: 'Expand Lumo panel' }).click();
  await compact.reload({ waitUntil: 'networkidle' }); await ready(compact);
  assert.equal(await compact.locator('#supervisor-assistant-slot').getAttribute('data-open'), 'true');
  await compact.waitForResponse(response => response.url().endsWith('/api/tanya/saran') && response.ok(), { timeout: 33000 });
  await compact.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }); observe(mobile);
  await mobile.goto(offline + '/supervisor', { waitUntil: 'networkidle' }); await ready(mobile);
  assert.equal(await mobile.locator('#supervisor-assistant-slot').getAttribute('data-open'), 'false');
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await mobile.getByRole('button', { name: 'Expand Lumo panel' }).click(); await snapshot(mobile, 'tanya-390');
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await mobile.getByRole('button', { name: 'Collapse Lumo panel' }).click(); await mobile.close();

  const live = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); observe(live);
  await live.goto(online + '/supervisor', { waitUntil: 'networkidle' }); await ready(live);
  const real = await waitAnswer(live, () => live.getByRole('button', { name: 'Why is DT-07 not roadworthy?', exact: true }).click());
  assert.equal(real.messages.at(-1).fallback, false); assert.ok(real.messages.at(-1).sumber.includes('LI-RW-45'));
  await live.locator('[data-tanya-scroll]').evaluate(el => { el.scrollTop = 0; }); await snapshot(live, 'tanya-online-1440');
  await live.close();
  assert.ok(requests.every(request => !/\/api\/tanya\/(?:null|undefined)(?:[?]|$)/.test(request.url)));
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);

  const fault = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await fault.addInitScript(id => { localStorage.setItem('pramana.tanya-id', id); }, first.id);
  await fault.route('**/api/tanya/TL-*', route => route.fulfill({ status: 503, json: { error: 'Conversation temporarily unavailable.' } }));
  await fault.goto(offline + '/supervisor'); await fault.getByRole('alert').filter({ hasText: 'Conversation temporarily unavailable.' }).waitFor();
  await fault.unroute('**/api/tanya/TL-*'); await fault.getByRole('button', { name: 'Retry conversation' }).click(); await fault.locator('[data-analyst-message]').waitFor();
  await fault.getByRole('button', { name: 'New conversation', exact: true }).click();
  await fault.route('**/api/tanya', route => route.fulfill({ status: 503, json: { error: 'Please retry this question.' } }));
  await fault.getByRole('textbox', { name: 'Question for Lumo' }).fill('Which units had STOP this week?');
  await fault.getByRole('button', { name: 'Send question' }).click(); await fault.getByRole('alert').filter({ hasText: 'Please retry this question.' }).waitFor();
  assert.equal(await fault.getByRole('textbox', { name: 'Question for Lumo' }).inputValue(), 'Which units had STOP this week?');
  await fault.unroute('**/api/tanya'); await waitAnswer(fault, () => fault.getByRole('button', { name: 'Send question' }).click()); await fault.close();
  const result = { offlineConversation: first.id, onlineConversation: real.id, examplesAndPendingState: true, clickableReportAndWorkOrderSources: true, refreshPersists: true, newConversationClears: true, enterAndShiftEnter: true, reportQuestionDraft: true, noPanelOnAgentTab: true, collapsePersists: true, closedPanelDoesNotFetch: true, responsiveWidth: true, defaultCollapsedBelow1360: true, suggestionsPoll: true, mobileNoOverflow: true, errorRecovery: true, noNullRequests: true, errors, failures };
  writeFileSync('../docs/verification/tanya-ui-check.json', JSON.stringify(result, null, 2)); console.log(result);
} finally { await browser.close(); }
