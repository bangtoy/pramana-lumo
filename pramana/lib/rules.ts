import type { HasilItem, ItemRencana, LaporanInspeksi } from "./contracts.ts";
export type ReportView = Omit<LaporanInspeksi, 'agent_history'>;

export const itemsOf = (report: ReportView) => [...(report.rencana_snapshot?.items || [])].sort((a, b) => a.urutan - b.urutan);
export const headerMissing = (report: ReportView) => (['petugas', 'lokasi', 'rencana_id', 'unit'] as const).filter(key => !report[key]?.trim());
export const nextItem = (report: ReportView) => headerMissing(report).length ? null : itemsOf(report).find(item => !report.hasil[item.id]) || null;
export function progress(report: ReportView) {
  const total = itemsOf(report).length, done = itemsOf(report).filter(i => !!report.hasil[i.id]).length;
  return { done, total, percent: total ? Math.round(done / total * 100) : 0 };
}
export function evidenceProblem(item: ItemRencana, result: HasilItem, photos: string[]) {
  const required = item.bukti.filter(b => b.jenis === 'foto' && b.wajib);
  if (required.length && new Set(photos).size < required.length) return `Please attach ${required.length} clear photo${required.length > 1 ? 's' : ''} for ${item.nama}: ${required.map(b => b.deskripsi).join(' ')}`;
  if (!result.catatan.trim()) return 'Describe what you checked and observed.';
  if (result.status === 'tidak_bisa_diperiksa' && !result.alasan?.trim()) return 'Explain why this item could not be inspected.';
  if (result.status === 'baik' && result.stop) return 'A satisfactory item cannot also be marked STOP.';
  return null;
}
export function counts(report: ReportView) {
  const result = { baik: 0, tidak_baik: 0, tidak_bisa_diperiksa: 0, stop: 0 };
  for (const item of itemsOf(report)) { const finding = report.hasil[item.id]; if (finding) { result[finding.status]++; if (finding.stop) result.stop++; } }
  return result;
}
export const unitCode = (unit: string | null) => unit?.split('·')[0].trim() || 'Unit';
export function verdict(report: ReportView) {
  const c = counts(report), code = unitCode(report.unit);
  return c.stop ? `${code} is not roadworthy` : c.tidak_baik || c.tidak_bisa_diperiksa ? `${code} is roadworthy with remarks` : `${code} is roadworthy`;
}
export const stopSummary = (report: ReportView) => itemsOf(report).filter(i => report.hasil[i.id]?.stop).map(i => `${i.nama}: ${report.hasil[i.id].catatan}`).join(' · ');
