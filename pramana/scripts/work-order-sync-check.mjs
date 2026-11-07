import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const base = `http://localhost:${process.env.PORT || 3002}`, reportId = 'LI-2026-10-29-DT07';
async function api(path, body, expected = 200) {
  const response = await fetch(base + path, body ? { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  assert.equal(response.status, expected); return response.json();
}
const [order] = await api(`/api/work-order?laporan_id=${reportId}`); assert.ok(order);
const completed = await api(`/api/work-order/${order.id}`, { status: 'selesai', catatan_selesai: 'Replaced and safely tested.', mekanik: 'Hendra' });
assert.equal(completed.status, 'selesai'); assert.ok(completed.selesai_at);
let report = await api(`/api/laporan/${reportId}`); assert.equal(report.hasil[order.item_id].ditangani, true); assert.equal(report.hasil[order.item_id].stop, true);
const repeat = await api(`/api/work-order/${order.id}`, { status: 'selesai' }); assert.equal(repeat.selesai_at, completed.selesai_at);
report = await api(`/api/laporan/${reportId}`, { item_id: order.item_id, ditangani: false });
const reopened = await api(`/api/work-order/${order.id}`);
assert.equal(reopened.status, 'terbuka'); assert.equal(reopened.selesai_at, null); assert.equal(reopened.catatan_selesai, null);
await api(`/api/laporan/${reportId}`, { item_id: order.item_id, ditangani: true });
const fromReport = await api(`/api/work-order/${order.id}`); assert.equal(fromReport.status, 'selesai'); assert.equal(fromReport.catatan_selesai, 'Marked handled from the inspection report.');
await api(`/api/work-order/${order.id}`, { target: '2026-02-30' }, 400);
await api(`/api/work-order/${order.id}`, { prioritas: 'sedang' }, 400);
await api('/api/work-order/WO-NOT-FOUND', { status: 'selesai' }, 404);
await api(`/api/work-order/${order.id}`, { status: 'terbuka', mekanik: order.mekanik, target: order.target });
const result = { orderId: order.id, reportId, workOrderToFinding: true, findingToWorkOrder: true, stopPreserved: true, completionTimestampStable: true, reopenClearsCompletion: true, invalidDateRejected: true, invalidFieldRejected: true, unknownOrder404: true };
writeFileSync('../docs/verification/work-order-sync-check.json', JSON.stringify(result, null, 2)); console.log(result);
