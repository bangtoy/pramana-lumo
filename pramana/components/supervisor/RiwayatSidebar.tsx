"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useId, useRef, useState } from "react";
import { Archive, MoreHorizontal, Plus, Search } from "lucide-react";
import type { RencanaInspeksi } from "@/lib/contracts";
import { api, postJson, fmtRelative } from "@/lib/client";
import { ErrorState, Spinner } from "@/components/ui";
import { AnchoredPopover } from "@/components/ui/AnchoredPopover";
import "./planner-ui.css";

function HistoryEntry({ plan, active, archive, archiving }: { plan: RencanaInspeksi; active: boolean; archive: (id: string) => void; archiving: boolean }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const close = useCallback(() => setOpen(false), []);
  return <div role="listitem" className="planner-history-row" aria-current={active ? "true" : undefined}>
    <Link href={`/supervisor/agent?rencana=${encodeURIComponent(plan.id)}`} className="planner-history-link" aria-current={active ? "page" : undefined}>
      <p className="t-body planner-history-title" title={plan.judul}>{plan.judul}</p>
      <p className="t-label muted font-normal mt-1">{plan.items.length} items · {fmtRelative(plan.updated_at || plan.created_at)}</p>
    </Link>
    <button ref={trigger} type="button" aria-label={`Actions for ${plan.judul}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} className="planner-icon-button planner-history-actions" onClick={() => setOpen(!open)}><MoreHorizontal size={16} strokeWidth={1.5} aria-hidden="true"/></button>
    {open && <AnchoredPopover anchor={trigger} onClose={close} id={menuId} role="menu" align="end" className="planner-history-menu">
      <button type="button" role="menuitem" autoFocus className="t-body planner-archive-action" onClick={() => { archive(plan.id); close(); }} onBlur={close} disabled={archiving}><Archive size={14} strokeWidth={1.5} aria-hidden="true"/>Archive plan</button>
    </AnchoredPopover>}
  </div>;
}

export function RiwayatSidebar() {
  const current = useSearchParams().get("rencana");
  const router = useRouter(), cache = useQueryClient();
  const [search, setSearch] = useState("");
  const plans = useQuery({ queryKey: ["rencana"], queryFn: () => api<RencanaInspeksi[]>("/api/rencana") });
  const create = useMutation({ mutationFn: () => postJson<RencanaInspeksi>("/api/rencana", {}), onSuccess: async plan => {
    await cache.invalidateQueries({ queryKey: ["rencana"] });
    router.push(`/supervisor/agent?rencana=${encodeURIComponent(plan.id)}`);
  } });
  const archive = useMutation({ mutationFn: (id: string) => postJson(`/api/rencana/${encodeURIComponent(id)}`, { diarsipkan: true }, "PATCH"), onSuccess: async (_, id) => {
    await cache.invalidateQueries({ queryKey: ["rencana"] });
    if (id === current) router.push("/supervisor/agent");
  } });
  const shown = plans.data?.filter(p => !p.diarsipkan && (p.items.length || p.id === current) && p.judul.toLowerCase().includes(search.toLowerCase())) ?? [];
  return <section aria-label="Plan history" className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
    <button className="btn btn-primary t-body w-full shrink-0" onClick={() => create.mutate()} disabled={create.isPending}><Plus size={16} aria-hidden="true"/>New plan</button>
    <label className="input flex items-center gap-2 shrink-0"><Search size={15} className="muted shrink-0" aria-hidden="true"/><input className="t-body bg-transparent min-w-0 w-full outline-none" aria-label="Search plans" placeholder="Search plans…" value={search} onChange={e => setSearch(e.target.value)}/></label>
    <p className="t-label muted shrink-0">Plan history</p>
    {(plans.error || create.error || archive.error) && <ErrorState error={plans.error || create.error || archive.error!}/>}
    {plans.isLoading && <Spinner label="Loading plans…"/>}
    <div role="list" aria-label="Saved inspection plans" className="planner-history-list">
      {!plans.isLoading && !plans.error && !shown.length && <p className="t-body-sm muted px-2">{search ? "No matching plans." : "Your plans will appear here."}</p>}
      {shown.map(plan => <HistoryEntry key={plan.id} plan={plan} active={current === plan.id} archive={id => archive.mutate(id)} archiving={archive.isPending}/>)}
    </div>
    <Link href="/supervisor/rencana" className="t-body-sm muted shrink-0 hover:text-[var(--color-primary)]">Manage inspection plans</Link>
  </section>;
}
