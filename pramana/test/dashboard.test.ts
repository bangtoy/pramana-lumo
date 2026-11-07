import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { LaporanInspeksi, WorkOrder } from '../lib/contracts.ts';
import { itemsOf } from '../lib/rules.ts';
process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), 'pramana-dashboard-'));
const { listLaporan, listWorkOrders, getLaporan } = await import('../lib/db.ts');
const { buildRingkasan, ringkasan, cariLaporan } = await import('../lib/dashboard.ts');
const { filterLaporan, parseLaporanFilter } = await import('../lib/laporan-filter.ts');

test('seeded dashboard matches the required fleet, STOP, repair and recurrence totals', () => {
  const data = ringkasan();
  assert.equal(data.kpi.unit_total, 8); assert.equal(data.kpi.unit_diperiksa, 6);
  assert.equal(data.kpi.stop, 2); assert.equal(data.kpi.stop_tanpa_wo, 1);
  assert.equal(data.kpi.belum_p2h, 2); assert.equal(data.kpi.wo_terlambat, 3);
  assert.equal(data.tren.length, 14); assert.equal(ringkasan(7).tren.length, 7);
  assert.equal(ringkasan(7).sparkline.laporan.length, 14);
  assert.equal(data.komponen[0].comp_id, 'ban_roda'); assert.equal(data.komponen[0].berulang?.unit, 'DT-07');
  assert.ok(data.komponen[0].berulang!.kali >= 4);
  assert.deepEqual(data.units.map(u => u.vonis), ['stop', 'stop', 'belum', 'belum', 'layak', 'layak', 'layak', 'layak']);
  assert.equal(data.units.find(u => u.unit === 'DT-03')!.stop_tanpa_wo, false);
  assert.equal(data.units.find(u => u.unit === 'DT-07')!.stop_tanpa_wo, true);
  assert.equal(data.terbaru.length, 8);
  assert.equal(cariLaporan({ unit: 'DT-07', item: 'tyres' }).length, data.komponen[0].berulang!.kali);
});

const makeReport = (id: string, unit: string, time: string, stop: boolean): LaporanInspeksi => {
  const report = structuredClone(getLaporan('LI-2026-10-29-DT07')!);
  report.id = id; report.unit = unit; report.petugas = 'Budi'; report.submitted_at = time; report.started_at = time;
  for (const finding of Object.values(report.hasil)) { finding.status = 'baik'; finding.stop = false; }
  if (stop) { report.hasil['ITEM-3'].status = 'tidak_baik'; report.hasil['ITEM-3'].stop = true; }
  return report;
};
test('latest unit report, Jakarta windows and per-report orders determine the summary', () => {
  const reports = [
    makeReport('old-stop', 'DT-01 · B 9101 KD', '2026-11-05T21:30:00Z', true),
    makeReport('latest-good', 'DT-01 · B 9101 KD', '2026-11-05T23:30:00Z', false),
    makeReport('yesterday', 'DT-02', '2026-11-05T16:30:00Z', true),
    makeReport('stop-with-wo', 'DT-03', '2026-11-06T00:00:00Z', true),
    makeReport('stop-no-wo', 'DT-04', '2026-11-06T00:30:00Z', true),
    makeReport('too-old', 'DT-05', '2026-10-22T00:00:00Z', true),
    makeReport('future', 'DT-06', '2026-11-07T00:00:00Z', true),
  ];
  const order: WorkOrder = { ...listWorkOrders()[0], id: 'test-order', laporan_id: 'stop-with-wo', item_id: 'ITEM-3', unit: 'DT-03', status: 'terbuka', target: '2026-11-05' };
  const result = buildRingkasan(reports, [order], 7, new Date('2026-11-06T02:00:00Z'));
  assert.deepEqual(result.units.map(u => [u.unit, u.vonis]), [['DT-03', 'stop'], ['DT-04', 'stop'], ['DT-02', 'belum'], ['DT-01', 'layak']]);
  assert.equal(result.kpi.unit_diperiksa, 3); assert.equal(result.kpi.stop_tanpa_wo, 1);
  assert.equal(result.kpi.wo_terlambat, 1); assert.equal(result.units[0].wo_terbuka, 1);
  assert.deepEqual(result.tren.at(-1), { tanggal: '2026-11-06', label: '6 Nov', layak: 1, stop: 3 });
  assert.equal(result.units[3].laporan_id, 'latest-good');
  assert.ok(!result.terbaru.some(r => r.id === 'future'));
  assert.deepEqual(buildRingkasan([], [], 14).units, []);
});

test('report filters combine conditions, use inclusive Jakarta days and only match defective items', () => {
  const before = makeReport('before', 'DT-07 · B 9123 KD', '2026-11-05T16:59:59Z', true);
  const start = makeReport('start', 'DT-07 · B 9123 KD', '2026-11-05T17:00:00Z', true);
  const end = makeReport('end', 'DT-07 · B 9123 KD', '2026-11-06T16:59:59Z', false);
  const after = makeReport('after', 'DT-08', '2026-11-06T17:00:00Z', true); after.petugas = 'Budi Santoso';
  const draft = { ...start, id: 'draft', status: 'berjalan' as const };
  const reports = [end, after, before, start, draft];
  const order: WorkOrder = { ...listWorkOrders()[0], laporan_id: start.id, item_id: 'ITEM-3', unit: start.unit, status: 'terbuka' };
  const dated = filterLaporan(reports, [order], { dari: '2026-11-06', sampai: '2026-11-06' });
  assert.deepEqual(dated.map(r => r.id), ['end', 'start'], 'Date filters sort newest first, without STOP promotion');
  assert.deepEqual(filterLaporan(reports, [], { unit: 'dt-07' }).map(r => r.id), ['start', 'before', 'end']);
  const combined = { unit: '9123', petugas: 'budi', hanya_stop: true, wo_terbuka: true, item: 'Tyres', dari: '2026-11-06', sampai: '2026-11-06' };
  assert.deepEqual(filterLaporan(reports, [order], combined).map(r => r.id), ['start']);
  assert.deepEqual(filterLaporan(reports, [{ ...order, status: 'selesai' }], combined), []);
  assert.ok(!filterLaporan(reports, [], { item: 'ban_roda' }).some(r => r.id === 'end'));
  assert.ok(!filterLaporan(reports, [], { petugas: 'Budi' }).some(r => r.id === 'after'));
  assert.equal(filterLaporan(listLaporan(), listWorkOrders(), { hanya_stop: true }).every(r => r.status === 'terkirim'), true);
});

test('filter input rejects invalid calendar dates, reversed ranges and unsupported flags', () => {
  assert.throws(() => parseLaporanFilter(new URLSearchParams('dari=2026-02-30')));
  assert.throws(() => parseLaporanFilter(new URLSearchParams('dari=2026-11-07&sampai=2026-11-06')));
  assert.throws(() => parseLaporanFilter(new URLSearchParams('stop=true')));
  assert.equal(parseLaporanFilter(new URLSearchParams('wo=1')).wo_terbuka, true);
  assert.equal(parseLaporanFilter(new URLSearchParams('stop=0')).hanya_stop, false);
});

test('component links include earlier labels for the same component without matching good findings', () => {
  const earlier = makeReport('earlier', 'DT-07', '2026-11-05T23:30:00Z', true);
  const renamed = makeReport('renamed', 'DT-08', '2026-11-06T00:30:00Z', true);
  itemsOf(renamed).find(item => item.id === 'ITEM-3')!.nama = 'Wheel and tyre assembly';
  const good = makeReport('good', 'DT-09', '2026-11-06T01:30:00Z', false);
  const result = filterLaporan([earlier, renamed, good], [], { item: 'Wheel and tyre assembly' });
  assert.deepEqual(result.map(report => report.id), ['renamed', 'earlier']);
});
