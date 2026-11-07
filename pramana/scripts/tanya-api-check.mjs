import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const results = [];
async function ready(base) {
  for (let attempt = 0; attempt < 40; attempt++) {
    try { if ((await fetch(base + '/api/tanya/saran', { signal: AbortSignal.timeout(1500) })).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Tanya API did not become ready.');
}
for (const [mode, port] of [['offline', 3004], ['online', 3002]]) {
  const base = `http://localhost:${port}`; await ready(base);
  const get = async path => { const response = await fetch(base + path); assert.equal(response.status, 200, path); return response.json(); };
  const post = body => fetch(base + '/api/tanya', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const before = JSON.stringify(await Promise.all(['/api/laporan', '/api/work-order', '/api/rencana', '/api/models'].map(get)));
  const suggestions = await get('/api/tanya/saran'); assert.ok(suggestions.rekomendasi.length > 0); assert.ok(suggestions.rekomendasi.length <= 4);
  for (const invalid of [{}, { text: '' }, { text: 'x'.repeat(4001) }, { text: 'Hello', percakapan_id: 'null' }, { text: 'Hello', unexpected: true }]) assert.equal((await post(invalid)).status, 400);
  assert.equal((await fetch(base + '/api/tanya', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
  assert.equal((await fetch(base + '/api/tanya/TL-missing')).status, 404);
  assert.equal((await post({ percakapan_id: 'TL-missing', text: 'Hello' })).status, 404);
  const started = Date.now(), response = await post({ text: 'Which work orders are still open?' }); assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /no-store/);
  let conversation = await response.json(); assert.equal('agent_history' in conversation, false);
  assert.equal(conversation.messages.at(-1).fallback, mode === 'offline');
  for (const id of conversation.messages.at(-1).sumber) assert.equal((await fetch(base + (id.startsWith('LI-') ? '/api/laporan/' : '/api/work-order/') + id)).status, 200);
  assert.deepEqual(await get('/api/tanya/' + conversation.id), conversation);
  let concurrency = null;
  if (mode === 'offline') {
    const calls = await Promise.all([post({ percakapan_id: conversation.id, text: 'Why is DT-07 not roadworthy?' }), post({ percakapan_id: conversation.id, text: 'Give me the fleet summary.' })]);
    concurrency = calls.map(response => response.status).sort(); assert.deepEqual(concurrency, [200, 409]);
    conversation = await calls.find(response => response.status === 200).json(); assert.equal(conversation.messages.length, 4);
    execFileSync('docker', ['restart', 'pramana-p3-offline'], { stdio: 'pipe' }); await ready(base);
    assert.deepEqual(await get('/api/tanya/' + conversation.id), conversation);
  }
  assert.equal(JSON.stringify(await Promise.all(['/api/laporan', '/api/work-order', '/api/rencana', '/api/models'].map(get))), before);
  results.push({ mode, id: conversation.id, elapsedMs: Date.now() - started, suggestions, lastMessage: conversation.messages.at(-1), historyOmitted: true, invalidInputRejected: true, missing404: true, sourcesResolve: true, readOnly: true, concurrency, restartPersists: mode === 'offline' });
}
writeFileSync('../docs/verification/tanya-api-check.json', JSON.stringify(results, null, 2));
console.log(results);
