"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, fmtDateTime } from "@/lib/client";
import { counts, unitCode, type ReportView } from "@/lib/rules";
import { EmptyState, ErrorState, ResultPills, Spinner, StopPill } from "@/components/ui";
export default function Page() {
  const query = useQuery({ queryKey: ['laporan', 'submitted'], queryFn: () => api<ReportView[]>('/api/laporan?status=terkirim') });
  return <div className="p-5 space-y-5"><header className="space-y-3"><h1 className="t-display">Inspection history</h1><p className="t-body muted">Vehicle checks and the evidence recorded with Lumo.</p><Link href="/petugas?baru=1" className="btn btn-primary">New inspection</Link></header>{query.isLoading ? <Spinner/> : query.error ? <ErrorState error={query.error}/> : !query.data?.length ? <EmptyState title="No inspections yet">Complete a P2H with Lumo to see it here.</EmptyState> : <div className="space-y-3">{[...query.data].sort((a, b) => (b.submitted_at || '').localeCompare(a.submitted_at || '')).map(report => <Link href={`/petugas/riwayat/${report.id}`} className="panel p-4 block space-y-3 hover:border-[var(--color-primary)]" key={report.id}><div className="flex gap-2 items-center justify-between"><h2 className="t-heading">{unitCode(report.unit)}</h2>{!!counts(report).stop && <StopPill/>}</div><p className="t-body-sm muted">{report.rencana_snapshot?.judul}</p><p className="t-data muted">{fmtDateTime(report.submitted_at!)} WIB</p><ResultPills counts={counts(report)}/></Link>)}</div>}</div>;
}
