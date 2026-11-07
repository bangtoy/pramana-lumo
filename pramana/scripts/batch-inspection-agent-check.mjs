import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const base = 'http://localhost:3008'; // Branch preview, isolated from production.
const root = process.env.SIM_ASSETS || 'D:/Orca/example file/Foto-P2H/02-Dump-Truck-Tronton-U-Type';
function photo(index, condition = 'Normal') {
  const file = readdirSync(path.join(root, condition)).find(name => name.startsWith(String(index).padStart(2, '0') + '-'));
  return { bytes: readFileSync(path.join(root, condition, file)), mime: 'image/jpeg', source: `${condition}/${file}`, item: `ITEM-${index}` };
}
async function run(name) {
  const report = await (await fetch(`${base}/api/laporan`, { method: 'POST' })).json();
  const evidence = { case: name, reportId: report.id, note: 'Actual agent and original photos. Operator accounts are simulation inputs, not physical checks by the test runner.', turns: [] };
  const persist = () => writeFileSync(`../docs/verification/batch-inspection-${name}.json`, JSON.stringify(evidence, null, 2) + '\n');
  let current = report;
  async function turn(text, photos = []) {
    const form = new FormData(); form.set('text', text);
    for (const [index, asset] of photos.entries()) form.append('file', new File([asset.bytes], `photo-${index + 1}.${asset.mime.endsWith('png') ? 'png' : 'jpg'}`, { type: asset.mime }));
    const start = Date.now();
    const response = await fetch(`${base}/api/laporan/${report.id}/turn`, { method: 'POST', body: form, signal: AbortSignal.timeout(180000) });
    const raw = await response.text(); assert.ok(response.ok, raw);
    const events = raw.trim().split('\n').map(JSON.parse);
    assert.ok(!events.some(event => event.error), JSON.stringify(events.find(event => event.error)));
    current = events.at(-1).reply.data;
    const message = current.messages.at(-1), uploaded = current.messages.filter(message => message.role === 'user').at(-1).files;
    evidence.turns.push({ text, seconds: (Date.now() - start) / 1000, photos: photos.map((asset, index) => ({ source: asset.source, bytes: asset.bytes.length, sha256: createHash('sha256').update(asset.bytes).digest('hex'), fileId: uploaded[index].id })), reply: message.text, quickReplies: message.quick_replies, checklist: message.inspection_checklist, findings: current.hasil, photoMatches: current.photo_matches, status: current.status });
    persist(); console.log(JSON.stringify({ case: name, turn: evidence.turns.length, count: Object.keys(current.hasil).length, reply: message.text }));
    return message;
  }
  try {
    await turn(`I am Batch ${name}, at Riau. Use RI-DT-UTYPE-01 for QA-BATCH-${name}. The truck is safely parked, isolated and chocked; inspections are from a safe position with the mechanical body prop engaged where required.`);
    assert.equal(current.messages.at(-1).inspection_checklist.kind, 'overview');
    assert.equal(current.messages.at(-1).inspection_checklist.items.length, 8);
    if (name === 'normal') {
      const assets = [7, 3, 6, 4, 5].map(index => photo(index));
      await turn('These five photographed components have been checked directly and are normal: tyres and all wheel nuts on both sides intact; dump floor, welds and mounts have no structural cracks; cylinder, hoses and seals dry and intact; mechanical prop straight, seated and locked; tailgate hinges and pins intact, closure and both latches tested and locked. Only surface dirt/rust. Match each photo to its component.', assets);
      assert.deepEqual(Object.keys(current.hasil).sort(), ['ITEM-3', 'ITEM-4', 'ITEM-5', 'ITEM-6', 'ITEM-7']);
      for (const [index, asset] of assets.entries()) assert.ok(current.hasil[asset.item].bukti_ids.includes(evidence.turns.at(-1).photos[index].fileId), `Wrong photo assignment for ${asset.item}`);
      assert.equal(current.status, 'berjalan');
      await turn('For these remaining photos I directly checked: seat belt locks, mirrors intact, horn sounds, extinguisher gauge green and label in date. Safe stationary brake tests passed: pressure in normal operating range, no air leak, parking brake holds and service brake responds. Headlights, both brake lights, indicators and reflectors were checked with a colleague and all work. These are operator test results, not conclusions from the photos.', [8, 1, 2].map(index => photo(index)));
      assert.equal(Object.keys(current.hasil).length, 8);
      assert.ok(Object.values(current.hasil).every(finding => finding.status === 'baik' && !finding.stop));
      assert.equal(current.status, 'berjalan', 'Do not auto-submit a completed batch');
      await turn('Submit the completed report now.');
      assert.equal(current.status, 'terkirim');
    } else if (name === 'photo_only') {
      const assets = [7, 3, 6, 4, 5].map(index => photo(index));
      await turn('', assets);
      const uploaded = evidence.turns.at(-1).photos;
      for (const [index, asset] of assets.entries()) assert.ok(current.photo_matches[uploaded[index].fileId].item_ids.includes(asset.item), `Photo-only mapping missed ${asset.item}`);
      assert.ok(Object.keys(current.hasil).length >= 3, 'Record supported visual checks before requesting missing photos');
      assert.ok(Object.keys(current.hasil).every(item => assets.some(asset => asset.item === item)));
      assert.ok(Object.values(current.hasil).every(finding => !finding.stop));
      assert.equal(current.status, 'berjalan');
    } else if (name === 'pending') {
      await turn('I checked the photographed visible parts from a safe position: tyres and nuts intact on both sides, body welds and mounts without cracks, hydraulics dry, prop straight and locked. Cabin photo is included for documentation. Please review every image.', [3, 1, 5, 4, 6].map(index => photo(index)));
      assert.deepEqual(Object.keys(current.hasil).sort(), ['ITEM-3', 'ITEM-4', 'ITEM-5', 'ITEM-6']);
      assert.equal(current.messages.at(-1).inspection_checklist.items[0].state, 'photo_received');
      const countBefore = current.messages.flatMap(message => message.files || []).length;
      current = await (await fetch(`${base}/api/laporan/${current.id}`)).json();
      await turn('I checked directly: seat belt locks and is intact, mirrors intact, horn sounds, extinguisher seal intact, gauge green and label in date. Use the cabin photo already sent.');
      assert.equal(current.hasil['ITEM-1'].status, 'baik');
      assert.equal(Object.keys(current.hasil).length, 5);
      assert.equal(current.messages.flatMap(message => message.files || []).length, countBefore);
      assert.equal(current.hasil['ITEM-2'], undefined);
    } else {
      const unrelated = { bytes: readFileSync('public/lumo/lumo-avatar-netral.png'), mime: 'image/png', source: 'Existing Lumo avatar', item: null };
      await turn('Review this batch. I checked the photographed tyre and hydraulic components: tyres and all wheel nuts intact on both sides; hydraulics dry without damage. The photographed dump floor has a structural crack and a hole, so the truck is kept out of service. Some attachments may be duplicates or unrelated; do not use those to invent extra checks.', [photo(3), photo(4, 'Issue'), unrelated, photo(3), photo(5)]);
      assert.deepEqual(Object.keys(current.hasil).sort(), ['ITEM-3', 'ITEM-4', 'ITEM-5']);
      assert.equal(current.hasil['ITEM-4'].stop, true);
      assert.equal(current.hasil['ITEM-4'].status, 'tidak_baik');
      const unrelatedId = evidence.turns.at(-1).photos[2].fileId;
      assert.deepEqual(current.photo_matches[unrelatedId].item_ids, []);
      assert.ok(Object.values(current.hasil).every(finding => !finding.bukti_ids.includes(unrelatedId)));
    }
    evidence.passed = true; persist();
  } catch (error) { evidence.error = error.message; persist(); throw error; }
}
const cases = process.env.BATCH_CASE ? [process.env.BATCH_CASE] : ['normal', 'pending', 'mixed', 'photo_only'];
const results = await Promise.allSettled(cases.map(run));
for (const [index, result] of results.entries()) console.log(JSON.stringify({ case: cases[index], status: result.status, error: result.status === 'rejected' ? result.reason.message : undefined }));
if (results.some(result => result.status === 'rejected')) process.exitCode = 1;
