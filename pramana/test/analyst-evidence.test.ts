import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), 'pramana-charts-'));
const { database, listLaporan, listWorkOrders, getPercakapan, saveLaporan } = await import('../lib/db.ts');
const { reportChart, sourceDetails } = await import('../lib/analyst-evidence.ts');
const { jawabCadangan, tanyaAnalis } = await import('../lib/agents/analis.ts');
const { publicPercakapan } = await import('../lib/tanya.ts');
const { dayKey, jakartaDay } = await import('../lib/waktu.ts');
const { counts, unitCode } = await import('../lib/rules.ts');
const { answerBlocks, answerParts } = await import('../lib/answer-format.ts');

test('charts count the full filtered dataset, including STOP reports once per report and all view types', () => {
  const before = JSON.stringify({ reports: listLaporan(), orders: listWorkOrders() });
  const input = { dari: jakartaDay(13), sampai: jakartaDay(), group_by: 'unit' as const, hanya_stop: false, unit: null };
  for (const view of ['bar', 'pie', 'table', 'kpi'] as const) {
    const { chart } = reportChart({ ...input, view });
    assert.ok(chart.total > 15, 'Chart must not use the 15-report text search cap');
    assert.equal(chart.rows.reduce((sum, row) => sum + row.value, 0), chart.total);
  }
  const filtered = { ...input, view: 'bar' as const, unit: 'DT-07', hanya_stop: true };
  const expected = listLaporan().filter(report => report.status === 'terkirim' && unitCode(report.unit) === 'DT-07' && counts(report).stop > 0 && dayKey(report.submitted_at || report.started_at) >= input.dari && dayKey(report.submitted_at || report.started_at) <= input.sampai);
  const { chart, sumber } = reportChart(filtered);
  assert.equal(chart.total, expected.length); assert.equal(chart.rows.length, 1);
  assert.equal(chart.rows[0].value, expected.length); assert.deepEqual(new Set(sumber), new Set(expected.map(report => report.id)));
  assert.equal(JSON.stringify({ reports: listLaporan(), orders: listWorkOrders() }), before);
});

test('daily charts include zero days and invalid dates/ranges/chart combinations are rejected', () => {
  const input = { view: 'line' as const, group_by: 'day' as const, dari: jakartaDay(), sampai: jakartaDay(-2), hanya_stop: true, unit: null };
  const { chart } = reportChart(input);
  assert.equal(chart.rows.length, 3); assert.equal(chart.rows[1].value, 0); assert.equal(chart.rows[2].value, 0);
  assert.ok(chart.rows[0].label < chart.rows[1].label);
  assert.throws(() => reportChart({ ...input, dari: '2026-02-30' }));
  assert.throws(() => reportChart({ ...input, dari: jakartaDay(-3) }));
  assert.throws(() => reportChart({ ...input, dari: jakartaDay(31) }));
  assert.throws(() => reportChart({ ...input, group_by: 'unit' }));
  assert.throws(() => reportChart({ ...input, view: 'pie' }));
  assert.equal(reportChart({ ...input, dari: jakartaDay(-1) }).chart.total, 0);
});

test('chart snapshots persist with fallback and model replies; old source IDs gain human labels without history leakage', async () => {
  const input = { view: 'pie' as const, group_by: 'unit' as const, dari: jakartaDay(6), sampai: jakartaDay(), hanya_stop: true, unit: null };
  const { chart, sumber } = reportChart(input);
  const conversation = await tanyaAnalis(null, 'Show a pie chart of STOP reports this week.', async input => ({ output: { message: 'Here is the distribution.\n\nHistorical reports do not establish current roadworthiness.', sumber, rekomendasi: [] }, history: input, chart }));
  assert.deepEqual(getPercakapan(conversation.id)?.messages.at(-1)?.chart, chart);
  const reply = publicPercakapan(conversation);
  assert.ok(!('agent_history' in reply)); assert.equal(reply.messages.at(-1)?.source_details?.length, sumber.length);
  assert.ok(sourceDetails(['LI-RW-45', 'WO-RW-08']).every(source => source.label.includes('DT-07')));
  assert.deepEqual(sourceDetails(['LI-missing', 'https://example.test']), []);
  const fallback = await tanyaAnalis(null, 'Which units had STOP this week?', async () => { throw new Error('offline'); });
  assert.deepEqual(getPercakapan(fallback.id)?.messages.at(-1)?.chart, jawabCadangan('Which units had STOP this week?').chart);
  assert.equal(jawabCadangan('Show STOP reports in a pie chart.').chart?.view, 'pie');
  assert.equal(jawabCadangan('Show STOP reports in a line chart.').chart?.group_by, 'day');
});

test('old dense unit lists and new Markdown render as readable blocks with exact safe citations', () => {
  const source = 'LI-ee9abbcb-7a1d-470a-beb0-d716984c73db';
  const text = `Six units had STOP.\nDT-03: LI-RW-21 (1 Nov); DT-07: LI-RW-45 (7 Nov).\nDEMO-1: ${source} (7 Nov).\n\nHistorical records do not establish current condition.`;
  const blocks = answerBlocks(text); assert.equal(blocks.length, 3);
  assert.equal(blocks[1].kind, 'list'); if (blocks[1].kind === 'list') assert.equal(blocks[1].items.length, 3);
  const list = answerBlocks('Summary.\n\n- **DT-07** — 3 reports\n- **DT-03** — 2 reports\n\nCheck today’s status.');
  assert.equal(list.length, 3); assert.equal(list.at(-1)?.kind, 'paragraph');
  const parts = answerParts(`${source} LI-missing <script>alert(1)</script> **DT-07**`, [source]);
  assert.equal(parts.filter(part => part.kind === 'source').length, 1);
  assert.ok(parts.some(part => part.kind === 'text' && part.text.includes('<script>')));
  assert.ok(parts.some(part => part.kind === 'strong' && part.text === 'DT-07'));
});

test('top-unit charts declare omitted groups while preserving the full total', () => {
  const template = listLaporan().find(report => report.id === 'LI-RW-45')!;
  const ids = Array.from({ length: 16 }, (_, index) => `LI-chart-cap-${index}`);
  try {
    ids.forEach((id, index) => saveLaporan({ ...template, id, unit: `TEST-${index}` }));
    const { chart } = reportChart({ view: 'pie', group_by: 'unit', dari: jakartaDay(), sampai: jakartaDay(), hanya_stop: true, unit: null });
    assert.equal(chart.rows.length, 12); assert.ok(chart.omitted_groups >= 4);
    assert.ok(chart.total > chart.rows.reduce((sum, row) => sum + row.value, 0));
  } finally { for (const id of ids) database().prepare('DELETE FROM laporan WHERE id = ?').run(id); }
});
