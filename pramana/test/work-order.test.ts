import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), 'pramana-wo-'));
const { getLaporan, saveLaporan, listWorkOrders } = await import('../lib/db.ts');
const { createWorkOrders } = await import('../lib/work-order.ts');
const { jakartaDay } = await import('../lib/waktu.ts');

test('Jakarta deadlines cross midnight, month and leap-year boundaries', () => {
  assert.equal(jakartaDay(0, new Date('2026-11-07T16:59:59Z')), '2026-11-07');
  assert.equal(jakartaDay(0, new Date('2026-11-07T17:00:00Z')), '2026-11-08');
  assert.equal(jakartaDay(-2, new Date('2026-12-30T18:00:00Z')), '2027-01-02');
  assert.equal(jakartaDay(1, new Date('2024-03-01T00:00:00Z')), '2024-02-29');
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
