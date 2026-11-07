"use client";
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/client';
import type { WorkOrder } from '@/lib/contracts';
import { jakartaDay } from '@/lib/waktu';
import { isWorkOrderOverdue, sortWorkOrders } from '@/lib/work-order-rules';
import { unitCode } from '@/lib/rules';
import { EmptyState, ErrorState, Spinner } from '@/components/ui';
import { WorkOrderRow } from '@/components/work-order/WorkOrderRow';
import { Select } from '@/components/ui/Select';

const filters = { terbuka: 'Open', terlambat: 'Overdue', selesai: 'Completed', semua: 'All' } as const;
type Filter = keyof typeof filters;
function WorkOrders() {
  const params = useSearchParams(), router = useRouter();
  const reportId = params.get('laporan'), selected = params.get('wo');
  const requested = params.get('filter');
  const filter: Filter = requested && Object.hasOwn(filters, requested) ? requested as Filter : reportId || selected ? 'semua' : 'terbuka';
  const priority = ['tinggi', 'sedang'].includes(params.get('prioritas') || '') ? params.get('prioritas')! : '';
  const units = [...new Set(params.getAll('unit').map(unit => unit.trim().slice(0, 120)).filter(Boolean))].slice(0, 30);
  const [today, setToday] = useState(jakartaDay());
  useEffect(() => { const timer = setInterval(() => setToday(jakartaDay()), 30000); return () => clearInterval(timer); }, []);
  const query = useQuery({
    queryKey: reportId ? ['work-order', 'report', reportId] : ['work-order'],
    queryFn: () => api<WorkOrder[]>(`/api/work-order${reportId ? `?laporan_id=${encodeURIComponent(reportId)}` : ''}`),
    refetchInterval: 5000,
  });
  const scoped = (query.data || []).filter(w => (!priority || w.prioritas === priority) && (!units.length || units.some(unit => unit.toLowerCase() === unitCode(w.unit).toLowerCase())));
  const totals = {
    terbuka: scoped.filter(w => w.status === 'terbuka').length,
    terlambat: scoped.filter(w => isWorkOrderOverdue(w, today)).length,
    selesai: scoped.filter(w => w.status === 'selesai').length,
    semua: scoped.length,
  };
  const visible = sortWorkOrders(scoped.filter(w => filter === 'semua' || (filter === 'terlambat' ? isWorkOrderOverdue(w, today) : w.status === filter)), today);
  function change(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    router.replace(`/supervisor/work-order?${next}`, { scroll: false });
  }
  return <div className="px-6 pt-5 pb-10 space-y-4">
    <header className="space-y-2"><p className="t-data muted">Dashboard</p><h1 className="t-display">Work orders</h1><p className="t-body muted max-w-prose">Repair instructions drafted from inspection findings. Completing a work order also marks its finding handled.</p></header>
    <div className="flex flex-wrap items-center gap-2">
      <div className="seg flex-wrap max-w-full" aria-label="Work order status">{(Object.keys(filters) as Filter[]).map(key => <button className="t-body" key={key} aria-pressed={filter === key} onClick={() => change('filter', key)}>{filters[key]} <span className="muted tabular-nums">{query.isLoading || query.error ? '—' : totals[key]}</span></button>)}</div>
      <Select className="w-[170px] max-w-full" aria-label="Priority" value={priority} onChange={value => change('prioritas', value)} options={[{ value: '', label: 'All priorities' }, { value: 'tinggi', label: 'High' }, { value: 'sedang', label: 'Medium' }]}/>
    </div>
    {reportId && <div className="flex flex-wrap items-center gap-2"><span className="pill pill-dugaan t-body-sm max-w-full !h-auto !whitespace-normal py-1 break-all">Report {reportId}</span><Link href="/supervisor/work-order?filter=semua" className="t-body-sm text-[var(--color-primary)] hover:underline">Show all</Link></div>}
    {!!units.length && <div className="flex flex-wrap items-center gap-2 t-body-sm" aria-label="Selected units"><span className="muted">Units: {units.join(', ')}</span><button className="text-[var(--color-primary)] hover:underline" onClick={() => change('unit', '')}>Show all units</button></div>}
    {query.isLoading ? <Spinner label="Loading work orders…"/> : query.error ? <ErrorState error={query.error}/> : !visible.length ? <EmptyState pose="jempol" title="No work orders in this view">Choose another filter or create work orders from an inspection report.</EmptyState> : <div className="panel overflow-x-auto" role="region" aria-label="Work orders table" tabIndex={0}>
      <table className="w-full min-w-[860px] table-fixed text-left"><colgroup><col className="w-[92px]"/><col/><col className="w-[150px]"/><col className="w-[160px]"/><col className="w-[150px]"/></colgroup><thead><tr>{['Priority', 'Work instruction', 'Mechanic', 'Target', 'Status'].map(label => <th key={label} scope="col" className={`t-label muted font-normal px-4 py-3 ${label === 'Status' ? 'text-right' : ''}`}>{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-[var(--color-line)]">{visible.map(order => <WorkOrderRow key={order.id} order={order} overdue={isWorkOrderOverdue(order, today)} highlighted={order.id === selected}/>)}</tbody>
      </table>
    </div>}
  </div>;
}
export default function Page() { return <Suspense fallback={<Spinner label="Loading work orders…"/>}><WorkOrders/></Suspense>; }
