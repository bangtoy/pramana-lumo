import { z } from 'zod';
import type { LaporanInspeksi, WorkOrder } from './contracts.ts';
import { counts, itemsOf } from './rules.ts';
import { dayKey } from './waktu.ts';

export const REPORT_FILTER_KEYS = ['unit', 'petugas', 'dari', 'sampai', 'stop', 'wo', 'item'] as const;
const CalendarDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.').refine(value => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Choose a valid calendar date.');
export const LaporanFilter = z.object({
  unit: z.string().trim().max(120).optional(),
  petugas: z.string().trim().max(120).optional(),
  dari: CalendarDay.optional(),
  sampai: CalendarDay.optional(),
  hanya_stop: z.boolean().optional(),
  wo_terbuka: z.boolean().optional(),
  item: z.string().trim().max(200).optional(),
}).strict().refine(filter => !filter.dari || !filter.sampai || filter.dari <= filter.sampai, {
  path: ['sampai'], message: 'The end date must be on or after the start date.',
});
export type LaporanFilter = z.infer<typeof LaporanFilter>;

export function parseLaporanFilter(params: URLSearchParams): LaporanFilter {
  const value = (key: string) => params.get(key)?.trim() || undefined;
  const flag = (key: string) => z.enum(['0', '1']).optional().parse(value(key)) === '1';
  return LaporanFilter.parse({
    unit: value('unit'), petugas: value('petugas'), dari: value('dari'), sampai: value('sampai'),
    hanya_stop: flag('stop'), wo_terbuka: flag('wo'), item: value('item'),
  });
}

/** Shared report search for the API, dashboard drill-downs and read-only agents. */
export function filterLaporan(reports: LaporanInspeksi[], orders: WorkOrder[], input: LaporanFilter = {}): LaporanInspeksi[] {
  const filter = LaporanFilter.parse(input);
  const normalize = (value: string | null | undefined) => (value || '').trim().toLowerCase();
  const openReports = new Set(orders.filter(order => order.status === 'terbuka').map(order => order.laporan_id));
  const matches = reports.filter(report => {
    if (report.status !== 'terkirim') return false;
    if (filter.unit && !normalize(report.unit).includes(normalize(filter.unit))) return false;
    if (filter.petugas && normalize(report.petugas) !== normalize(filter.petugas)) return false;
    if (filter.hanya_stop && !counts(report).stop) return false;
    if (filter.wo_terbuka && !openReports.has(report.id)) return false;
    if (filter.dari || filter.sampai) {
      const day = dayKey(report.submitted_at || report.started_at);
      if ((filter.dari && day < filter.dari) || (filter.sampai && day > filter.sampai)) return false;
    }
    if (filter.item && !itemsOf(report).some(item => report.hasil[item.id]?.status === 'tidak_baik' && (
      normalize(item.nama).includes(normalize(filter.item)) || normalize(item.comp_id).includes(normalize(filter.item))
    ))) return false;
    return true;
  });
  return matches.sort((a, b) => {
    const stopFirst = filter.dari || filter.sampai ? 0 : Number(!!counts(b).stop) - Number(!!counts(a).stop);
    return stopFirst || new Date(b.submitted_at || b.started_at).getTime() - new Date(a.submitted_at || a.started_at).getTime() || a.id.localeCompare(b.id);
  });
}
