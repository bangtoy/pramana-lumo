import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const base = `http://localhost:${process.env.PORT || 3001}`;
const started = performance.now();
let report = await (await fetch(`${base}/api/laporan`, { method: 'POST' })).json();
assert.ok(report.id, JSON.stringify(report));
const turns = [];
async function turn(text, fileId) {
  const start = performance.now(), form = new FormData(); form.set('text', text); if (fileId) form.set('fileId', fileId);
  const response = await fetch(`${base}/api/laporan/${report.id}/turn`, { method: 'POST', body: form });
  const body = await response.text(); assert.ok(response.ok, body);
  const events = body.trim().split('\n').map(JSON.parse); assert.ok(!events.some(e => e.error), JSON.stringify(events));
  report = events.at(-1).reply.data;
  const last = report.messages.at(-1); turns.push({ seconds: +((performance.now() - start) / 1000).toFixed(2), reply: last.text, recorded: Object.keys(report.hasil).length });
  console.log(turns.at(-1)); return last;
}
await turn('My name is Alex. I am at Tanjung Enim. Use inspection plan RI-DT-UTYPE-01 for unit DT-09 · B 9129 KD. The truck is parked, isolated and chocked.');
assert.equal(report.rencana_snapshot.items.length, 8);
await turn('Record cabin safety as good. I have not attached a photo.');
assert.equal(Object.keys(report.hasil).length, 0, 'Mandatory photo must be enforced');
await turn('Submit the report now.');
assert.equal(report.status, 'berjalan', 'Incomplete report cannot be submitted');
for (const item of report.rencana_snapshot.items) {
  const isTyre = item.comp_id === 'ban_roda';
  await turn(isTyre ? `For the current item ${item.nama}, the photo shows a sidewall bulge. Record this defect and STOP.` : `For the current item ${item.nama}: I cannot complete this inspection safely today because qualified isolation/access and functional testing are unavailable. The attached photo documents the available view only; it does not prove this item works. Please record cannot inspect, reason safe access and functional testing unavailable, and STOP pending reinspection. Do not claim good or ask me to approach unsafe equipment.`, isTyre ? 'FILE-DT07-BAN' : item.comp_id === 'kabin' ? 'FILE-APAR-LABEL' : 'FILE-DT07-SISI');
  assert.ok(report.hasil[item.id], `${item.nama} was not recorded`);
}
await turn('Submit the completed inspection report now.');
assert.equal(report.status, 'terkirim'); assert.equal(Object.keys(report.hasil).length, 8);
assert.ok(report.hasil['ITEM-3'].stop); assert.ok(!('agent_history' in report));
const list = await (await fetch(`${base}/api/laporan?status=terkirim`)).json(); assert.ok(list.some(r => r.id === report.id));
const evidence = { reportId: report.id, seconds: +((performance.now() - started) / 1000).toFixed(2), count: 8, status: report.status, photoRejection: true, incompleteSubmissionRejected: true, turns };
writeFileSync('../docs/verification/inspector-agent-check.json', JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ ...evidence, turns: undefined }, null, 2));
