"use client";
import Link from 'next/link';
import { useId, useState } from 'react';
import type { AnswerChart as Chart } from '@/lib/contracts';
import { dayLabel } from '@/lib/waktu';
import { Select } from '@/components/ui/Select';

const palette = ['var(--color-chart-blue)', 'var(--color-chart-orange)', 'var(--color-chart-green)', 'var(--color-chart-red)', 'var(--color-chart-stop)', 'var(--color-on-surface-muted)'];
function reportsHref(chart: Chart, row?: Chart['rows'][number]) {
  const params = new URLSearchParams({ dari: chart.from, sampai: chart.to });
  if (chart.only_stop) params.set('stop', '1');
  if (chart.unit) params.set('unit', chart.unit);
  if (row && chart.group_by === 'unit') params.set('unit', row.label);
  if (row && chart.group_by === 'day') { params.set('dari', row.label); params.set('sampai', row.label); }
  return `/supervisor/laporan?${params}`;
}
const label = (chart: Chart, row: Chart['rows'][number]) => chart.group_by === 'day' ? dayLabel(row.label) : row.label;

export function AnswerChart({ chart }: { chart: Chart }) {
  const titleId = useId();
  const [view, setView] = useState(chart.view);
  const max = Math.max(1, ...chart.rows.map(row => row.value));
  const color = chart.only_stop ? 'var(--color-chart-red)' : 'var(--color-chart-blue)';
  const metric = chart.only_stop ? 'STOP reports' : 'reports';
  const dateRange = `${dayLabel(chart.from)}${chart.from.slice(0, 4) !== chart.to.slice(0, 4) ? ` ${chart.from.slice(0, 4)}` : ''} – ${dayLabel(chart.to)} ${chart.to.slice(0, 4)} · WIB`;
  const views: Chart['view'][] = ['bar', ...(chart.group_by === 'day' ? ['line' as const] : ['pie' as const]), 'table', 'kpi'];
  const points = chart.rows.map((row, index) => ({ row, x: 26 + index * 228 / Math.max(1, chart.rows.length - 1), y: 106 - row.value / max * 84 }));
  const pieRows = chart.rows.slice(0, chart.rows.length + chart.omitted_groups > 6 ? 5 : 6).map(row => ({ ...row, other: false }));
  const other = chart.total - pieRows.reduce((total, row) => total + row.value, 0);
  if (other > 0) pieRows.push({ label: 'Other units', value: other, other: true });
  let accumulated = 0;
  return <figure aria-labelledby={titleId} className="rounded-[10px] border border-[var(--color-line)] bg-[var(--color-surface)] p-3 space-y-3" data-answer-chart={view}>
    <figcaption><div className="flex flex-wrap items-center justify-between gap-2"><span id={titleId} className="t-body font-medium">{chart.title}</span><Select aria-label="Chart view" size="compact" className="max-w-full" value={view} onChange={value => setView(value as Chart['view'])} options={views.map(option => ({ value: option, label: ({ bar: 'Bar chart', line: 'Line chart', pie: 'Pie chart', table: 'Table', kpi: 'KPI' })[option] }))}/></div><p className="t-label muted font-normal mt-1">{dateRange}</p></figcaption>
    {!chart.total ? <p className="t-body-sm muted">No matching reports in this period.</p> : <>
      {view === 'bar' && <ul className="space-y-2.5" aria-label={chart.title}>{chart.rows.map(row => <li key={row.label}><Link href={reportsHref(chart, row)} aria-label={`Show ${row.value} ${metric} for ${label(chart, row)}`} className="block rounded-sm hover:text-[var(--color-primary)]"><span className="flex justify-between gap-2 t-body-sm mb-1"><span>{label(chart, row)}</span><span className="t-caption-data">{row.value}</span></span><span aria-hidden="true" className="block h-2 rounded-full bg-[var(--color-table-head)] overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${row.value / max * 100}%`, background: color }}/></span></Link></li>)}</ul>}
      {view === 'line' && <svg viewBox="0 0 280 132" role="img" aria-label={`${chart.title}. ${chart.rows.map(row => `${label(chart, row)}: ${row.value}`).join('; ')}`} className="w-full">
        {[0, max].map(value => <g key={value}><line x1="26" x2="254" y1={106 - value / max * 84} y2={106 - value / max * 84} stroke="var(--color-line)"/><text x="18" y={110 - value / max * 84} textAnchor="end" className="t-caption-data" fill="var(--color-on-surface-muted)">{value}</text></g>)}
        <polyline points={points.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke={color} strokeWidth="2"/>
        {points.map(({ row, x, y }) => <a key={row.label} href={reportsHref(chart, row)} aria-label={`${label(chart, row)}: ${row.value} ${metric}`}><circle cx={x} cy={y} r="4" fill={color}><title>{label(chart, row)}: {row.value} {metric}</title></circle></a>)}
        <text x="26" y="128" className="t-caption-data" fill="var(--color-on-surface-muted)">{dayLabel(chart.from)}</text><text x="254" y="128" textAnchor="end" className="t-caption-data" fill="var(--color-on-surface-muted)">{dayLabel(chart.to)}</text>
      </svg>}
      {view === 'pie' && <div className="space-y-3"><svg viewBox="0 0 120 120" className="w-36 h-36 mx-auto -rotate-90" role="img" aria-label={`Share of ${metric}. ${pieRows.map(row => `${row.label}: ${row.value}`).join('; ')}`}>{pieRows.map((row, index) => { const fraction = row.value / chart.total * 100, offset = accumulated; accumulated += fraction; return <circle key={row.label} cx="60" cy="60" r="42" pathLength="100" fill="none" stroke={palette[index]} strokeWidth="22" strokeDasharray={`${fraction} ${100 - fraction}`} strokeDashoffset={-offset}><title>{row.label}: {row.value} ({Math.round(fraction)}%)</title></circle>; })}</svg><ul className="space-y-1.5">{pieRows.map((row, index) => <li key={row.label} className="flex items-center gap-2 t-body-sm"><span aria-hidden="true" className="w-2 h-2 rounded-full shrink-0" style={{ background: palette[index] }}/>{row.other ? <span className="flex-1">{row.label}</span> : <Link href={reportsHref(chart, row)} className="flex-1 hover:underline">{row.label}</Link>}<span className="t-caption-data">{row.value} · {Math.round(row.value / chart.total * 100)}%</span></li>)}</ul></div>}
      {view === 'table' && <table className="w-full t-body-sm"><caption className="sr-only">{chart.title}, {dateRange}</caption><thead><tr className="t-label muted text-left"><th scope="col" className="font-medium pb-2">{chart.group_by === 'unit' ? 'Unit' : 'Day'}</th><th scope="col" className="font-medium text-right pb-2">{chart.only_stop ? 'STOP reports' : 'Reports'}</th></tr></thead><tbody>{chart.rows.map(row => <tr key={row.label} className="border-t border-[var(--color-line)]"><th scope="row" className="font-normal text-left py-2"><Link href={reportsHref(chart, row)} className="hover:underline">{label(chart, row)}</Link></th><td className="text-right t-caption-data py-2">{row.value}</td></tr>)}</tbody></table>}
      {view === 'kpi' && <dl className="grid grid-cols-2 gap-2"><div className="rounded-lg bg-[var(--color-table-head)] p-3"><dt className="t-label muted">{chart.only_stop ? 'STOP reports' : 'Reports'}</dt><dd className="t-metric mt-1" style={{ color }}>{chart.total}</dd></div><div className="rounded-lg bg-[var(--color-table-head)] p-3"><dt className="t-label muted">{chart.group_by === 'unit' ? 'Units' : 'Days with reports'}</dt><dd className="t-metric mt-1">{chart.rows.filter(row => row.value > 0).length + chart.omitted_groups}</dd></div></dl>}
    </>}
    <p className="t-label muted font-normal">{chart.total} {metric} in total. {chart.only_stop ? 'Historical reports, not current unit status.' : 'Counts reports, not individual findings.'}{chart.omitted_groups > 0 && ` Showing ${chart.rows.length} of ${chart.rows.length + chart.omitted_groups} groups.`}</p>
    <Link href={reportsHref(chart)} className="t-body-sm text-[var(--color-primary)] hover:underline">View matching reports →</Link>
  </figure>;
}
