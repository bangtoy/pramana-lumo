"use client";
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, Clock3, UserRound, Wrench } from 'lucide-react';
import { fmtTime, postJson } from '@/lib/client';
import type { RingkasanUnit } from '@/lib/dashboard';
import type { WorkOrder } from '@/lib/contracts';
import { invalidateWorkOrderQueries } from '@/lib/work-order-client';
import { ErrorState } from '@/components/ui';

export function UnitTile({ unit, index }: { unit: RingkasanUnit; index: number }) {
  const cache = useQueryClient();
  const create = useMutation({ mutationFn: () => postJson<WorkOrder[]>('/api/work-order', { laporan_id: unit.laporan_id }), onSuccess: () => invalidateWorkOrderQueries(cache) });
  const color = unit.vonis === 'stop' ? 'var(--color-status-tidak-baik)' : unit.vonis === 'layak' ? 'var(--color-status-baik)' : 'var(--color-border-strong)';
  return <article className="panel p-3 relative rise min-w-0" data-unit={unit.unit} style={{ animationDelay: `${index * 30}ms` }}>
    <span className="absolute left-0 top-3 w-0.5 h-7" style={{ background: color }}/>
    <div className="flex justify-between items-center gap-2"><h3 className="t-heading">{unit.unit}</h3><span className={`t-body-sm inline-flex items-center gap-1 ${unit.vonis === 'belum' ? 'muted' : unit.vonis === 'stop' ? 'text-[var(--color-status-tidak-baik)]' : 'text-[var(--color-status-baik)]'}`}>{unit.vonis === 'stop' ? <AlertTriangle size={13}/> : unit.vonis === 'layak' ? <Check size={13}/> : <Clock3 size={13}/>} {unit.vonis === 'stop' ? 'STOP' : unit.vonis === 'layak' ? 'Roadworthy' : 'Not yet inspected'}</span></div>
    <p className="t-caption-data muted mt-0.5">{unit.plat || 'Plate not recorded'}</p>
    <p className="t-body-sm muted line-clamp-2 min-h-9 mt-2" title={unit.catatan}>{unit.catatan}</p>
    <div className="flex items-center gap-3 mt-3 pt-2 border-t border-[var(--color-line)] t-body-sm muted">
      {unit.vonis === 'belum' ? <span>Awaiting inspection</span> : <><span className="flex min-w-0 items-center gap-1" title={unit.petugas || ''}><UserRound size={12} className="shrink-0"/><span className="truncate">{unit.petugas || 'Inspector'}</span></span><span className="inline-flex items-center gap-1 shrink-0"><Clock3 size={12}/>{fmtTime(unit.waktu)}</span></>}
      <span className="ml-auto inline-flex items-center gap-1 text-[var(--color-primary)] tabular-nums shrink-0" aria-label={`${unit.wo_terbuka} open work orders`}><Wrench size={13}/>{unit.wo_terbuka}</span>
    </div>
    <div className="mt-2 flex gap-2"><Link className="btn btn-secondary t-body-sm flex-1" href={`/supervisor/laporan/${unit.laporan_id}`}>Report</Link>{unit.stop_tanpa_wo && unit.temuan_tanpa_wo > 0 && <button className="btn btn-primary t-body-sm flex-1" onClick={() => create.mutate()} disabled={create.isPending}><Wrench size={14}/>{create.isPending ? 'Creating…' : 'Create WO'}</button>}</div>
    {create.error && <div className="mt-2"><ErrorState error={create.error}/></div>}
  </article>;
}
