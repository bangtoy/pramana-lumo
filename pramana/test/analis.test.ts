import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), 'pramana-analis-'));
const { database, getPercakapan, listLaporan, listWorkOrders, savePercakapan } = await import('../lib/db.ts');
const { analis, analisReads, cleanAnalisOutput, jawabCadangan, rekomendasiDariData, tanyaAnalis } = await import('../lib/agents/analis.ts');
const noFilter = { unit: null, petugas: null, dari: null, sampai: null, hanya_stop: null, item: null };

test('analyst readers expose bounded evidence and leave reports, work orders and plans unchanged', () => {
  const before = JSON.stringify({ reports: listLaporan(), orders: listWorkOrders(), plans: database().prepare('SELECT * FROM rencana').all() });
  const summary = analisReads.ringkasan();
  assert.equal(summary.split('\n').length, 4); assert.match(summary, /DT-07=STOP \[LI-RW-45\]/);
  assert.match(summary, /2 STOP \(1 without WO\)/); assert.match(summary, /3 overdue/);
  const search = analisReads.cari_laporan(noFilter); assert.match(search, /47 reports; showing first 15/); assert.equal(search.split('\n').length, 16);
  const filtered = analisReads.cari_laporan({ ...noFilter, unit: 'DT-07', hanya_stop: true, item: 'Tyres' });
  assert.match(filtered, /LI-RW-45/); assert.doesNotMatch(filtered, /DT-03/);
  const report = analisReads.get_laporan('LI-RW-45'); assert.match(report, /Tyres.*Not good STOP/); assert.match(report, /Hydraulic.*Not good STOP/);
  assert.match(analisReads.get_laporan('LI-RW-02'), /handled; original verdict unchanged/);
  assert.match(analisReads.get_laporan('LI-missing'), /not found/);
  const orders = analisReads.list_work_order({ unit: null, status: 'terbuka' }); assert.match(orders, /6 work orders/); assert.equal((orders.match(/OVERDUE/g) || []).length, 3);
  assert.doesNotMatch([summary, search, report, orders].join(''), /agent_history|data:image|base64/);
  assert.equal(JSON.stringify({ reports: listLaporan(), orders: listWorkOrders(), plans: database().prepare('SELECT * FROM rencana').all() }), before);
  assert.throws(() => analisReads.cari_laporan({ ...noFilter, dari: '2026-02-30' }));
});

test('analyst output removes invented sources, preserves complete answers and supplies two data recommendations', () => {
  const result = cleanAnalisOutput({ message: 'One. Two. Three. Four. Five. Six.', sumber: ['LI-RW-45', 'LI-invented', 'WO-RW-10', 'WO-invented', 'LI-RW-45'], rekomendasi: [] }, ['First action.', 'Second action.', 'Third action.']);
  assert.equal(result.message, 'One. Two. Three. Four. Five. Six.');
  assert.throws(() => cleanAnalisOutput({ message: 'x'.repeat(2001), sumber: [], rekomendasi: [] }));
  assert.deepEqual(result.sumber, ['LI-RW-45', 'WO-RW-10']); assert.deepEqual(result.rekomendasi, ['First action.', 'Second action.']);
  assert.throws(() => cleanAnalisOutput({ message: ' ', sumber: [], rekomendasi: [] }));
  const agent = analis(); assert.equal(agent.name, 'Analis (Lumo)'); assert.equal(agent.modelSettings.reasoning?.effort, 'low');
  assert.deepEqual(agent.tools.map(tool => tool.name), ['ringkasan', 'cari_laporan', 'get_laporan', 'list_work_order', 'chart_reports']);
});

test('fallback follows unit/repair/component/missing/STOP/summary order with four grounded suggestions', () => {
  const recommendations = rekomendasiDariData(); assert.equal(recommendations.length, 4);
  assert.match(recommendations[0], /Create a work order for DT-07/); assert.match(recommendations[1], /3 overdue/);
  assert.match(recommendations[2], /DT-05, DT-08/); assert.match(recommendations[3], /DT-07.*14 days/);
  for (const name of ['DT-07', 'dt7', 'DT 7']) {
    const reply = jawabCadangan(`Why is ${name} not roadworthy?`);
    assert.match(reply.text, /DT-07 is not roadworthy/); assert.ok(reply.sumber?.includes('LI-RW-45'));
    assert.equal(reply.fallback, true); assert.equal(reply.rekomendasi?.length, 4);
  }
  assert.match(jawabCadangan('Why is DT-99 not roadworthy?').text, /No submitted inspection reports match DT-99/);
  assert.match(jawabCadangan('Which work orders are still open?').text, /6 work orders[\s\S]*overdue/);
  assert.match(jawabCadangan('What components fail most often?').text, /Tyres.*DT-07/);
  assert.match(jawabCadangan('Who has not been inspected? Please remind them.').text, /DT-05[\s\S]*DT-08/);
  assert.match(jawabCadangan('Which units had STOP this week?').text, /last seven Jakarta days/);
  assert.equal(jawabCadangan('Which units had STOP this week?').chart?.view, 'bar');
  assert.doesNotMatch(jawabCadangan('Why is DT-07 not roadworthy?').text, /LI-RW-45/);
  assert.match(jawabCadangan('Give me a summary.').text, /6 of 8 units/);
  assert.match(jawabCadangan('Close all work orders for DT-07.').text, /I can only read.*DT-07 is not roadworthy/);
  assert.ok(jawabCadangan('Explain inspection report LI-RW-45.').sumber?.includes('LI-RW-45'));
  assert.ok(jawabCadangan('Explain inspection report LI-RW-02.').sumber?.includes('LI-RW-02'));
  assert.ok(jawabCadangan('Explain inspection report LI-2026-10-29-DT07.').sumber?.includes('LI-2026-10-29-DT07'));
  assert.match(jawabCadangan('Explain inspection report LI-missing.').text, /was not found/);
});

test('conversation persists model/fallback turns, rejects missing IDs and never mutates fleet evidence', async () => {
  const before = JSON.stringify({ reports: listLaporan(), orders: listWorkOrders() });
  const first = await tanyaAnalis(null, 'Why is DT-07 not roadworthy?', async () => { throw new Error('Provider unavailable'); });
  assert.ok(first.id.startsWith('TL-')); assert.equal(first.messages.length, 2); assert.equal(first.messages[1].fallback, true);
  const second = await tanyaAnalis(first.id, 'What should I do next?', async input => {
    assert.match(JSON.stringify(input), /LI-RW-45/);
    return { output: { message: 'Review report LI-RW-45.', sumber: ['LI-RW-45', 'LI-fiction'], rekomendasi: [] }, history: input };
  });
  assert.equal(second.messages.length, 4); assert.equal(second.messages[3].fallback, false);
  assert.deepEqual(second.messages[3].sumber, ['LI-RW-45']); assert.equal(second.messages[3].rekomendasi?.length, 2);
  assert.deepEqual(getPercakapan(first.id), second);
  const empty = await tanyaAnalis(first.id, 'Show the fleet.', async () => ({ output: { message: '', sumber: [], rekomendasi: [] }, history: [] }));
  assert.equal(empty.messages.at(-1)?.fallback, true);
  await assert.rejects(tanyaAnalis('TL-missing', 'Hello'), /Conversation not found/);
  await assert.rejects(tanyaAnalis(null, ' '.repeat(10))); await assert.rejects(tanyaAnalis(null, 'x'.repeat(4001)));
  assert.equal(JSON.stringify({ reports: listLaporan(), orders: listWorkOrders() }), before);
});

test('conversation lock prevents lost turns and long conversations keep at most 30 history messages', async () => {
  const id = 'TL-history-test';
  savePercakapan({ id, created_at: new Date().toISOString(), agent_history: [], messages: Array.from({ length: 40 }, (_, i) => ({ id: `MSG-${i}`, role: i % 2 ? 'pramana' : 'user', text: `Message ${i}`, created_at: new Date().toISOString() })) });
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  const first = tanyaAnalis(id, 'The next turn.', async input => {
    assert.equal(input.length, 31); await gate;
    return { output: { message: 'Review the inspection.', sumber: ['LI-RW-45'], rekomendasi: [] }, history: input };
  });
  await assert.rejects(tanyaAnalis(id, 'Concurrent question.'), /still working/); release();
  const saved = await first; assert.equal(saved.messages.length, 42); assert.equal(saved.agent_history.length, 30);
});
