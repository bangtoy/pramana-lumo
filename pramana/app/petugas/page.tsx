"use client";
import Link from "next/link";
import { MascotHero } from "@/components/ui";
export default function Page() { return <div className="p-5 space-y-4"><header className="flex justify-between items-center"><h1 className="t-heading">New P2H</h1><Link href="/petugas/riwayat" className="btn btn-secondary t-body">History</Link></header><div className="flex flex-col items-center py-8 gap-3"><MascotHero pose="menyapa"/><h2 className="t-heading">Lumo</h2><p className="t-body-lg muted text-center">Your P2H companion. Inspect each component and record its evidence.</p></div></div>; }
