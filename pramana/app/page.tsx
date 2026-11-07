import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, ClipboardCheck, LayoutDashboard } from "lucide-react";

export default function Home() {
  return <main className="min-h-dvh bg-[var(--color-rail)] px-6 py-10 flex items-center justify-center">
    <div className="w-full max-w-2xl">
      <header className="mb-8 flex items-center gap-3">
        <Image src="/icon-lens-bot.svg" alt="" width={28} height={28} className="rounded-[7px] shadow-[var(--shadow-primary-rest)]" />
        <h1 className="t-title">Pramana</h1>
      </header>
      <p className="t-body muted mb-6 max-w-prose">Complete inspections, backed by evidence. Choose your role to get started with Lumo.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/supervisor" prefetch={false} className="panel p-6 group hover:border-[var(--color-primary)] transition-colors">
          <LayoutDashboard aria-hidden="true" size={24} strokeWidth={1.5} className="text-[var(--color-primary)] mb-6" />
          <h2 className="t-heading flex items-center gap-2">Continue as supervisor <ArrowUpRight aria-hidden="true" size={16} /></h2>
          <p className="t-body-sm muted mt-2">Build inspection plans and review fleet reports.</p>
        </Link>
        <Link href="/petugas" prefetch={false} className="panel p-6 group hover:border-[var(--color-primary)] transition-colors">
          <ClipboardCheck aria-hidden="true" size={24} strokeWidth={1.5} className="text-[var(--color-primary)] mb-6" />
          <h2 className="t-heading flex items-center gap-2">Continue as inspector <ArrowUpRight aria-hidden="true" size={16} /></h2>
          <p className="t-body-sm muted mt-2">Inspect your vehicle and submit evidence with Lumo.</p>
        </Link>
      </div>
      <p className="t-label muted mt-6">Site Tanjung Enim</p>
    </div>
  </main>;
}
