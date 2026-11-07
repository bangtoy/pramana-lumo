import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const results = [];
for (const [mode, port] of [['agent', process.env.PORT || '3002'], ['fallback', process.env.FALLBACK_PORT || '3004']]) {
  const base = `http://localhost:${port}`, reportId = 'LI-2026-10-29-DT07', start = performance.now();
  const create = async () => {
    const response = await fetch(`${base}/api/work-order`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ laporan_id: reportId }) });
    assert.equal(response.status, 201); return response.json();
  };
  const created = await create();
  assert.equal(created.length, 2, 'Run against a seed report without existing work orders');
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  assert.ok(created.every(w => w.prioritas === 'tinggi' && w.target === day && w.mekanik === null && w.status === 'terbuka'));
  const report = await (await fetch(`${base}/api/laporan/${reportId}`)).json();
  for (const order of created) {
    assert.equal(report.hasil[order.item_id].status, 'tidak_baik');
    if (mode === 'fallback') {
      assert.equal(order.judul, `Repair ${report.rencana_snapshot.items.find(i => i.id === order.item_id).nama}`);
      assert.equal(order.tindakan, report.hasil[order.item_id].catatan);
    } else assert.ok(!order.judul.startsWith('Repair ' + report.rencana_snapshot.items.find(i => i.id === order.item_id).nama), 'Real agent should draft a specific instruction');
  }
  assert.deepEqual(await create(), []);
  const list = await (await fetch(`${base}/api/work-order?laporan_id=${reportId}`)).json(); assert.equal(list.length, 2);
  assert.deepEqual(await (await fetch(`${base}/api/work-order?laporan_id=LI-NOT-FOUND`)).json(), []);
  results.push({ mode, reportId, seconds: +((performance.now() - start) / 1000).toFixed(2), idempotent: true, orders: created });
}
writeFileSync('../docs/verification/work-order-create-check.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
