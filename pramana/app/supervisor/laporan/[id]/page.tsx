"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LaporanDetail } from "@/components/laporan/LaporanDetail";
export default function Page() { const { id } = useParams<{ id: string }>(); return <div className="px-6 pt-5 pb-10 space-y-5"><p className="t-data muted break-words"><Link className="hover:underline" href="/supervisor/laporan">Inspection reports</Link> / {id}</p><LaporanDetail id={id}/></div>; }
