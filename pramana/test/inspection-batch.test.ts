import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), 'pramana-batch-'));
const { readTurn } = await import('../lib/agents/turn.ts');
const { compactHistory } = await import('../lib/agents/client.ts');
const { database, saveLaporan, saveRencana, getRencana } = await import('../lib/db.ts');
const { createReport, setHeader, requireReport, reviewPhotos, recordItems, recordItem, inspectionChecklist, submitReport } = await import('../lib/laporan.ts');
const bytes = readFileSync('public/demo/apar-label.jpg');
const makePhoto = () => new File([bytes], 'photo.jpg', { type: 'image/jpeg' });
function request(photos: File[], text = '') { const form = new FormData(); form.set('text', text); photos.forEach(photo => form.append('file', photo)); return new Request('http://localhost/turn', { method: 'POST', body: form }); }
const inspection = { maxFiles: 5, imagesOnly: true };

test('five uploads keep distinct references beside each image and compact history retains every caption', async () => {
  const turn = await readTurn(request(Array.from({ length: 5 }, makePhoto)), inspection);
  assert.equal(turn.files.length, 5);
  assert.equal(new Set(turn.files.map(file => file.id)).size, 5);
  const content = turn.input.content;
  assert.ok(Array.isArray(content));
  assert.equal(content.length, 11);
  for (const [index, file] of turn.files.entries()) {
    assert.deepEqual(content[index * 2 + 1], { type: 'input_text', text: `Attachment ${index + 1}: [file ${file.id}]` });
    assert.equal(content[index * 2 + 2].type, 'input_image');
  }
  const draft = createReport();
  setHeader(draft.id, { petugas: 'QA', lokasi: 'Workshop', unit: 'QA-BATCH', rencana_id: 'RI-DT-UTYPE-01' });
  const report = requireReport(draft.id);
  report.messages.push({ id: 'upload', role: 'user', text: 'Photos', files: turn.files.map(file => ({ id: file.id })), created_at: report.started_at }); saveLaporan(report);
  reviewPhotos(draft.id, { reviews: turn.files.map((file, index) => ({ file_id: file.id, caption: `Visible component ${index + 1}`, item_ids: [`ITEM-${index + 3}`], usable: true })) });
  const history = JSON.stringify(compactHistory([turn.input]));
  assert.ok(!history.includes('base64'));
  for (const [index, file] of turn.files.entries()) assert.ok(history.includes(`${file.id}: Visible component ${index + 1}`));
});

test('batch validation rejects oversize, too many, non-image and malformed uploads before saving any file', async () => {
  const count = () => Number(database().prepare('SELECT count(*) AS n FROM files').get()!.n);
  const before = count();
  await assert.rejects(readTurn(request(Array.from({ length: 6 }, makePhoto)), inspection), /up to 5/);
  await assert.rejects(readTurn(request([makePhoto(), makePhoto()])), /up to 1/);
  await assert.rejects(readTurn(request([makePhoto(), new File(['%PDF-1.7 document'], 'file.pdf', { type: 'application/pdf' })]), inspection), /Attach photos/);
  await assert.rejects(readTurn(request([makePhoto(), new File(['not an image'], 'fake.jpg', { type: 'image/jpeg' })]), inspection), /valid JPEG/);
  await assert.rejects(readTurn(request([new File([new Uint8Array(301 * 1024)], 'large.jpg', { type: 'image/jpeg' })]), inspection), /300 KB/);
  assert.equal(count(), before);
  const legacy = await readTurn(request([makePhoto()], 'Single photo'));
  assert.equal(legacy.file!.id, legacy.files[0].id);
});

test('batch recording validates every mapping atomically, keeps missing checks pending and preserves STOP', async () => {
  const turn = await readTurn(request(Array.from({ length: 5 }, makePhoto)), inspection);
  const draft = createReport();
  setHeader(draft.id, { petugas: 'QA', lokasi: 'Workshop', unit: 'QA-BATCH', rencana_id: 'RI-DT-UTYPE-01' });
  let report = requireReport(draft.id);
  assert.equal(inspectionChecklist(report, 'overview').items.length, 8);
  report.messages.push({ id: 'photos', role: 'user', text: 'Checked photographed items', files: turn.files.map(file => ({ id: file.id })), created_at: report.started_at }); saveLaporan(report);
  const reviews = turn.files.map((file, index) => ({ file_id: file.id, caption: 'Fixture visual observation.', item_ids: [`ITEM-${index + 3}`], usable: true }));
  assert.throws(() => reviewPhotos(draft.id, { reviews: [{ ...reviews[0], file_id: 'FILE-APAR-LABEL' }] }), /attached/);
  assert.throws(() => reviewPhotos(draft.id, { reviews: [{ ...reviews[0], item_ids: ['UNKNOWN'] }] }), /inspection plan/);
  reviewPhotos(draft.id, { reviews });
  const findings = reviews.map((review, index) => ({ item_id: review.item_ids[0], status: index === 0 ? 'tidak_baik' as const : 'baik' as const, stop: index === 0, catatan: index === 0 ? 'Sidewall bulge. STOP.' : 'Direct checks normal, no visible defect.', bukti_ids: [review.file_id], alasan: null }));
  assert.throws(() => recordItems(draft.id, { findings: [findings[0], { ...findings[1], bukti_ids: [] }] }), /attach/);
  assert.equal(Object.keys(requireReport(draft.id).hasil).length, 0, 'One invalid finding rolls back the entire batch');
  assert.throws(() => recordItems(draft.id, { findings: [{ ...findings[0], bukti_ids: [reviews[1].file_id] }] }), /match/);
  assert.throws(() => recordItem(draft.id, { ...findings[0], bukti_ids: [reviews[1].file_id] }), /matched/);
  assert.throws(() => recordItems(draft.id, { findings: [findings[0], findings[0]] }), /only once/);
  const result = recordItems(draft.id, { findings });
  assert.equal(result.progress.done, 5); assert.equal(result.next!.id, 'ITEM-1');
  report = requireReport(draft.id);
  assert.equal(report.status, 'berjalan'); assert.equal(report.hasil['ITEM-3'].stop, true);
  assert.deepEqual(Object.keys(report.hasil).sort(), ['ITEM-3', 'ITEM-4', 'ITEM-5', 'ITEM-6', 'ITEM-7']);
  assert.throws(() => recordItems(draft.id, { findings: [{ ...findings[0], status: 'baik', stop: false }] }), /already recorded/);
  assert.throws(() => submitReport(draft.id), /Complete every/);
  const extra = await readTurn(request([makePhoto()]), inspection);
  report.messages.push({ id: 'cabin', role: 'user', text: '', files: [{ id: extra.file!.id }], created_at: report.started_at }); saveLaporan(report);
  reviewPhotos(draft.id, { reviews: [{ file_id: extra.file!.id, caption: 'Cabin; horn function cannot be seen.', item_ids: ['ITEM-1'], usable: true }] });
  const coverage = inspectionChecklist(requireReport(draft.id), 'progress');
  assert.equal(coverage.items[0].state, 'photo_received', 'A received photo does not imply a completed check');
  assert.equal(coverage.items[1].state, 'pending');
  reviewPhotos(draft.id, { reviews: [{ file_id: extra.file!.id, caption: 'Too blurry to assess.', item_ids: ['ITEM-1'], usable: false }] });
  assert.equal(inspectionChecklist(requireReport(draft.id), 'progress').items[0].state, 'pending');
  assert.throws(() => recordItems(draft.id, { findings: [{ ...findings[1], item_id: 'ITEM-1', bukti_ids: [extra.file!.id] }] }), /usable/);
});

test('changing an unstarted plan discards photo matches from the previous checklist', async () => {
  const draft = createReport();
  setHeader(draft.id, { petugas: 'QA', lokasi: 'Workshop', unit: 'QA-CHANGE', rencana_id: 'RI-DT-UTYPE-01' });
  const turn = await readTurn(request([makePhoto()]), inspection);
  const report = requireReport(draft.id);
  report.messages.push({ id: 'photo-before-switch', role: 'user', text: '', files: [{ id: turn.file!.id }], created_at: report.started_at }); saveLaporan(report);
  reviewPhotos(draft.id, { reviews: [{ file_id: turn.file!.id, caption: 'Cabin documentation.', item_ids: ['ITEM-1'], usable: true }] });
  saveRencana({ ...getRencana('RI-DT-UTYPE-01')!, id: 'OTHER-PLAN', judul: 'Another vehicle checklist' });
  setHeader(draft.id, { petugas: null, lokasi: null, unit: null, rencana_id: 'OTHER-PLAN' });
  assert.equal(requireReport(draft.id).photo_matches, undefined);
  assert.equal(inspectionChecklist(requireReport(draft.id), 'overview').items[0].state, 'pending');
});
