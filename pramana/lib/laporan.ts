import { z } from "zod";
import { HasilItem, type LaporanInspeksi, type ChatMessage } from "./contracts.ts";
import { getFile, getLaporan, getRencana, newId, now, saveLaporan, setFileCaption } from "./db.ts";
import { evidenceProblem, headerMissing, itemsOf, nextItem, progress, stopSummary, verdict } from "./rules.ts";
import { fail } from "./http.ts";
export function requireReport(id: string) { const report = getLaporan(id); if (!report) fail('Inspection report not found.', 404); return report; }
export function publicReport(report: LaporanInspeksi) { const { agent_history: _history, ...visible } = report; return visible; }
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
    report.rencana_id = plan.id; report.rencana_snapshot = structuredClone(plan);
  }
  for (const key of ['petugas', 'lokasi', 'unit'] as const) if (input[key]) report[key] = input[key];
  saveLaporan(report); return { missing: headerMissing(report), next: nextItem(report), progress: progress(report) };
}
export const RecordInput = HasilItem.omit({ dicatat_at: true, ditangani: true }).extend({ item_id: z.string(), catatan: z.string().trim().min(1).max(4000), bukti_ids: z.string().array().max(12), alasan: z.string().nullable() }).strict();
export function recordItem(id: string, raw: z.infer<typeof RecordInput>) {
  const { item_id, ...input } = RecordInput.parse(raw), report = editable(id);
  if (headerMissing(report).length) fail('Complete the inspector, location, plan and unit before recording findings.');
  const item = itemsOf(report).find(i => i.id === item_id); if (!item) fail('This item is not part of the inspection snapshot.');
  const attached = new Set(report.messages.filter(m => m.role === 'user').flatMap(m => m.files?.map(f => f.id) || []));
  const files = [...new Set(input.bukti_ids)].map(fileId => {
    const file = getFile(fileId); if (!file || !attached.has(fileId) || !file.mime.startsWith('image/')) fail('Use photo evidence attached to this inspection.'); return file;
  });
  const error = evidenceProblem(item, input, files.map(f => f.id)); if (error) fail(error);
  const result = { ...input, bukti_ids: files.map(f => f.id), dicatat_at: now(), ditangani: false };
  report.hasil[item_id] = result; saveLaporan(report);
  return { recorded: item.nama, result, next: nextItem(report), progress: progress(report) };
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
