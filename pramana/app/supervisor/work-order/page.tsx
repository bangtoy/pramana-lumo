"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";
import type { WorkOrder } from "@/lib/contracts";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";
export default function Page() { const query = useQuery({ queryKey: ["work-orders"], queryFn: () => api<WorkOrder[]>("/api/work-order") }); return <div className="px-6 pt-5 pb-10 space-y-4"><p className="t-data muted">Dashboard</p><h1 className="t-display">Work orders</h1><p className="t-body muted">Follow up on inspection findings.</p>{query.isLoading ? <Spinner/> : query.error ? <ErrorState error={query.error}/> : query.data?.length ? <div className="panel divide-y divide-[var(--color-line)]">{query.data.map(w => <div key={w.id} className="p-4"><h2 className="t-heading">{w.judul}</h2><p className="t-body-sm muted">{w.tindakan}</p></div>)}</div> : <EmptyState pose="jempol" title="No work orders yet">Work orders created for inspection findings will appear here.</EmptyState>}</div>; }
