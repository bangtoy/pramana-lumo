"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";
import type { RencanaInspeksi } from "@/lib/contracts";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";
export default function Page() { const query = useQuery({ queryKey: ["rencana"], queryFn: () => api<RencanaInspeksi[]>("/api/rencana") }); return <div className="px-6 pt-5 pb-10 space-y-4"><p className="t-data muted">Dashboard</p><h1 className="t-display">Inspection plans</h1><p className="t-body muted">Build and maintain inspection plans with Lumo.</p>{query.isLoading ? <Spinner/> : query.error ? <ErrorState error={query.error}/> : query.data?.some(p => !p.diarsipkan && p.items.length) ? <div className="panel divide-y divide-[var(--color-line)]">{query.data.filter(p => !p.diarsipkan && p.items.length).map(p => <Link key={p.id} href={`/supervisor/agent?rencana=${encodeURIComponent(p.id)}`} className="block p-4 hover:bg-[var(--color-surface-muted)]"><h2 className="t-heading">{p.judul}</h2><p className="t-body-sm muted">{p.tipe_kendaraan} · {p.items.length} items</p></Link>)}</div> : <EmptyState title="Start an inspection plan">Open Agent to build a plan for your vehicle.</EmptyState>}</div>; }
