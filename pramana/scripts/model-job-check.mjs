import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
const base = `http://localhost:${process.env.PORT || 3002}`;
async function json(url, body) {
  const response = await fetch(base + url, body === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const value = await response.json(); assert.ok(response.ok, JSON.stringify(value)); return value;
}
async function turn(id, form) {
  const response = await fetch(`${base}/api/rencana/${id}/turn`, { method: 'POST', body: form });
  const body = await response.text(); assert.ok(response.ok, body);
  const events = body.trim().split('\n').map(JSON.parse);
  assert.ok(!events.some(e => e.error), JSON.stringify(events.find(e => e.error)));
  return events.at(-1).reply;
}
const plan = process.env.PLAN_ID ? await json(`/api/rencana/${process.env.PLAN_ID}`) : await json('/api/rencana', {});
if (!plan.items.length) {
  const form = new FormData(); form.set('text', 'Create a daily P2H inspection plan for this JCB JS120 excavator from the Spec Sheet. Include excavator-specific checks and standard safety checks.');
  form.set('file', new Blob([readFileSync('test/jcb-js120-spec.png')], { type: 'image/png' }), 'jcb-js120-spec.png');
  const reply = await turn(plan.id, form); console.log('Excavator plan created:', plan.id, reply.data.items.length, 'items');
}
const job = process.env.JOB_ID ? await json(`/api/models/${process.env.JOB_ID}`) : await json(`/api/rencana/${plan.id}/model`, {});
const started = performance.now() - (Date.now() - Date.parse(job.created_at));
const duplicate = await json(`/api/rencana/${plan.id}/model`, {});
assert.equal(job.id, duplicate.id); console.log('Job started:', job.id);
const form = new FormData(); form.set('text', 'Briefly remind me what safe parking is required before an inspection. Do not change the plan or start another job.');
const chatStarted = performance.now();
const concurrentTurn = turn(plan.id, form).then(reply => ({ passed: !!reply.messages.at(-1).text, seconds: +((performance.now() - chatStarted) / 1000).toFixed(2) }));
let model = job, lastLog = 0;
while (model.status === 'proses' && performance.now() - started < 330000) {
  await new Promise(resolve => setTimeout(resolve, 2000)); model = await json(`/api/models/${job.id}`);
  for (const log of (model.log || []).slice(lastLog)) console.log(log.jenis, log.teks);
  lastLog = model.log?.length || 0;
}
const chat = await concurrentTurn;
const updated = await json(`/api/rencana/${plan.id}`);
const report = { planId: plan.id, modelId: job.id, status: model.status, seconds: +((performance.now() - started) / 1000).toFixed(2), message: model.pesan, log: model.log, mappedItems: updated.items.filter(i => i.comp_id).length, count: updated.items.length, concurrentChat: chat };
writeFileSync('../docs/verification/model-job-check.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, log: undefined }, null, 2));
assert.equal(model.status, 'siap');
assert.equal(report.mappedItems, report.count);
assert.ok(report.seconds < 300);
