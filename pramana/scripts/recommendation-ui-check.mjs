import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const base = process.env.PRAMANA_URL || 'http://localhost:3002';
const conversationId = process.env.CONVERSATION_ID || 'TL-2c0ab6aa-734c-4a6f-b069-d06685ceeda5';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [], failures = [], mutations = [];
const artifact = '../docs/verification/';
const read = async path => { const response = await fetch(base + path); assert.equal(response.status, 200); return response.json(); };
const before = await Promise.all(['/api/laporan', '/api/work-order'].map(read));
function observe(page) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
  page.on('request', request => { if (request.url().includes('/api/') && !['GET', 'HEAD'].includes(request.method())) mutations.push({ url: request.url(), method: request.method() }); });
}
async function initialize(page, id = conversationId) {
  await page.addInitScript(id => {
    if (id) localStorage.setItem('pramana.tanya-id', id); else localStorage.removeItem('pramana.tanya-id');
    localStorage.setItem('pramana.tanya-open', 'true');
    localStorage.setItem('pramana.tanya-width', '520');
  }, id);
}
async function snapshot(page, name) {
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
  await page.screenshot({ path: artifact + `screenshots/${name}.png`, animations: 'disabled' });
}
async function count(page, selector, expected) { await page.waitForFunction(({ selector, expected }) => document.querySelectorAll(selector).length === expected, { selector, expected }); }
try {
  const conversation = await read(`/api/tanya/${conversationId}`);
  const actions = conversation.messages.at(-1).recommendation_actions;
  assert.equal(actions[0].kind, 'navigate'); assert.equal(actions[1].kind, 'navigate');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); observe(page); await initialize(page);
  await page.goto(base + '/supervisor', { waitUntil: 'networkidle' });
  const recommendations = page.getByRole('region', { name: 'Recommended next steps', exact: true }).last();
  await recommendations.waitFor();
  const allUnitCount = await page.locator('#units-today [data-unit]').count(); assert.ok(allUnitCount >= 8);
  await recommendations.scrollIntoViewIfNeeded();
  await snapshot(page, 'recommendations-1440');
  const overdue = recommendations.getByRole('link', { name: /Review overdue work orders/ });
  assert.equal(await overdue.getAttribute('href'), actions[0].href);
  await overdue.focus(); assert.equal(await overdue.evaluate(el => el === document.activeElement), true);
  await overdue.press('Enter');
  await page.waitForURL(url => url.pathname.endsWith('/work-order') && url.searchParams.get('filter') === 'terlambat');
  assert.deepEqual(new Set(new URL(page.url()).searchParams.getAll('unit')), new Set(['DT-08', 'DT-07', 'DT-02']));
  await count(page, '[data-work-order]', 3);
  assert.equal(await page.getByRole('button', { name: /^Overdue 3$/ }).getAttribute('aria-pressed'), 'true');
  const overdueIds = await page.locator('[data-work-order]').evaluateAll(rows => rows.map(row => row.getAttribute('data-work-order')));
  await snapshot(page, 'recommendation-overdue-1440');
  await page.reload({ waitUntil: 'networkidle' }); await count(page, '[data-work-order]', 3);
  const awaiting = page.getByRole('region', { name: 'Recommended next steps', exact: true }).last().getByRole('link', { name: /Review units awaiting inspection/ });
  await awaiting.click();
  await page.waitForURL(url => url.searchParams.get('unit_status') === 'belum' && url.hash === '#units-today');
  await count(page, '#units-today [data-unit]', 2);
  assert.deepEqual(await page.locator('#units-today [data-unit]').evaluateAll(rows => rows.map(row => row.dataset.unit).sort()), ['DT-05', 'DT-08']);
  await page.locator('[data-unit-selection]').waitFor();
  await snapshot(page, 'recommendation-awaiting-1440');
  await page.getByRole('link', { name: 'Show all units', exact: true }).click();
  await count(page, '#units-today [data-unit]', allUnitCount);
  await page.goto(base + '/supervisor?unit_status=belum&unit=DT-07#units-today', { waitUntil: 'networkidle' });
  await page.getByText('No units match this selection today.', { exact: true }).waitFor();
  await page.goto(base + '/supervisor/work-order?filter=terlambat&unit=DT-07', { waitUntil: 'networkidle' });
  await count(page, '[data-work-order]', 1);
  await page.getByRole('button', { name: 'Show all units', exact: true }).click();
  await count(page, '[data-work-order]', 3); assert.equal(new URL(page.url()).searchParams.get('filter'), 'terlambat');

  const empty = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); observe(empty); await initialize(empty, null);
  await empty.goto(base + '/supervisor', { waitUntil: 'networkidle' });
  const daily = empty.locator('#supervisor-assistant-slot');
  await daily.getByRole('link', { name: /Review related findings/ }).click();
  await empty.waitForURL(url => url.pathname === '/supervisor/laporan' && url.searchParams.get('unit') === 'DT-07' && url.searchParams.get('item') === 'Tyres and wheel nuts');
  assert.equal(await daily.locator('[data-recommendation-action="navigate"]').count(), (await read('/api/tanya/saran')).recommendation_actions.length);

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }); observe(mobile); await initialize(mobile);
  await mobile.goto(base + '/supervisor', { waitUntil: 'networkidle' });
  const mobileRecommendation = mobile.getByRole('region', { name: 'Recommended next steps', exact: true }).last();
  await mobileRecommendation.scrollIntoViewIfNeeded();
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await snapshot(mobile, 'recommendations-390');
  await mobileRecommendation.getByRole('link', { name: /Review units awaiting inspection/ }).click();
  await mobile.locator('#supervisor-assistant-slot[data-open="false"]').waitFor();
  await count(mobile, '#units-today [data-unit]', 2);
  await snapshot(mobile, 'recommendation-awaiting-390');

  assert.deepEqual(mutations, [], 'Recommendation navigation must not perform API mutations');
  const after = await Promise.all(['/api/laporan', '/api/work-order'].map(read));
  assert.deepEqual(after, before, 'Opening recommendations must preserve reports and work orders');

  // Only the generic follow-up conversation is mocked; no real model call or stored test conversation.
  const generic = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); observe(generic); await initialize(generic, 'TL-recommendation-fixture');
  const advice = 'Investigate the underlying cause.';
  const question = `Help me follow up on this recommendation: ${advice}`;
  const fixture = { id: 'TL-recommendation-fixture', created_at: new Date().toISOString(), messages: [{ id: 'MSG-recommendation-fixture', role: 'pramana', text: 'Review the available evidence.', rekomendasi: [advice], recommendation_actions: [{ kind: 'ask', label: 'Discuss with Lumo', question }], created_at: new Date().toISOString() }] };
  await generic.route('**/api/tanya/TL-recommendation-fixture', route => route.fulfill({ json: fixture }));
  let release, posted;
  const held = new Promise(resolve => { release = resolve; });
  await generic.route('**/api/tanya', async route => { posted = route.request().postDataJSON(); await held; await route.fulfill({ json: { ...fixture, messages: [...fixture.messages, { id: 'MSG-user-followup', role: 'user', text: question, created_at: fixture.created_at }, { id: 'MSG-followup', role: 'pramana', text: 'Follow-up fixture received.', created_at: fixture.created_at }] } }); });
  await generic.goto(base + '/supervisor', { waitUntil: 'networkidle' });
  const discuss = generic.getByRole('button', { name: /Discuss with Lumo/ });
  await discuss.click(); await generic.locator('[data-pending-question]').waitFor();
  assert.equal(await discuss.isDisabled(), true);
  release(); await generic.locator('[data-analyst-message="MSG-followup"]').waitFor();
  assert.deepEqual(posted, { percakapan_id: fixture.id, text: question });
  assert.equal(mutations.length, 1); assert.ok(mutations[0].url.endsWith('/api/tanya'));
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  const results = { base, conversationId, clickableSavedConversation: true, overdueIds, awaitingUnits: ['DT-05', 'DT-08'], filtersSurviveReload: true, clearFilters: true, emptySelection: true, dailyRecommendations: true, keyboardActivation: true, mobileNoOverflow: true, mobileClosesAfterNavigation: true, navigationMutations: 0, recordsUnchanged: true, genericFollowUp: 'Browser route fixture; expected question posted once, disabled while pending', errors, failures };
  writeFileSync(artifact + 'recommendation-ui-results.json', JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
