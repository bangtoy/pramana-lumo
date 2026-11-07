"use client";
import { useState } from "react";
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, fmtDateTime, postJson } from "@/lib/client";
import { counts, itemsOf, verdict, type ReportView } from "@/lib/rules";
import type { StatusItem, WorkOrder } from "@/lib/contracts";
import { pendingWorkOrderFindings } from '@/lib/work-order-rules';
import { invalidateWorkOrderQueries } from '@/lib/work-order-client';
import { ErrorState, Legend, ResultPills, Spinner, StatusPill, StopPill } from "@/components/ui";
import { VehicleModel } from "@/components/vehicle-model/VehicleModel";
import { FindingActions } from './FindingActions';
import { ChevronDown, Download, Wrench } from 'lucide-react';
function EvidencePhoto({ id }: { id: string }) {
  const meta = useQuery({ queryKey: ['file', id], queryFn: () => api<{ caption: string | null; name: string }>(`/api/files/${id}/meta`) });
  const caption = meta.data?.caption || meta.data?.name || 'Inspection photo';
  return <figure className="min-w-0"><a href={`/api/files/${id}`} target="_blank" rel="noreferrer"><img src={`/api/files/${id}`} alt={caption} className="w-full aspect-[4/3] object-cover rounded-lg border border-[var(--color-line)]" loading="lazy"/></a><figcaption className="t-caption-data muted mt-1 break-words">{caption.length > 150 ? <details><summary className="cursor-pointer">{caption.slice(0, 120)}…</summary><p className="mt-2">{caption}</p></details> : caption}</figcaption></figure>;
}
export function VerdictStrip({ report }: { report: ReportView }) { const c = counts(report); return <div className={`panel p-4 flex flex-wrap gap-3 items-center ${c.stop ? '!border-[var(--color-stop-border)] !bg-[var(--color-status-tidak-baik-subtle)]' : ''}`}>{!!c.stop && <><StopPill/><span className="t-body text-[var(--color-status-tidak-baik)]">{c.stop} finding{c.stop > 1 ? 's' : ''} require the unit to stay out of service.</span></>}<ResultPills counts={c}/></div>; }
export function LaporanDetail({ id, stacked = false }: { id: string; stacked?: boolean }) {
  const cache = useQueryClient(), router = useRouter();
  const query = useQuery({ queryKey: ['laporan', id], queryFn: () => api<ReportView>(`/api/laporan/${id}`) });
  const orders = useQuery({ queryKey: ['work-order', 'report', id], queryFn: () => api<WorkOrder[]>(`/api/work-order?laporan_id=${encodeURIComponent(id)}`), enabled: !stacked, refetchInterval: 5000 });
  const create = useMutation({ mutationFn: () => postJson<WorkOrder[]>('/api/work-order', { laporan_id: id }), onSuccess: async () => { await invalidateWorkOrderQueries(cache); router.push(`/supervisor/work-order?laporan=${encodeURIComponent(id)}`); } });
  const [selected, setSelected] = useState<string | null>(null);
  if (query.isLoading) return <Spinner label="Loading inspection report…"/>;
  if (query.error || !query.data) return <ErrorState error={query.error || 'Report not found.'}/>;
  const report = query.data, items = itemsOf(report), c = counts(report);
  const pending = pendingWorkOrderFindings(report, orders.data || []).length;
  const createLabel = create.isPending ? 'Creating work orders…' : orders.isLoading ? 'Loading work orders…' : orders.error ? 'Work orders unavailable' : pending ? `Create work orders (${pending} finding${pending === 1 ? '' : 's'})` : orders.data?.length ? 'Work orders created' : 'No work orders needed';
  const findings = [...items].sort((a, b) => Number(!!report.hasil[b.id]?.stop) - Number(!!report.hasil[a.id]?.stop) || Number(report.hasil[b.id]?.status === 'tidak_baik') - Number(report.hasil[a.id]?.status === 'tidak_baik') || a.urutan - b.urutan);
  const statuses = Object.fromEntries(items.filter(i => i.comp_id && report.hasil[i.id]).map(i => [i.comp_id!, report.hasil[i.id].status])) as Record<string, StatusItem>;
  function pick(comp: string) { const item = items.find(i => i.comp_id === comp); if (item) { setSelected(item.id); document.getElementById(`finding-${item.id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }
  return <div className="space-y-5 @container">
    <header className="space-y-3"><div className="flex flex-wrap gap-3 items-start justify-between"><h1 className={`t-display ${c.stop ? 'text-[var(--color-status-tidak-baik)]' : ''}`}>{verdict(report)}</h1><div className="flex flex-wrap gap-2"><a className="btn btn-secondary t-body" href={`/api/laporan/${id}/pdf`} download><Download size={16}/>Download PDF</a>{!stacked && <button className="btn btn-primary t-body" disabled={create.isPending || orders.isLoading || !!orders.error || !pending} onClick={() => create.mutate()}><Wrench size={16}/>{createLabel}</button>}</div></div><div className="t-body-sm muted flex flex-wrap gap-x-4 gap-y-1"><span>{report.unit}</span><span>Inspector: {report.petugas}</span><span>{fmtDateTime(report.submitted_at || report.started_at)} WIB</span><span>{report.rencana_snapshot?.judul}</span></div></header>
    {!stacked && orders.error && <ErrorState error={orders.error}><button className="btn btn-secondary t-body self-start" onClick={() => void orders.refetch()}>Retry work orders</button></ErrorState>}
    {create.error && <ErrorState error={create.error}/>}
    <VerdictStrip report={report}/>
    <div className={`grid gap-5 ${stacked ? '' : '@4xl:grid-cols-[minmax(0,1fr)_420px]'}`}>
      <section className="min-w-0"><div className="panel p-3"><VehicleModel modelId={report.rencana_snapshot?.model_id || null} statuses={statuses} focus={items.find(i => i.id === selected)?.comp_id} onPick={pick} className={stacked ? 'h-56' : 'h-[min(60vh,580px)]'} tiltControl={!stacked}/></div><div className="mt-3"><Legend/></div></section>
      <section className="space-y-3 min-w-0" aria-label="Inspection findings"><h2 className="t-heading">Findings by item</h2>{findings.map(item => {
        const finding = report.hasil[item.id]; if (!finding) return null;
        const expanded = selected === item.id;
        return <article id={`finding-${item.id}`} key={item.id} className={`panel p-4 scroll-mt-4 ${expanded ? '!border-[var(--color-primary)]' : ''}`}>
          <button type="button" className="w-full text-left flex items-start justify-between gap-3" aria-expanded={expanded} aria-controls={`finding-detail-${item.id}`} onClick={() => setSelected(expanded ? null : item.id)}>
            <span className="min-w-0 flex-1"><span className="t-heading block">{item.nama}</span><span className="mt-2 flex flex-wrap items-center gap-2"><StatusPill status={finding.status}/>{finding.stop && <StopPill/>}{finding.ditangani && <span className="pill pill-baik t-label">Handled</span>}</span></span>
            <ChevronDown size={18} aria-hidden="true" className={`shrink-0 mt-1 muted transition-transform ${expanded ? 'rotate-180' : ''}`}/>
          </button>
          <div id={`finding-detail-${item.id}`} hidden={!expanded} className="space-y-3 border-t border-[var(--color-line)] mt-3 pt-3">{expanded && <><p className="t-body">{finding.catatan}</p>{finding.alasan && <p className="t-body-sm muted">Reason: {finding.alasan}</p>}<div className="grid grid-cols-2 gap-2">{finding.bukti_ids.map(fileId => <EvidencePhoto id={fileId} key={fileId}/>)}</div>{!stacked && <FindingActions report={report} itemId={item.id} order={orders.data?.find(w => w.item_id === item.id)}/>}</>}</div>
        </article>;
      })}</section>
    </div>
  </div>;
}
