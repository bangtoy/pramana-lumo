"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";
import type { RencanaInspeksi } from "@/lib/contracts";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";
function ModelStatus({ id }: { id: string | null }) { const query = useQuery({ queryKey: ['model', id], queryFn: () => api<{ status: string }>(`/api/models/${id}`), enabled: !!id }); return <span className="t-body-sm muted">{!id ? 'Not linked' : query.isLoading ? 'Loading…' : query.error ? 'Unavailable' : query.data?.status === 'siap' ? 'Ready' : query.data?.status === 'proses' ? 'Generating' : 'Failed'}</span>; }
export default function Page() {
  const [archived, setArchived] = useState(false);
  const query = useQuery({ queryKey: ['rencana'], queryFn: () => api<RencanaInspeksi[]>('/api/rencana') });
  const plans = query.data?.filter(p => !!p.diarsipkan === archived && p.items.length) || [];
  return <div className="px-6 pt-5 pb-10 space-y-5"><header className="space-y-2"><p className="t-data muted">Dashboard</p><h1 className="t-display">Inspection plans</h1><p className="t-body muted">Build and maintain inspection plans with Lumo.</p></header><div className="flex justify-between gap-3"><div className="seg"><button aria-pressed={!archived} onClick={() => setArchived(false)}>Active</button><button aria-pressed={archived} onClick={() => setArchived(true)}>Archived</button></div><Link href="/supervisor/agent" className="btn btn-primary">New plan</Link></div>{query.isLoading ? <Spinner/> : query.error ? <ErrorState error={query.error}/> : !plans.length ? <EmptyState title={archived ? 'No archived plans' : 'Start an inspection plan'}>Open Agent to build or manage your inspection plans.</EmptyState> : <div className="panel overflow-x-auto"><table className="w-full min-w-[640px] text-left"><thead><tr>{['Plan', 'Vehicle type', 'Items', 'Model'].map(label => <th key={label} className="t-label muted font-normal px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-[var(--color-line)]">{plans.map(plan => <tr key={plan.id}><td className="p-4"><Link className="t-body text-[var(--color-primary)] hover:underline" href={`/supervisor/agent?rencana=${plan.id}`}>{plan.judul}</Link></td><td className="p-4 t-body">{plan.tipe_kendaraan}</td><td className="p-4 t-data">{plan.items.length}</td><td className="p-4"><ModelStatus id={plan.model_id}/></td></tr>)}</tbody></table></div>}</div>;
}
