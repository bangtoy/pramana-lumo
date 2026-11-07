"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PanelRightClose, PanelRightOpen, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/client';
import type { Ringkasan } from '@/lib/dashboard';
import { MascotAvatar, MascotHero } from '@/components/ui';

/** Layout and report shortcuts; cross-report conversations are the P3 feature. */
export function AssistantPanel() {
  const [open, setOpen] = useState(true);
  useEffect(() => { try { setOpen(localStorage.getItem('pramana.lumo.panel') !== 'collapsed'); } catch {} }, []);
  const query = useQuery({ queryKey: ['dashboard', 14], queryFn: () => api<Ringkasan>('/api/dashboard?hari=14'), refetchInterval: 10000 });
  function toggle() { setOpen(value => { try { localStorage.setItem('pramana.lumo.panel', value ? 'collapsed' : 'open'); } catch {} return !value; }); }
  return <aside id="supervisor-assistant-slot" aria-label="Lumo panel" data-open={open} className="max-lg:hidden shrink-0 border-l border-[var(--color-line)] flex flex-col bg-[var(--color-surface)]" style={{ width: open ? 360 : 48 }}>
    {open ? <><header className="h-[60px] shrink-0 px-4 flex items-center gap-2 border-b border-[var(--color-line)]"><MascotAvatar size={28}/><div className="flex-1"><h2 className="t-heading">Ask Lumo</h2><p className="t-label muted font-normal">Reports and work orders</p></div><button className="w-8 h-8 grid place-items-center rounded-md muted hover:bg-[var(--color-surface-muted)]" aria-label="Collapse Lumo panel" aria-expanded="true" onClick={toggle}><PanelRightClose size={16}/></button></header>
      <div className="p-4 space-y-5 overflow-y-auto"><div className="flex items-center gap-3"><MascotHero pose="berpikir" size={64}/><p className="t-body text-[var(--color-text-strong)]">Open a report and choose Ask Lumo beside a finding to discuss its evidence.</p></div>
        {query.data && <section className="rounded-[10px] bg-[var(--color-warning-subtle)] p-3 space-y-2"><h3 className="t-label text-[var(--color-warning)]">Today’s follow-up</h3><p className="t-body-sm text-[var(--color-text-strong)]">{query.data.kpi.stop} unit{query.data.kpi.stop === 1 ? '' : 's'} require a STOP decision. {query.data.kpi.stop_tanpa_wo} without work orders.</p><p className="t-body-sm text-[var(--color-text-strong)]">{query.data.kpi.wo_terlambat} overdue work orders. {query.data.kpi.belum_p2h} units await today’s inspection.</p></section>}
        <div className="space-y-2"><p className="t-label muted">Review the evidence</p><Link className="btn btn-secondary t-body w-full justify-between" href="/supervisor/laporan?stop=1">View STOP reports<ArrowRight size={14}/></Link><Link className="btn btn-secondary t-body w-full justify-between" href="/supervisor/work-order?filter=terlambat">View overdue work orders<ArrowRight size={14}/></Link></div>
      </div></> : <button className="flex-1 flex flex-col items-center gap-4 py-4 muted hover:bg-[var(--color-surface-muted)]" aria-label="Expand Lumo panel" aria-expanded="false" onClick={toggle}><MascotAvatar size={28}/><PanelRightOpen size={16}/><span className="t-body" style={{ writingMode: 'vertical-rl' }}>Ask Lumo</span></button>}
  </aside>;
}
