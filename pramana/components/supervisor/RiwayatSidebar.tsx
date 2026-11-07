"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Archive, MoreHorizontal, Plus, Search } from "lucide-react";
import type { RencanaInspeksi } from "@/lib/contracts";
import { api, postJson, fmtRelative } from "@/lib/client";
import { ErrorState, Spinner } from "@/components/ui";

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
  return <section aria-label="Plan history" className="flex min-h-0 flex-1 flex-col gap-4">
    <button className="btn btn-primary t-body w-full" onClick={() => create.mutate()} disabled={create.isPending}><Plus size={16} aria-hidden="true"/>New plan</button>
    <label className="input flex items-center gap-2"><Search size={15} className="muted shrink-0" aria-hidden="true"/><input className="t-body bg-transparent min-w-0 w-full outline-none" aria-label="Search plans" placeholder="Search plans…" value={search} onChange={e => setSearch(e.target.value)}/></label>
    <p className="t-label muted">Plan history</p>
    {(plans.error || create.error || archive.error) && <ErrorState error={plans.error || create.error || archive.error!}/>}
    {plans.isLoading && <Spinner label="Loading plans…"/>}
    <div className="min-h-0 overflow-y-auto space-y-1">
      {!plans.isLoading && !plans.error && !shown.length && <p className="t-body-sm muted px-2">{search ? "No matching plans." : "Your plans will appear here."}</p>}
      {shown.map(plan => <div key={plan.id} className={`group flex items-start rounded-[7px] ${current === plan.id ? "bg-[var(--color-surface)] shadow-[var(--shadow-active)]" : "hover:bg-white/70"}`}>
        <Link href={`/supervisor/agent?rencana=${encodeURIComponent(plan.id)}`} className="min-w-0 flex-1 px-2 py-2" aria-current={current === plan.id ? "page" : undefined}>
          <p className="t-body truncate">{plan.judul}</p><p className="t-label muted font-normal mt-1">{plan.items.length} items · {fmtRelative(plan.updated_at || plan.created_at)}</p>
        </Link>
        <details className="relative shrink-0 mt-1 mr-1"><summary aria-label={`Actions for ${plan.judul}`} className="list-none cursor-pointer rounded-md p-1.5 muted hover:bg-[var(--color-surface-muted)]"><MoreHorizontal size={16}/></summary>
          <button className="panel floating pop-in absolute z-20 right-0 top-full flex items-center gap-2 p-2 t-body whitespace-nowrap" onClick={() => archive.mutate(plan.id)} disabled={archive.isPending}><Archive size={14} aria-hidden="true"/>Archive plan</button>
        </details>
      </div>)}
    </div>
    <Link href="/supervisor/rencana" className="t-body-sm muted mt-auto hover:text-[var(--color-primary)]">Manage inspection plans</Link>
  </section>;
}
