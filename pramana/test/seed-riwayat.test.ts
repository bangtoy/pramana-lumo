import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { seedRiwayat } from '../lib/seed-riwayat.ts';
import { dayKey, jakartaDay } from '../lib/waktu.ts';
process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), 'pramana-history-'));
const { database, getLaporan, listLaporan, listWorkOrders } = await import('../lib/db.ts');

test('history upgrades an existing database atomically and preserves records on later restarts', () => {
  const db = database(), at = new Date('2026-11-07T04:00:00Z');
  // Recreate the pre-P2 database state in this isolated temporary database.
  db.exec("DELETE FROM work_order WHERE id LIKE 'WO-RW-%'; DELETE FROM laporan WHERE id LIKE 'LI-RW-%'");
  const old = JSON.stringify(getLaporan('LI-2026-10-29-DT07'));
  seedRiwayat(db, at);
  const reports = listLaporan().filter(r => r.id.startsWith('LI-RW-'));
  const orders = listWorkOrders().filter(w => w.id.startsWith('WO-RW-'));
  assert.equal(reports.length, 46); assert.equal(orders.length, 11);
  assert.equal(new Set(reports.map(r => r.unit)).size, 8);
  assert.equal(new Set(reports.map(r => r.petugas)).size, 4);
  assert.equal(new Set(reports.map(r => r.lokasi)).size, 2);
  const days = [...new Set(reports.map(r => dayKey(r.submitted_at!)))].sort();
  assert.equal(days.length, 14); assert.equal(days[0], jakartaDay(13, at));
  const today = reports.filter(r => dayKey(r.submitted_at!) === jakartaDay(0, at));
  assert.deepEqual(today.map(r => r.unit!.split(' · ')[0]).sort(), ['DT-01', 'DT-02', 'DT-03', 'DT-04', 'DT-06', 'DT-07']);
  assert.equal(today.filter(r => Object.values(r.hasil).some(h => h.stop)).length, 2);
  assert.equal(today.filter(r => Object.values(r.hasil).some(h => h.stop) && !orders.some(w => w.laporan_id === r.id)).length, 1);
  assert.equal(orders.filter(w => w.status === 'terbuka' && w.target! < jakartaDay(0, at)).length, 3);
  const defects = (unit: string, comp: string) => reports.filter(r => r.unit!.startsWith(unit)).filter(r => r.rencana_snapshot!.items.some(i => i.comp_id === comp && r.hasil[i.id].status === 'tidak_baik'));
  assert.equal(defects('DT-07', 'ban_roda').length, 6);
  assert.equal(defects('DT-03', 'rem').length, 4);
  assert.equal(defects('DT-08', 'rem').length, 2);
  assert.ok(defects('DT-07', 'silinder_hidraulik').length >= 2);
  for (const report of reports) {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).format(new Date(report.submitted_at!));
    assert.ok(parts >= '06:35' && parts <= '07:42');
    for (const [id, finding] of Object.entries(report.hasil)) {
      const order = orders.find(w => w.laporan_id === report.id && w.item_id === id);
      assert.equal(finding.ditangani, order?.status === 'selesai');
      if (report.unit!.startsWith('DT-07') && id === 'ITEM-3' && finding.status === 'tidak_baik') assert.deepEqual(finding.bukti_ids, ['FILE-DT07-SISI-KIRI', 'FILE-DT07-BAN']);
    }
  }
  const first = JSON.stringify(reports);
  seedRiwayat(db, new Date('2026-11-08T04:00:00Z'));
  assert.equal(JSON.stringify(listLaporan().filter(r => r.id.startsWith('LI-RW-'))), first);
  assert.equal(JSON.stringify(getLaporan('LI-2026-10-29-DT07')), old);
  const child = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', "import {listLaporan,listWorkOrders} from './lib/db.ts'; console.log(JSON.stringify({reports:listLaporan().length,orders:listWorkOrders().length}));"], { encoding: 'utf8', env: process.env });
  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(JSON.parse(child.stdout.trim()), { reports: 47, orders: 11 });
});
