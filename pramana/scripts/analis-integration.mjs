import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mode = process.argv[2];
if (!mode) {
  const outcomes = [];
  for (const scenario of ['offline', 'online']) {
    const env = { ...process.env, DATA_DIR: mkdtempSync(path.join(tmpdir(), `pramana-analis-${scenario}-`)) };
    if (scenario === 'offline') { env.OPENAI_BASE_URL = 'http://127.0.0.1:9/v1'; env.OPENAI_API_KEY = 'test-unavailable-provider'; }
    const stdout = execFileSync(process.execPath, ['--experimental-strip-types', fileURLToPath(import.meta.url), scenario], { env, encoding: 'utf8', timeout: 115000 });
    const result = JSON.parse(stdout.trim()); outcomes.push(result); console.log({ mode: scenario, ...result });
  }
  writeFileSync('../docs/verification/analis-integration.json', JSON.stringify(outcomes, null, 2));
} else {
  const { tanyaAnalis, sumberValid } = await import('../lib/agents/analis.ts');
  const { database, getPercakapan, listLaporan, listWorkOrders } = await import('../lib/db.ts');
  const snapshot = () => JSON.stringify({ reports: listLaporan(), orders: listWorkOrders(), plans: database().prepare('SELECT * FROM rencana').all(), models: database().prepare('SELECT * FROM model').all() });
  const before = snapshot(), started = Date.now();
  const conversation = await tanyaAnalis(null, 'Why is DT-07 not roadworthy? Cite the latest inspection and recommend the next steps.');
  const reply = conversation.messages.at(-1);
  assert.equal(reply.fallback, mode === 'offline'); assert.ok(reply.sumber.includes('LI-RW-45'));
  assert.deepEqual(sumberValid(reply.sumber), reply.sumber); assert.ok(reply.rekomendasi.length >= 1);
  if (mode === 'offline') { assert.match(reply.text, /DT-07 is not roadworthy/); assert.equal(reply.rekomendasi.length, 4); }
  let followUp = null;
  if (mode === 'online') {
    const continued = await tanyaAnalis(conversation.id, 'For that same unit, which open work orders are overdue? Only read the data.');
    followUp = continued.messages.at(-1); assert.equal(followUp.fallback, false);
    assert.deepEqual(sumberValid(followUp.sumber), followUp.sumber); assert.ok(followUp.sumber.some(id => id.startsWith('WO-')));
    assert.equal(continued.messages.length, 4); assert.ok(continued.agent_history.length <= 30);
    assert.deepEqual(getPercakapan(conversation.id), continued);
  }
  assert.equal(snapshot(), before);
  const traces = readFileSync(path.join(process.env.DATA_DIR, 'traces.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
  assert.ok(traces.some(trace => trace.name === 'pramana-analis' && trace.group_id === conversation.id));
  const traceText = JSON.stringify(traces); assert.ok(!traceText.includes(process.env.OPENAI_API_KEY)); assert.doesNotMatch(traceText, /base64|sidewall/);
  console.log(JSON.stringify({ mode, conversationId: conversation.id, elapsedMs: Date.now() - started, reply, followUp, readOnly: true, persisted: true, historyLength: getPercakapan(conversation.id).agent_history.length, localTraceEvents: traces.length }));
}
