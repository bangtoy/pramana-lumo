import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), 'pramana-wo-'));
const { database, getLaporan, saveLaporan, listWorkOrders, getWorkOrder } = await import('../lib/db.ts');
const { createWorkOrders, updateWorkOrder, syncItemDitangani } = await import('../lib/work-order.ts');
const { jakartaDay } = await import('../lib/waktu.ts');
const { isWorkOrderOverdue, sortWorkOrders, reportWorkOrderSummary } = await import('../lib/work-order-rules.ts');

test('report summaries do not mark remaining unassigned findings complete', async () => {
  const report = { ...getLaporan('LI-2026-10-29-DT07')!, id: 'LI-WO-SUMMARY' }; saveLaporan(report);
  const orders = await createWorkOrders(report.id, async () => []);
  const closed = orders.map(order => ({ ...order, status: 'selesai' as const }));
  assert.deepEqual(reportWorkOrderSummary(report, []), { status: 'pending', open: 0, pending: 2 });
  assert.deepEqual(reportWorkOrderSummary(report, [orders[0]]), { status: 'open', open: 1, pending: 1 });
  assert.deepEqual(reportWorkOrderSummary(report, [closed[0]]), { status: 'pending', open: 0, pending: 1 });
  assert.deepEqual(reportWorkOrderSummary(report, closed), { status: 'completed', open: 0, pending: 0 });
  assert.deepEqual(reportWorkOrderSummary({ ...report, hasil: {} }, []), { status: 'none', open: 0, pending: 0 });
});

test('work-order urgency uses Jakarta dates and keeps open overdue work first', async () => {
  const [base] = await createWorkOrders('LI-2026-10-29-DT07', async () => []);
  const closed = { ...base, id: 'closed', status: 'selesai' as const, target: '2026-11-01' };
  const today = { ...base, id: 'today', target: '2026-11-07' };
  const overdue = { ...base, id: 'overdue', prioritas: 'sedang' as const, target: '2026-11-06' };
  const urgent = { ...overdue, id: 'urgent', prioritas: 'tinggi' as const };
  assert.equal(isWorkOrderOverdue(today, '2026-11-07'), false);
  assert.equal(isWorkOrderOverdue(closed, '2026-11-07'), false);
  assert.equal(isWorkOrderOverdue({ ...today, target: null }, '2026-11-07'), false);
  assert.equal(isWorkOrderOverdue(today, jakartaDay(0, new Date('2026-11-07T17:00:00Z'))), true);
  const original = [closed, today, overdue, urgent];
  assert.deepEqual(sortWorkOrders(original, '2026-11-07').map(w => w.id), ['urgent', 'overdue', 'today', 'closed']);
  assert.equal(original[0].id, 'closed');
});

test('Jakarta deadlines cross midnight, month and leap-year boundaries', () => {
  assert.equal(jakartaDay(0, new Date('2026-11-07T16:59:59Z')), '2026-11-07');
  assert.equal(jakartaDay(0, new Date('2026-11-07T17:00:00Z')), '2026-11-08');
  assert.equal(jakartaDay(-2, new Date('2026-12-30T18:00:00Z')), '2027-01-02');
  assert.equal(jakartaDay(1, new Date('2024-03-01T00:00:00Z')), '2024-02-29');
});

test('work-order and finding changes synchronize atomically without changing inspection outcomes', async () => {
  const report = { ...getLaporan('LI-2026-10-29-DT07')!, id: 'LI-WO-SYNC' }; saveLaporan(report);
  const [order] = await createWorkOrders(report.id, async () => []);
  updateWorkOrder(order, { mekanik: '  Hendra  ' });
  const completed = updateWorkOrder(order, { status: 'selesai', target: '2026-11-08', catatan_selesai: 'Tyre replaced and tested.' });
  assert.equal(completed.mekanik, 'Hendra', 'A stale caller preserves newer assignment');
  assert.ok(completed.selesai_at); assert.equal(getLaporan(report.id)!.hasil[order.item_id].ditangani, true);
  assert.equal(getLaporan(report.id)!.hasil[order.item_id].stop, true);
  assert.equal(updateWorkOrder(order, { status: 'selesai' }).selesai_at, completed.selesai_at);
  syncItemDitangani(report.id, order.item_id, false);
  const reopened = getWorkOrder(order.id)!;
  assert.equal(reopened.status, 'terbuka'); assert.equal(reopened.selesai_at, null); assert.equal(reopened.catatan_selesai, null);
  syncItemDitangani(report.id, order.item_id, true);
  assert.equal(getWorkOrder(order.id)!.catatan_selesai, 'Marked handled from the inspection report.');
  assert.equal(getLaporan(report.id)!.hasil[order.item_id].status, 'tidak_baik');
  assert.throws(() => updateWorkOrder(order, { target: '2026-02-30' }));
  assert.throws(() => updateWorkOrder(order, { target: 'tomorrow' }));
  assert.throws(() => updateWorkOrder(order, { prioritas: 'sedang' }));
  const db = database();
  db.exec("CREATE TRIGGER fail_report_write BEFORE UPDATE ON laporan BEGIN SELECT RAISE(ABORT, 'simulated disk failure'); END");
  try { assert.throws(() => updateWorkOrder(order, { status: 'terbuka' }), /simulated disk failure/); }
  finally { db.exec('DROP TRIGGER fail_report_write'); }
  assert.equal(getWorkOrder(order.id)!.status, 'selesai', 'WO rolls back if the report write fails');
  assert.equal(getLaporan(report.id)!.hasil[order.item_id].ditangani, true);
});

test('creation selects only unassigned defects, enforces STOP, falls back and remains idempotent', async () => {
  const seed = getLaporan('LI-2026-10-29-DT07')!;
  const report = { ...seed, id: 'LI-WO-RULES', hasil: structuredClone(seed.hasil) };
  report.hasil['ITEM-8'].stop = false;
  report.hasil['ITEM-1'] = { ...report.hasil['ITEM-1'], status: 'tidak_bisa_diperiksa', stop: true };
  saveLaporan(report);
  const orders = await createWorkOrders(report.id, async () => [
    { item_id: 'ITEM-3', judul: 'Replace the damaged tyre', tindakan: 'Replace the damaged tyre and inspect safely.', prioritas: 'sedang' },
    { item_id: 'ITEM-1', judul: 'Ignore eligibility', tindakan: 'Must not be created.', prioritas: 'tinggi' },
  ]);
  assert.equal(orders.length, 2);
  const tyre = orders.find(w => w.item_id === 'ITEM-3')!, light = orders.find(w => w.item_id === 'ITEM-8')!;
  assert.equal(tyre.prioritas, 'tinggi'); assert.equal(tyre.target, jakartaDay());
  assert.equal(light.prioritas, 'sedang'); assert.equal(light.target, jakartaDay(-2));
  assert.equal(light.judul, 'Repair Lights & reflectors'); assert.equal(light.tindakan, report.hasil['ITEM-8'].catatan);
  saveLaporan({ ...report, id: 'LI-WO-MEDIUM' });
  const medium = await createWorkOrders('LI-WO-MEDIUM', async () => [{ item_id: 'ITEM-8', judul: 'Repair the light', tindakan: 'Inspect and repair the light.', prioritas: 'tinggi' }]);
  assert.equal(medium.find(w => w.item_id === 'ITEM-8')?.prioritas, 'sedang', 'Agent cannot escalate a non-STOP priority');
  assert.ok(orders.every(w => w.mekanik === null && w.status === 'terbuka'));
  assert.deepEqual(await createWorkOrders(report.id, async () => { throw Error('Must not call model twice'); }), []);
  const unavailable = { ...seed, id: 'LI-WO-FALLBACK' }; saveLaporan(unavailable);
  const fallback = await createWorkOrders(unavailable.id, async () => { throw Error('Unavailable'); });
  assert.equal(fallback.length, 2); assert.ok(fallback.every(w => w.judul.startsWith('Repair ') && w.prioritas === 'tinggi'));
  const concurrent = { ...seed, id: 'LI-WO-CONCURRENT' }; saveLaporan(concurrent);
  const results = await Promise.all([createWorkOrders(concurrent.id, async () => []), createWorkOrders(concurrent.id, async () => [])]);
  assert.deepEqual(results.map(r => r.length).sort(), [0, 2]); assert.equal(listWorkOrders(concurrent.id).length, 2);
  saveLaporan({ ...seed, id: 'LI-WO-DRAFT', status: 'berjalan' });
  await assert.rejects(createWorkOrders('LI-WO-DRAFT'), /Submit the inspection/);
});
