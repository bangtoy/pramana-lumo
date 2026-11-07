"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Sparkles } from 'lucide-react';
import { LaporanDetail } from "@/components/laporan/LaporanDetail";
export default function Page() { const { id } = useParams<{ id: string }>(); return <div className="px-6 pt-5 pb-10 space-y-5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="t-data muted break-words"><Link className="hover:underline" href="/supervisor/laporan">Inspection reports</Link> / {id}</p><button className="btn btn-secondary t-body-sm" aria-label="Ask Lumo about this report" onClick={() => window.dispatchEvent(new CustomEvent('pramana:ask-lumo', { detail: `Explain inspection report ${id}. What should I follow up?` }))}><Sparkles size={14}/>Ask Lumo</button></div><LaporanDetail id={id}/></div>; }
