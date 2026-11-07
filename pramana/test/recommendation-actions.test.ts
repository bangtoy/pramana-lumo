import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), 'pramana-recommendations-'));
const { recommendationActions } = await import('../lib/recommendation-actions.ts');
const { rekomendasiDariData } = await import('../lib/agents/analis.ts');
const { publicPercakapan } = await import('../lib/tanya.ts');
const { listLaporan, listWorkOrders } = await import('../lib/db.ts');

test('daily recommendations link to exact unit/report/overdue/component follow-up views', () => {
  const actions = recommendationActions(rekomendasiDariData());
  assert.equal(actions.length, 4); assert.ok(actions.every(action => action.kind === 'navigate'));
  const urls = actions.map(action => new URL(action.kind === 'navigate' ? action.href : '', 'http://pramana.test'));
  assert.equal(urls[0].pathname, '/supervisor/laporan/LI-RW-45');
  assert.equal(urls[1].pathname, '/supervisor/work-order'); assert.equal(urls[1].searchParams.get('filter'), 'terlambat');
  assert.deepEqual(new Set(urls[1].searchParams.getAll('unit')), new Set(['DT-08', 'DT-07', 'DT-02']));
  assert.equal(urls[2].pathname, '/supervisor'); assert.equal(urls[2].searchParams.get('unit_status'), 'belum'); assert.equal(urls[2].hash, '#units-today');
  assert.deepEqual(new Set(urls[2].searchParams.getAll('unit')), new Set(['DT-05', 'DT-08']));
  assert.equal(urls[3].pathname, '/supervisor/laporan'); assert.match(urls[3].searchParams.get('item') || '', /Tyres/i); assert.equal(urls[3].searchParams.get('unit'), 'DT-07');
});

test('model recommendations use validated references and context without performing mutations', () => {
  const before = JSON.stringify({ reports: listLaporan(), orders: listWorkOrders() });
  const actions = recommendationActions([
    'Close WO-RW-08 after reviewing the repair.',
    'Review LI-RW-45.',
    'Remind the mechanic to follow up overdue work orders for DT-07.',
    'Assign the open work orders to a mechanic.',
    'Keep DT-07 out of service until reinspection.',
  ], ['LI-RW-45']);
  assert.ok(actions.every(action => action.kind === 'navigate'));
  if (actions[0].kind === 'navigate') assert.match(actions[0].href, /wo=WO-RW-08/);
  if (actions[1].kind === 'navigate') assert.equal(actions[1].href, '/supervisor/laporan/LI-RW-45');
  if (actions[2].kind === 'navigate') assert.match(actions[2].href, /work-order\?filter=terlambat&unit=DT-07/);
  if (actions[3].kind === 'navigate') assert.match(actions[3].href, /filter=terbuka&unit=DT-07/);
  if (actions[4].kind === 'navigate') assert.equal(actions[4].href, '/supervisor/laporan?unit=DT-07');
  assert.equal(JSON.stringify({ reports: listLaporan(), orders: listWorkOrders() }), before);
});

test('old conversations gain clickable actions and unknown advice becomes a read-only follow-up question', () => {
  const message = { id: 'MSG-old', role: 'pramana' as const, text: 'Inspection summary.', rekomendasi: ['Follow up on 3 overdue work orders (DT-08, DT-07, DT-02).', 'Remind the inspectors for DT-05, DT-08: no P2H submitted today.'], created_at: new Date().toISOString() };
  const original = { id: 'TL-old', messages: [message], agent_history: ['private'], created_at: message.created_at };
  const reply = publicPercakapan(original);
  assert.equal(reply.messages[0].recommendation_actions?.length, 2); assert.ok(!('agent_history' in reply));
  assert.ok(!('recommendation_actions' in original.messages[0]));
  const [generic, external] = recommendationActions(['Investigate the underlying cause.', 'Visit https://untrusted.example/?next=javascript:alert(1).']);
  assert.equal(generic.kind, 'ask'); assert.equal(external.kind, 'ask');
  if (generic.kind === 'ask') assert.match(generic.question, /Investigate the underlying cause/);
});
