"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LaporanDetail } from "@/components/laporan/LaporanDetail";
export default function Page() { const { id } = useParams<{ id: string }>(); return <div className="p-5 space-y-5"><Link href="/petugas/riwayat" className="btn btn-secondary t-body"><ArrowLeft size={16}/>History</Link><LaporanDetail id={id} stacked/></div>; }
