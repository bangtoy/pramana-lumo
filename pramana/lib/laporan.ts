import { z } from "zod";
import { HasilItem, type LaporanInspeksi, type ChatMessage } from "./contracts.ts";
import { database, getFile, getLaporan, getRencana, listRencana, newId, now, saveLaporan, setFileCaption } from "./db.ts";
import { MAX_INSPECTION_PHOTOS } from './inspection-photos.ts';
import { evidenceProblem, headerMissing, itemsOf, nextItem, progress, stopSummary, verdict } from "./rules.ts";
import { fail } from "./http.ts";
export function requireReport(id: string) { const report = getLaporan(id); if (!report) fail('Inspection report not found.', 404); return report; }
export function publicReport(report: LaporanInspeksi) {
  const { agent_history: _history, ...visible } = report;
  // Plan selection is a complete database picker, not the agent's four suggested replies.
  // Enrich on read as well so existing drafts receive the full, current list on refresh.
  if (report.status !== 'berjalan' || headerMissing(report)[0] !== 'rencana_id' || report.messages.at(-1)?.role !== 'pramana') return visible;
  const plans = listRencana().filter(plan => !plan.diarsipkan && plan.items.length);
  const choices = plans.map(plan => ({ id: plan.id, title: plan.judul, vehicle: plan.tipe_kendaraan }));
  return { ...visible, messages: visible.messages.map((message, index) => index === visible.messages.length - 1 ? { ...message, quick_replies: [], plan_choices: choices } : message) };
}
export function openingMessage(): ChatMessage {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Jakarta' }).format(new Date()));
  return { id: newId('MSG'), role: 'pramana', text: `Good ${hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}! I'm Lumo, your daily inspection companion. Before we begin, what is your name?`, quick_replies: [], mood: 'netral', created_at: now() };
}
export function createReport() {
  const report: LaporanInspeksi = { id: newId('LI'), rencana_id: null, rencana_snapshot: null, petugas: null, lokasi: null, unit: null, status: 'berjalan', hasil: {}, messages: [openingMessage()], agent_history: [], started_at: now(), submitted_at: null };
  saveLaporan(report); return report;
}
function editable(id: string) { const report = requireReport(id); if (report.status !== 'berjalan') fail('This inspection has been submitted. Start a new inspection to record more findings.', 409); return report; }
export const HeaderInput = z.object({ petugas: z.string().trim().min(1).max(120).nullable(), lokasi: z.string().trim().min(1).max(200).nullable(), rencana_id: z.string().nullable(), unit: z.string().trim().min(1).max(120).nullable() }).strict();
export function setHeader(id: string, raw: z.infer<typeof HeaderInput>) {
  const input = HeaderInput.parse(raw), report = editable(id);
  if (input.rencana_id && input.rencana_id !== report.rencana_id) {
    if (Object.keys(report.hasil).length) fail('The inspection plan cannot change after findings have been recorded. Start a new inspection.');
    const plan = getRencana(input.rencana_id);
    if (!plan || plan.diarsipkan || !plan.items.length) fail('Choose an active inspection plan with inspection items.');
    report.rencana_id = plan.id; report.rencana_snapshot = structuredClone(plan); report.photo_matches = undefined;
  }
  for (const key of ['petugas', 'lokasi', 'unit'] as const) if (input[key]) report[key] = input[key];
  saveLaporan(report); return { missing: headerMissing(report), next: nextItem(report), progress: progress(report) };
}
export function selectInspectionPlan(id: string, planId: string) {
  const report = editable(id);
  if (headerMissing(report)[0] !== 'rencana_id') fail('Inspection plan selection is no longer pending. Refresh the conversation.', 409);
  setHeader(id, { petugas: null, lokasi: null, unit: null, rencana_id: z.string().trim().min(1).max(200).parse(planId) });
  return requireReport(id);
}
export function inspectionChecklist(report: LaporanInspeksi, kind: 'overview' | 'progress'): NonNullable<ChatMessage['inspection_checklist']> {
  const matched = new Set(Object.values(report.photo_matches || {}).filter(review => review.usable).flatMap(review => review.item_ids));
  return { kind, items: itemsOf(report).map(item => ({ id: item.id, name: item.nama, photo_required: item.bukti.some(evidence => evidence.jenis === 'foto' && evidence.wajib), state: report.hasil[item.id] ? 'recorded' : matched.has(item.id) ? 'photo_received' : 'pending', ...(report.hasil[item.id] ? { status: report.hasil[item.id].status, stop: report.hasil[item.id].stop } : {}) })) };
}
export const PhotoReviews = z.object({ reviews: z.array(z.object({ file_id: z.string(), caption: z.string().trim().min(1).max(2000), item_ids: z.array(z.string()).max(30), usable: z.boolean() }).strict()).min(1).max(MAX_INSPECTION_PHOTOS) }).strict();
export function reviewPhotos(id: string, raw: z.infer<typeof PhotoReviews>) {
  const { reviews } = PhotoReviews.parse(raw), report = editable(id);
  const attached = new Set(report.messages.filter(message => message.role === 'user').flatMap(message => message.files?.map(file => file.id) || []));
  const items = new Set(itemsOf(report).map(item => item.id));
  if (new Set(reviews.map(review => review.file_id)).size !== reviews.length) fail('Review each photo only once per batch.');
  for (const review of reviews) {
    if (!attached.has(review.file_id) || !getFile(review.file_id)?.mime.startsWith('image/')) fail('Use photos attached to this inspection.');
    if (review.item_ids.some(itemId => !items.has(itemId))) fail('Photo matches must belong to this inspection plan.');
  }
  const captions = new Map(reviews.map(review => [review.file_id, review.caption]));
  report.photo_matches = { ...report.photo_matches, ...Object.fromEntries(reviews.map(review => [review.file_id, { item_ids: [...new Set(review.item_ids)], usable: review.usable }])) };
  report.messages = report.messages.map(message => ({ ...message, files: message.files?.map(file => captions.has(file.id) ? { ...file, caption: captions.get(file.id) } : file) }));
  const db = database(); db.exec('BEGIN IMMEDIATE');
  try { for (const review of reviews) setFileCaption(review.file_id, review.caption); saveLaporan(report); db.exec('COMMIT'); }
  catch (error) { db.exec('ROLLBACK'); throw error; }
  return { reviewed: reviews.map(review => ({ file_id: review.file_id, item_ids: review.item_ids, usable: review.usable })), checklist: inspectionChecklist(report, 'progress'), missing: headerMissing(report) };
}
export const RecordInput = HasilItem.omit({ dicatat_at: true, ditangani: true }).extend({ item_id: z.string(), catatan: z.string().trim().min(1).max(4000), bukti_ids: z.string().array().max(12), alasan: z.string().nullable() }).strict();
export function recordItem(id: string, raw: z.infer<typeof RecordInput>) {
  const { item_id, ...input } = RecordInput.parse(raw), report = editable(id);
  if (headerMissing(report).length) fail('Complete the inspector, location, plan and unit before recording findings.');
  const item = itemsOf(report).find(i => i.id === item_id); if (!item) fail('This item is not part of the inspection snapshot.');
  const attached = new Set(report.messages.filter(m => m.role === 'user').flatMap(m => m.files?.map(f => f.id) || []));
  const files = [...new Set(input.bukti_ids)].map(fileId => {
    const file = getFile(fileId); if (!file || !attached.has(fileId) || !file.mime.startsWith('image/')) fail('Use photo evidence attached to this inspection.');
    const match = report.photo_matches?.[fileId];
    if (match && (!match.usable || !match.item_ids.includes(item_id))) fail('Use a reviewed, usable photo matched to this inspection item.');
    return file;
  });
  const error = evidenceProblem(item, input, files.map(f => f.id)); if (error) fail(error);
  const result = { ...input, bukti_ids: files.map(f => f.id), dicatat_at: now(), ditangani: false };
  report.hasil[item_id] = result; saveLaporan(report);
  return { recorded: item.nama, result, next: nextItem(report), progress: progress(report) };
}
export const BatchRecordInput = z.object({ findings: RecordInput.array().min(1).max(30) }).strict();
export function recordItems(id: string, raw: z.infer<typeof BatchRecordInput>) {
  const { findings } = BatchRecordInput.parse(raw), report = editable(id);
  if (new Set(findings.map(finding => finding.item_id)).size !== findings.length) fail('Record each inspection item only once per batch.');
  for (const finding of findings) {
    if (report.hasil[finding.item_id]) fail('This item is already recorded. Use an explicit individual correction instead.');
    for (const fileId of finding.bukti_ids) {
      const match = report.photo_matches?.[fileId];
      if (!match?.usable || !match.item_ids.includes(finding.item_id)) fail('Review and match usable photo evidence to this item before batch recording.');
    }
  }
  const db = database(); db.exec('BEGIN IMMEDIATE');
  try {
    const recorded = findings.map(finding => recordItem(id, finding));
    db.exec('COMMIT');
    const updated = requireReport(id);
    return { recorded, next: nextItem(updated), progress: progress(updated), checklist: inspectionChecklist(updated, 'progress') };
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
export function captionPhoto(id: string, fileId: string, caption: string) {
  const report = editable(id);
  if (!report.messages.some(m => m.role === 'user' && m.files?.some(f => f.id === fileId)) || !getFile(fileId)?.mime.startsWith('image/')) fail('Photo is not attached to this inspection.');
  setFileCaption(fileId, caption.slice(0, 2000));
  report.messages = report.messages.map(m => ({ ...m, files: m.files?.map(f => f.id === fileId ? { ...f, caption } : f) })); saveLaporan(report);
  return { saved: true };
}
export function submitReport(id: string) {
  const report = editable(id);
  if (headerMissing(report).length || !itemsOf(report).length) fail('Complete the inspection details before submitting.');
  if (nextItem(report)) fail(`Complete every inspection item before submitting. Next: ${nextItem(report)!.nama}.`);
  for (const item of itemsOf(report)) {
    const finding = report.hasil[item.id];
    const error = evidenceProblem(item, finding, finding.bukti_ids.filter(fileId => getFile(fileId)?.mime.startsWith('image/'))); if (error) fail(error);
  }
  report.status = 'terkirim'; report.submitted_at = now(); report.ringkasan = `${verdict(report)}.${stopSummary(report) ? ` ${stopSummary(report)}` : ''}`;
  saveLaporan(report); return { submitted: true, summary: report.ringkasan };
}
