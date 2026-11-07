"use client";
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, LoaderCircle } from 'lucide-react';
import { api, fmtDateTime, fmtTime } from '@/lib/client';
import type { Ringkasan } from '@/lib/dashboard';
import { EmptyState, ErrorState, Spinner, StopPill } from '@/components/ui';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { UnitTile } from '@/components/dashboard/UnitTile';
import { TrenChart } from '@/components/dashboard/TrenChart';

function Summary() {
  const params = useSearchParams();
  const status = ['stop', 'belum', 'layak'].includes(params.get('unit_status') || '') ? params.get('unit_status')! : '';
  const units = [...new Set(params.getAll('unit').map(unit => unit.trim().slice(0, 120)).filter(Boolean))].slice(0, 30);
  const selection = units.join('|');
  const [days, setDays] = useState(14);
  const query = useQuery({ queryKey: ['dashboard', days], queryFn: () => api<Ringkasan>(`/api/dashboard?hari=${days}`), refetchInterval: 10000, placeholderData: keepPreviousData });
  const data = query.data;
  const ready = !!data;
  const visibleUnits = (data?.units || []).filter(unit => (!status || unit.vonis === status) && (!units.length || units.some(code => code.toLowerCase() === unit.unit.toLowerCase())));
  useEffect(() => {
    if (!ready || (!status && !selection)) return;
    const frame = requestAnimationFrame(() => document.getElementById('units-today')?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [ready, status, selection]);
  const hour = data ? Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: 'numeric', hourCycle: 'h23' }).format(new Date(data.diperbarui_at))) : 8;
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const k = data?.kpi, todayReports = `/supervisor/laporan?dari=${data?.hari_ini}&sampai=${data?.hari_ini}`;
  return <div className="@container px-6 pt-5 pb-10 flex flex-col gap-4 max-w-[1280px]">
    <header className="flex flex-wrap justify-between items-center gap-3"><div className="space-y-2"><p className="t-data muted">Dashboard</p><h1 className="t-display">{greeting}, Rina</h1><p className="t-body muted">{k ? <>{k.unit_diperiksa} of {k.unit_total} units inspected today. {k.stop > 0 && <span className="text-[var(--color-status-tidak-baik)]">{k.stop} STOP units need a decision.</span>}</> : 'Daily vehicle condition and inspection follow-up.'}</p></div><button className="btn btn-secondary t-body-sm" aria-label="Refresh dashboard" onClick={() => void query.refetch()} disabled={query.isFetching}>{query.isFetching ? <LoaderCircle size={13} className="animate-spin"/> : <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-status-baik)]"/>}Live · {data ? fmtTime(data.diperbarui_at) : '—'}</button></header>
    {query.error && <ErrorState error={query.error}/>}
    {query.isLoading ? <Spinner label="Loading dashboard…"/> : !data ? null : !data.terbaru.length ? <EmptyState title="No inspections yet" pose="menyapa">Submitted inspections will show the fleet’s condition here.</EmptyState> : <>
      <section className="grid grid-cols-2 @3xl:grid-cols-4 gap-3.5" aria-label="Fleet summary">
        <KpiCard id="inspected" label="Units inspected" value={`${data.kpi.unit_diperiksa}/${data.kpi.unit_total}`} note={`${data.kpi.belum_p2h} not yet inspected`} noteColor="var(--color-warning)" color="var(--color-chart-blue)" bars={data.sparkline.laporan} href={todayReports}/>
        <KpiCard id="roadworthy" label="Roadworthy" value={data.kpi.layak} note={`${data.kpi.laporan_7h - data.kpi.stop_7h} roadworthy reports · 7 days`} noteColor="var(--color-status-baik)" color="var(--color-chart-green)" bars={data.sparkline.layak} href={todayReports}/>
        <KpiCard id="stop" label="Not roadworthy (STOP)" value={data.kpi.stop} note={`${data.kpi.stop_tanpa_wo} without work orders`} noteColor="var(--color-status-tidak-baik)" color="var(--color-chart-red)" bars={data.sparkline.stop} href="/supervisor/laporan?stop=1"/>
        <KpiCard id="work-orders" label="Open work orders" value={data.kpi.wo_terbuka} note={data.kpi.wo_terlambat ? `${data.kpi.wo_terlambat} overdue` : `${data.kpi.wo_tinggi} high priority`} noteColor={data.kpi.wo_terlambat ? 'var(--color-status-tidak-baik)' : 'var(--color-on-surface-muted)'} color="var(--color-chart-orange)" bars={data.sparkline.wo} href="/supervisor/work-order"/>
      </section>
      <div className="grid grid-cols-1 @4xl:grid-cols-[minmax(0,1fr)_300px] gap-3.5 items-start">
        <section id="units-today" className="panel p-4 @container/unit min-w-0 scroll-mt-4"><div className="flex flex-wrap justify-between gap-2 items-center mb-3"><h2 className="t-heading">Units today</h2><p className="t-body-sm muted">STOP → not inspected → roadworthy</p></div>{(status || units.length > 0) && <div className="mb-3 flex flex-wrap items-center gap-2 t-body-sm" data-unit-selection><span className="muted">{status === 'belum' ? 'Not inspected today' : status === 'stop' ? 'STOP units' : status === 'layak' ? 'Roadworthy units' : 'Selected units'}{units.length > 0 && (' · ' + units.join(', '))}</span><Link href="/supervisor#units-today" className="text-[var(--color-primary)] hover:underline">Show all units</Link></div>}{visibleUnits.length ? <div className="grid grid-cols-1 @lg/unit:grid-cols-2 @3xl/unit:grid-cols-3 gap-2.5">{visibleUnits.map((unit, index) => <UnitTile key={unit.unit} unit={unit} index={index}/>)}</div> : <p className="t-body muted">{status || units.length ? 'No units match this selection today.' : 'No unit has been inspected in the last 14 days.'}</p>}</section>
        <section className="panel p-4 space-y-3"><div><h2 className="t-heading">Needs action</h2><p className="t-body-sm muted mt-0.5">{data.kpi.stop} STOP · {data.kpi.belum_p2h} not inspected · {data.kpi.wo_terlambat} overdue</p></div>{data.units.some(u => u.vonis !== 'layak') ? <div className="space-y-2">{data.units.filter(u => u.vonis !== 'layak').map(unit => <Link key={unit.unit} href={`/supervisor/laporan/${unit.laporan_id}`} className={`flex gap-2 items-center rounded-[10px] border px-3 py-2 t-body-sm ${unit.vonis === 'stop' ? 'bg-[var(--color-status-tidak-baik-subtle)] border-[var(--color-stop-border)]' : 'border-[var(--color-line)]'}`}><span className={`shrink-0 w-1.5 h-1.5 rounded-full ${unit.vonis === 'stop' ? 'live-pulse bg-[var(--color-status-tidak-baik)]' : 'bg-[var(--color-border-strong)]'}`}/><span className="t-data shrink-0">{unit.unit}</span><span className="muted min-w-0 truncate" title={unit.catatan}>{unit.vonis === 'stop' ? unit.stop_tanpa_wo ? 'STOP · no WO yet' : 'STOP · WO created' : unit.catatan}</span><ArrowRight size={14} className="muted shrink-0 ml-auto"/></Link>)}</div> : <p className="rounded-lg p-3 t-body-sm bg-[var(--color-status-baik-subtle)] text-[var(--color-status-baik)]">No units are waiting for a decision.</p>}<Link className="t-body-sm text-[var(--color-primary)] inline-flex items-center gap-1" href="/supervisor/work-order?filter=terlambat">View overdue work orders<ArrowRight size={14}/></Link></section>
      </div>
      <div className="grid grid-cols-1 @4xl:grid-cols-[minmax(0,1fr)_300px] gap-3.5 items-start">
        <section className="panel p-4 min-w-0" aria-label="Inspection trend"><div className="flex flex-wrap justify-between gap-3 items-center mb-3"><div><h2 className="t-heading">P2H trend</h2><div className="flex flex-wrap items-center gap-3 t-body-sm muted mt-1"><span className="inline-flex gap-1 items-center"><span className="w-3 h-0.5 bg-[var(--color-chart-blue)]"/>Roadworthy</span><span className="inline-flex gap-1 items-center"><span className="w-3 h-0.5 bg-[var(--color-chart-stop)]"/>STOP</span><span>{data.hari} days{query.isPlaceholderData ? ' · Updating…' : ''}</span></div></div><div className="seg">{[7, 14].map(value => <button key={value} className="t-body" aria-pressed={days === value} disabled={query.isFetching} onClick={() => setDays(value)}>{value} days</button>)}</div></div><TrenChart data={data.tren}/></section>
        <section className="panel p-4"><h2 className="t-heading">Components with findings</h2><p className="t-body-sm muted mt-0.5">Not good findings · 14 days</p>{data.komponen.length ? <div className="space-y-4 mt-4">{data.komponen.map(component => <Link key={component.comp_id || component.nama} href={`/supervisor/laporan?item=${encodeURIComponent(component.nama)}`} className="block group" data-component={component.comp_id || component.nama}><div className="flex items-center gap-3"><span className="t-body truncate flex-1 group-hover:text-[var(--color-primary)]" title={component.nama}>{component.nama}</span><span className="t-data muted">{component.kali}×</span></div><div className="mt-2 h-1.5 rounded-full bg-[var(--color-track)] overflow-hidden"><div className="h-full rounded-full bg-[image:var(--gradient-komponen)]" style={{ width: `${component.kali / data.komponen[0].kali * 100}%` }}/></div>{component.berulang && <p className="t-label font-normal text-[var(--color-berulang)] mt-1.5">Recurring on {component.berulang.unit} · {component.berulang.kali}×</p>}</Link>)}</div> : <p className="t-body-sm muted mt-3">No defective components in this period.</p>}</section>
      </div>
      <section className="panel overflow-hidden"><header className="h-[52px] px-4 flex justify-between gap-2 items-center"><h2 className="t-heading">Latest reports</h2><Link className="t-body-sm text-[var(--color-primary)] inline-flex items-center gap-1" href="/supervisor/laporan">All reports<ArrowRight size={14}/></Link></header><div className="overflow-x-auto"><table className="w-full min-w-[660px] text-left"><thead><tr>{['Report', 'Unit', 'Inspector', 'Submitted'].map(label => <th key={label} scope="col" className="t-label muted font-normal px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-[var(--color-line)]">{data.terbaru.map(report => <tr key={report.id}><td className="px-4 py-3"><Link href={`/supervisor/laporan/${report.id}`} className="t-body inline-flex items-center gap-2">{report.stop ? <StopPill/> : <Check size={16} className="text-[var(--color-status-baik)]"/>}{report.judul}</Link></td><td className="t-data px-4 py-3">{report.unit}</td><td className="t-body muted px-4 py-3">{report.petugas}</td><td className="t-data muted px-4 py-3">{fmtDateTime(report.waktu)} WIB</td></tr>)}</tbody></table></div></section>
    </>}
  </div>;
}

export default function Page() { return <Suspense fallback={<Spinner label="Loading dashboard…"/>}><Summary/></Suspense>; }
