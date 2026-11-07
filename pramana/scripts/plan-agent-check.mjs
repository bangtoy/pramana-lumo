import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
const base = `http://localhost:${process.env.PORT || 3000}`;
const results = [];
async function json(url, body, method = 'POST') {
  const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const value = await response.json();
  assert.ok(response.ok, JSON.stringify(value));
  return value;
}
async function turn(id, form) {
  const started = performance.now();
  const response = await fetch(`${base}/api/rencana/${id}/turn`, { method: 'POST', body: form });
  const text = await response.text();
  assert.ok(response.ok, text);
  const events = text.trim().split('\n').map(line => JSON.parse(line));
  const failed = events.find(e => e.error);
  assert.ok(!failed, failed?.error);
  const reply = events.at(-1).reply;
  assert.ok(reply?.data);
  assert.ok(events.some(e => e.status));
  return { reply, seconds: +( (performance.now() - started) / 1000).toFixed(2), statuses: events.flatMap(e => e.status ? [e.status] : []) };
}
const textPlan = await json('/api/rencana', {});
const textForm = new FormData(); textForm.set('text', 'P2H dump truck tronton');
const textRun = await turn(textPlan.id, textForm);
assert.ok(textRun.reply.data.items.length >= 8);
results.push({ scenario: 'text plan', id: textPlan.id, count: textRun.reply.data.items.length, seconds: textRun.seconds, statuses: textRun.statuses });
console.log(results.at(-1));

const specPlan = await json('/api/rencana', {});
const specForm = new FormData(); specForm.set('text', 'Create a daily P2H inspection plan from this dump truck Spec Sheet. Add the required standard safety checks.');
specForm.set('file', new Blob([readFileSync('test/dum-trcuk-spel.webp')], { type: 'image/webp' }), 'dump-truck-spec.webp');
const specRun = await turn(specPlan.id, specForm);
assert.ok(specRun.reply.data.items.some(i => i.sumber === 'spec'));
assert.ok(specRun.reply.data.items.some(i => i.sumber === 'standar'));
assert.ok(specRun.reply.data.spec_fakta.length > 0);
results.push({ scenario: 'spec plan', id: specPlan.id, count: specRun.reply.data.items.length, facts: specRun.reply.data.spec_fakta, seconds: specRun.seconds, under30Seconds: specRun.seconds < 30, statuses: specRun.statuses });
console.log(results.at(-1));

const manuallyEdited = 'Daily inspection — EAST QUARRY 42';
await json(`/api/rencana/${textPlan.id}`, { judul: manuallyEdited }, 'PATCH');
const followup = new FormData(); followup.set('text', 'What is the current exact plan title? Quote it. Do not change anything.');
const followRun = await turn(textPlan.id, followup);
assert.ok(followRun.reply.messages.at(-1).text.includes('EAST QUARRY 42'));
assert.equal(followRun.reply.data.judul, manuallyEdited);
const response = await fetch(`${base}/api/rencana/${textPlan.id}`);
const publicPlan = await response.json();
assert.ok(!('agent_history' in publicPlan));
results.push({ scenario: 'manual edit read on next turn', seconds: followRun.seconds, passed: true });
writeFileSync('../docs/verification/plan-agent-check.json', JSON.stringify({ model: 'configured OPENAI_MODEL', results }, null, 2));
console.log('Real plan agent checks passed');
