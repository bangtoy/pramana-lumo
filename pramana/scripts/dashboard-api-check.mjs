import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
const base = `http://localhost:${process.env.PORT || 3004}`;
async function api(path, expected = 200, origin = base) {
  const response = await fetch(origin + path); assert.equal(response.status, expected); return response.json();
}
async function ready() {
  for (let i = 0; i < 30; i++) { try { if ((await fetch(base + '/api/dashboard')).ok) return; } catch {} await new Promise(resolve => setTimeout(resolve, 500)); }
  throw new Error('Verification container did not become ready.');
}
await ready();
const summary = await api('/api/dashboard');
assert.equal(summary.kpi.stop, 2); assert.equal(summary.kpi.stop_tanpa_wo, 1);
assert.equal(summary.kpi.belum_p2h, 2); assert.equal(summary.kpi.wo_terlambat, 3);
assert.equal(summary.kpi.unit_total, 8); assert.equal(summary.kpi.unit_diperiksa, 6);
assert.equal(summary.tren.length, 14); assert.equal((await api('/api/dashboard?hari=7')).tren.length, 7);
assert.equal(summary.komponen[0].comp_id, 'ban_roda'); assert.equal(summary.komponen[0].berulang.unit, 'DT-07');
assert.deepEqual(summary.units.map(u => u.vonis), ['stop', 'stop', 'belum', 'belum', 'layak', 'layak', 'layak', 'layak']);
await api('/api/dashboard?hari=30', 400);
const reports = await api('/api/laporan?status=terkirim'), orders = await api('/api/work-order');
assert.equal(reports.filter(r => r.id.startsWith('LI-RW-')).length, 46); assert.equal(orders.length, 11);
assert.equal(reports.some(r => 'agent_history' in r), false);
await run('docker', ['restart', 'pramana-p2-verify']); await ready();
const afterReports = await api('/api/laporan?status=terkirim'), afterOrders = await api('/api/work-order');
assert.deepEqual(afterReports, reports); assert.deepEqual(afterOrders, orders);
const liveReports = await api('/api/laporan?status=terkirim', 200, 'http://localhost:3002');
const live = await api('/api/dashboard', 200, 'http://localhost:3002');
for (const id of ['LI-2026-10-29-DT07', 'LI-ee9abbcb-7a1d-470a-beb0-d716984c73db', 'LI-dfcb81e2-232f-4eca-8dad-12f0d16da30b']) assert.ok(liveReports.some(r => r.id === id));
const result = { baselineKpi: summary.kpi, topComponent: summary.komponen[0], trendLengths: [7, 14], unitOrderVerified: true, restartUnchanged: true, baselineReports: reports.length, historyReports: 46, historyWorkOrders: orders.length, liveKpi: live.kpi, liveReports: liveReports.length, existingReportsPreserved: true };
writeFileSync('../docs/verification/dashboard-api-check.json', JSON.stringify(result, null, 2)); console.log(result);
