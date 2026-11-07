import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), 'pramana-analis-'));
const { database, listLaporan, listWorkOrders } = await import('../lib/db.ts');
const { analis, analisReads, cleanAnalisOutput } = await import('../lib/agents/analis.ts');
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

test('analyst output removes invented sources, caps sentences and supplies two data recommendations', () => {
  const result = cleanAnalisOutput({ message: 'One. Two. Three. Four. Five. Six.', sumber: ['LI-RW-45', 'LI-invented', 'WO-RW-10', 'WO-invented', 'LI-RW-45'], rekomendasi: [] }, ['First action.', 'Second action.', 'Third action.']);
  assert.equal(result.message, 'One. Two. Three. Four. Five.');
  assert.deepEqual(result.sumber, ['LI-RW-45', 'WO-RW-10']); assert.deepEqual(result.rekomendasi, ['First action.', 'Second action.']);
  assert.throws(() => cleanAnalisOutput({ message: ' ', sumber: [], rekomendasi: [] }));
  const agent = analis(); assert.equal(agent.name, 'Analis (Lumo)'); assert.equal(agent.modelSettings.reasoning?.effort, 'low');
  assert.deepEqual(agent.tools.map(tool => tool.name), ['ringkasan', 'cari_laporan', 'get_laporan', 'list_work_order']);
});
