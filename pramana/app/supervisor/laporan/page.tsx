"use client";
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { api, fmtDateTime } from '@/lib/client';
import { counts, unitCode, verdict, type ReportView } from '@/lib/rules';
import type { WorkOrder } from '@/lib/contracts';
import { REPORT_FILTER_KEYS } from '@/lib/laporan-filter';
import { reportWorkOrderSummary } from '@/lib/work-order-rules';
import { EmptyState, ErrorState, ResultPills, Spinner, StopPill } from '@/components/ui';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';

function WorkOrderSummary({ report, orders }: { report: ReportView; orders: WorkOrder[] }) {
  const summary = reportWorkOrderSummary(report, orders);
  if (summary.status === 'open') return <Link className="t-body text-[var(--color-primary)] hover:underline" href={`/supervisor/work-order?laporan=${encodeURIComponent(report.id)}`}>{summary.open} open</Link>;
  if (summary.status === 'pending') return <Link className="t-body text-[var(--color-warning)] hover:underline" href={`/supervisor/laporan/${report.id}`}>Not created</Link>;
  if (summary.status === 'completed') return <span className="t-body text-[var(--color-status-baik)]">Completed</span>;
  return <span className="t-body muted">—</span>;
}

function ReportList() {
  const router = useRouter(), pathname = usePathname(), searchParams = useSearchParams();
  const currentSearch = searchParams.toString(), pendingSearch = useRef(currentSearch);
  const unit = searchParams.get('unit') || '', inspector = searchParams.get('petugas') || '';
  const from = searchParams.get('dari') || '', to = searchParams.get('sampai') || '', item = searchParams.get('item') || '';
  const stop = searchParams.get('stop') === '1', openWO = searchParams.get('wo') === '1';
  const [unitDraft, setUnitDraft] = useState(unit);
  useEffect(() => { setUnitDraft(unit); }, [unit]);
  useEffect(() => { pendingSearch.current = currentSearch; }, [currentSearch]);
  const filters = new URLSearchParams();
  for (const key of REPORT_FILTER_KEYS) if (searchParams.get(key)) filters.set(key, searchParams.get(key)!);
  const filterSearch = filters.toString(), hasFilters = !!filterSearch;
  function updateFilters(patch: Partial<Record<typeof REPORT_FILTER_KEYS[number], string>>) {
    // Blur followed by a select/toggle must preserve both changes before navigation settles.
    const next = new URLSearchParams(pendingSearch.current);
    for (const [key, value] of Object.entries(patch)) value.trim() ? next.set(key, value.trim()) : next.delete(key);
    pendingSearch.current = next.toString();
    router.replace(`${pathname}${pendingSearch.current ? `?${pendingSearch.current}` : ''}`, { scroll: false });
  }
  function resetFilters() { setUnitDraft(''); updateFilters(Object.fromEntries(REPORT_FILTER_KEYS.map(key => [key, '']))); }
  const allReports = useQuery({ queryKey: ['laporan', 'submitted'], queryFn: () => api<ReportView[]>('/api/laporan?status=terkirim'), refetchInterval: 5000 });
  const filtered = useQuery({ queryKey: ['laporan', 'filtered', filterSearch], queryFn: () => api<ReportView[]>(`/api/laporan?status=terkirim&${filterSearch}`), enabled: hasFilters, refetchInterval: 5000, placeholderData: previous => previous ?? allReports.data });
  const query = hasFilters ? filtered : allReports;
  const orders = useQuery({ queryKey: ['work-order'], queryFn: () => api<WorkOrder[]>('/api/work-order'), refetchInterval: 5000 });
  const reports = query.data || [];
  const inspectors = [...new Set([...(allReports.data || []).map(report => report.petugas).filter((name): name is string => !!name), ...(inspector ? [inspector] : [])])].sort((a, b) => a.localeCompare(b));
  return <div className="px-6 pt-5 pb-10 space-y-5">
    <header className="space-y-2"><p className="t-data muted">Dashboard</p><h1 className="t-display">Inspection reports</h1><p className="t-body muted">Vehicle condition, findings and photo evidence in one place.</p></header>
    <div className="flex flex-wrap items-center gap-2" role="search" aria-label="Filter inspection reports">
      <label className="relative w-[180px] max-w-full"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 muted pointer-events-none" aria-hidden="true"/><input className="input t-body w-full pl-8" aria-label="Search unit" placeholder="Search unit…" value={unitDraft} maxLength={120} onChange={e => setUnitDraft(e.target.value)} onBlur={() => updateFilters({ unit: unitDraft })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); updateFilters({ unit: unitDraft }); } }}/></label>
      <Select className="w-[170px] max-w-full" aria-label="Inspector" value={inspector} onChange={value => updateFilters({ petugas: value })} options={[{ value: '', label: 'All inspectors' }, ...inspectors.map(name => ({ value: name, label: name }))]}/>
      <div className="flex flex-wrap items-center gap-2"><DatePicker className="w-[160px] max-w-full" aria-label="From date (WIB)" placeholder="From date" value={from} max={to || undefined} onChange={value => updateFilters({ dari: value })}/><span className="t-body-sm muted">to</span><DatePicker className="w-[160px] max-w-full" aria-label="To date (WIB)" placeholder="To date" value={to} min={from || undefined} onChange={value => updateFilters({ sampai: value })}/></div>
      <div className="seg"><button className="t-body" aria-pressed={stop} onClick={() => updateFilters({ stop: stop ? '' : '1' })}>Only STOP</button><button className="t-body" aria-pressed={openWO} onClick={() => updateFilters({ wo: openWO ? '' : '1' })}>Open WO</button></div>
      {item && <span className="inline-flex items-center gap-1 max-w-full px-2 py-1 rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-primary)] t-body-sm"><span className="truncate" title={item}>Component: {item}</span><button className="shrink-0 rounded-full p-1 hover:bg-[var(--color-surface)]" aria-label="Remove component filter" onClick={() => updateFilters({ item: '' })}><X size={13}/></button></span>}
      {hasFilters && <button className="px-2 py-1 t-body-sm muted hover:text-[var(--color-primary)]" onClick={resetFilters}>Reset filters</button>}
      <span className="t-body-sm muted tabular-nums ml-auto" role="status" data-report-count>{query.isLoading ? 'Loading reports…' : query.error ? 'Reports unavailable' : query.isPlaceholderData ? 'Updating reports…' : `${reports.length} report${reports.length === 1 ? '' : 's'}`}</span>
    </div>
    {hasFilters && allReports.error && <ErrorState error="Inspector options are unavailable."><button className="btn btn-secondary t-body self-start" onClick={() => void allReports.refetch()}>Retry inspectors</button></ErrorState>}
    {orders.error && <ErrorState error="Work order status is unavailable. Reports are still available."><button className="btn btn-secondary t-body self-start" onClick={() => void orders.refetch()}>Retry work orders</button></ErrorState>}
    {query.isLoading ? <Spinner label="Loading reports…"/> : query.error ? <ErrorState error={query.error}/> : !reports.length ? hasFilters ? <EmptyState title="No matching reports" pose="berpikir">Try broadening the filters above.</EmptyState> : <EmptyState title="No reports yet" pose="mencatat">Completed inspections will appear here, with STOP findings first.</EmptyState> : <div className="panel overflow-x-auto"><table className="w-full text-left min-w-[720px]"><thead><tr>{['Unit', 'Verdict', 'Results', 'WO', 'Inspector', 'Submitted'].map(label => <th scope="col" className="t-label muted font-normal px-4 py-3" key={label}>{label}</th>)}</tr></thead><tbody className="divide-y divide-[var(--color-line)]">{reports.map(report => <tr key={report.id} data-report={report.id}><td className="px-4 py-4 t-data"><Link className="text-[var(--color-primary)] underline-offset-4 hover:underline" href={`/supervisor/laporan/${report.id}`}>{unitCode(report.unit)}</Link></td><td className="px-4 py-4"><Link href={`/supervisor/laporan/${report.id}`} className={`t-body inline-flex items-center gap-2 ${counts(report).stop ? 'text-[var(--color-status-tidak-baik)]' : ''}`}>{!!counts(report).stop && <StopPill/>}{verdict(report).replace(`${unitCode(report.unit)} is `, '')}</Link></td><td className="px-4 py-4"><ResultPills counts={counts(report)}/></td><td className="px-4 py-4">{orders.isLoading || orders.error ? <span className="t-body-sm muted">{orders.error ? 'Unavailable' : 'Loading…'}</span> : <WorkOrderSummary report={report} orders={orders.data || []}/>}</td><td className="px-4 py-4 t-body">{report.petugas}</td><td className="px-4 py-4 t-data muted">{fmtDateTime(report.submitted_at || report.started_at)} WIB</td></tr>)}</tbody></table></div>}
  </div>;
}

export default function Page() { return <Suspense fallback={<Spinner label="Loading report filters…"/>}><ReportList/></Suspense>; }
