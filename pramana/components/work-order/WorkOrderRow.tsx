"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, RotateCcw } from 'lucide-react';
import type { WorkOrder } from '@/lib/contracts';
import { fmtDateTime, postJson } from '@/lib/client';
import { unitCode } from '@/lib/rules';
import { invalidateWorkOrderQueries } from '@/lib/work-order-client';
import { ErrorState, StopPill } from '@/components/ui';
import { DatePicker } from '@/components/ui/DatePicker';

type Patch = Partial<Pick<WorkOrder, 'status' | 'mekanik' | 'target' | 'catatan_selesai'>>;
export function WorkOrderRow({ order, overdue, highlighted }: { order: WorkOrder; overdue: boolean; highlighted: boolean }) {
  const cache = useQueryClient();
  const [mechanic, setMechanic] = useState(order.mekanik || '');
  const [completing, setCompleting] = useState(false), [note, setNote] = useState('');
  const completed = order.status === 'selesai';
  useEffect(() => setMechanic(order.mekanik || ''), [order.mekanik]);
  const mutation = useMutation({
    mutationFn: (patch: Patch) => postJson<WorkOrder>(`/api/work-order/${order.id}`, patch, 'PATCH'),
    onSuccess: async () => { setCompleting(false); setNote(''); await invalidateWorkOrderQueries(cache); },
  });
  const disabled = completed || mutation.isPending;
  const inputClass = 't-body w-full min-w-0 bg-transparent rounded-md py-1 border border-transparent hover:border-[var(--color-line)] focus:border-[var(--color-accent)] focus:shadow-[var(--ring-focus)] disabled:cursor-default';
  return <>
    <tr data-work-order={order.id} aria-busy={mutation.isPending} className={`${completed ? 'opacity-60' : ''} ${highlighted ? '!bg-[var(--color-accent-subtle)]' : ''}`}>
      <td className="px-4 py-3 align-top">{order.prioritas === 'tinggi' ? <StopPill/> : <span className="pill pill-warning t-body-sm">Medium</span>}</td>
      <td className="px-4 py-3 align-top space-y-1"><div className="flex items-baseline gap-2"><span className="t-data shrink-0">{unitCode(order.unit)}</span><p className="t-body break-words">{order.judul}</p></div><p className="t-body-sm muted max-w-prose break-words">{order.tindakan}</p><p className="t-caption-data muted break-words">{order.id} · <Link className="hover:underline text-[var(--color-primary)]" href={`/supervisor/laporan/${order.laporan_id}`}>{order.laporan_id}</Link> · Created {fmtDateTime(order.created_at)} WIB</p>{completed && order.catatan_selesai && <p className="t-body-sm text-[var(--color-status-baik)] break-words">{order.catatan_selesai}</p>}</td>
      <td className="px-4 py-3 align-top"><input aria-label={`Mechanic for ${order.judul}`} placeholder="Unassigned" maxLength={120} className={inputClass} disabled={disabled} value={mechanic} onChange={e => setMechanic(e.target.value)} onBlur={() => { if (mechanic.trim() !== (order.mekanik || '')) mutation.mutate({ mekanik: mechanic.trim() || null }); }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}/></td>
      <td className="px-4 py-3 align-top"><DatePicker aria-label={`Target for ${order.judul}`} className="w-full" placeholder="Set target" disabled={disabled} value={order.target || ''} onChange={value => mutation.mutate({ target: value || null })}/>{overdue && <span className="pill pill-warning t-body-sm mt-1">Overdue</span>}</td>
      <td className="px-3 py-3 align-top text-right"><div className="flex flex-col gap-2 items-end">{completed && <span className="pill pill-baik t-body-sm">Completed</span>}<button className="btn btn-secondary t-body-sm" disabled={mutation.isPending || completing} onClick={() => completed ? mutation.mutate({ status: 'terbuka' }) : setCompleting(true)}>{completed ? <RotateCcw size={14}/> : <Check size={14}/>} {completed ? 'Reopen' : 'Mark complete'}</button></div></td>
    </tr>
    {completing && !completed && <tr><td colSpan={5} className="px-4 py-3"><form className="pop-in flex flex-wrap items-end gap-2" aria-label={`Complete ${order.judul}`} onSubmit={e => { e.preventDefault(); mutation.mutate({ status: 'selesai', catatan_selesai: note.trim() || null }); }} onKeyDown={e => { if (e.key === 'Escape' && !mutation.isPending) { setCompleting(false); setNote(''); } }}><label className="flex-1 min-w-[240px] space-y-1"><span className="t-label muted block">Completion note (optional)</span><input autoFocus className="input t-body w-full" placeholder="What was repaired and checked?" maxLength={2000} value={note} onChange={e => setNote(e.target.value)} disabled={mutation.isPending}/></label><button className="btn btn-primary t-body" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save'}</button><button type="button" className="btn btn-secondary t-body" disabled={mutation.isPending} onClick={() => { setCompleting(false); setNote(''); }}>Cancel</button></form></td></tr>}
    {mutation.error && <tr><td colSpan={5} className="px-4 py-3"><ErrorState error={mutation.error}/></td></tr>}
  </>;
}
