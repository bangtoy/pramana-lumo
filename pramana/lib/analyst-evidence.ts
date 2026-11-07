import { z } from 'zod';
import { AnswerChart, type ChatMessage } from './contracts.ts';
import { getLaporan, getWorkOrder } from './db.ts';
import { cariLaporan } from './dashboard.ts';
import { LaporanFilter } from './laporan-filter.ts';
import { unitCode } from './rules.ts';
import { dayKey, dayLabel } from './waktu.ts';

export const ChartRequest = z.object({
  view: z.enum(['bar', 'line', 'pie', 'table', 'kpi']).describe('Honor a requested format; otherwise bar for unit comparisons, line for daily trends. Pie shows shares, table exact values, kpi a compact numeric summary.'),
  dari: z.string().describe('Inclusive start date, YYYY-MM-DD in Jakarta.'),
  sampai: z.string().describe('Inclusive end date, YYYY-MM-DD in Jakarta; at most 31 days.'),
  group_by: z.enum(['unit', 'day']),
  hanya_stop: z.boolean(), unit: z.string().trim().max(120).nullable(),
});

/** Count ALL matching submitted reports, independent of the search tool's 15-row cap. */
export function reportChart(input: z.infer<typeof ChartRequest>) {
  const request = ChartRequest.parse(input);
  if (request.view === 'line' && request.group_by !== 'day') throw new RangeError('Line charts require grouping by day.');
  if (request.view === 'pie' && request.group_by !== 'unit') throw new RangeError('Pie charts require grouping by unit.');
  const filter = LaporanFilter.parse({ dari: request.dari, sampai: request.sampai, hanya_stop: request.hanya_stop, ...(request.unit ? { unit: request.unit } : {}) });
  const days = (Date.parse(request.sampai) - Date.parse(request.dari)) / 86_400_000 + 1;
  if (days > 31) throw new RangeError('Choose a chart period of at most 31 days.');
  const reports = cariLaporan(filter);
  const values = new Map<string, number>();
  if (request.group_by === 'day') for (let i = 0; i < days; i++) values.set(new Date(Date.parse(request.dari) + i * 86_400_000).toISOString().slice(0, 10), 0);
  for (const report of reports) {
    const label = request.group_by === 'unit' ? unitCode(report.unit) : dayKey(report.submitted_at || report.started_at);
    values.set(label, (values.get(label) || 0) + 1);
  }
  const rows = [...values].map(([label, value]) => ({ label, value }));
  rows.sort(request.group_by === 'day' ? (a, b) => a.label.localeCompare(b.label) : (a, b) => b.value - a.value || a.label.localeCompare(b.label));
  const limit = request.group_by === 'unit' ? 12 : 31;
  return {
    chart: AnswerChart.parse({ view: request.view, title: `${request.hanya_stop ? 'STOP reports' : 'Inspection reports'} by ${request.group_by}`, from: request.dari, to: request.sampai, group_by: request.group_by, only_stop: request.hanya_stop, unit: request.unit, rows: rows.slice(0, limit), total: reports.length, omitted_groups: Math.max(0, rows.length - limit) }),
    sumber: reports.slice(0, 30).map(report => report.id),
  };
}

/** Human labels are resolved from records, including for conversations saved before this UI. */
export function sourceDetails(ids: string[]): NonNullable<ChatMessage['source_details']> {
  return [...new Set(ids)].flatMap(id => {
    const report = id.startsWith('LI-') ? getLaporan(id) : null;
    if (report) return [{ id, label: `${unitCode(report.unit)} · ${dayLabel(dayKey(report.submitted_at || report.started_at))}` }];
    const order = id.startsWith('WO-') ? getWorkOrder(id) : null;
    return order ? [{ id, label: `${unitCode(order.unit)} · ${order.judul}` }] : [];
  });
}
