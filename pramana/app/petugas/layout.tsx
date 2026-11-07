"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Sparkles } from "lucide-react";
export default function InspectorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(), chat = pathname === "/petugas";
  return <div className="min-h-dvh bg-[var(--color-rail)]"><div className="max-w-[430px] mx-auto min-h-dvh bg-[var(--color-surface)] flex flex-col">
    <main className={`flex-1 min-w-0 ${chat ? "" : "pb-20"}`}>{children}</main>
    {!chat && <nav aria-label="Inspector navigation" className="fixed bottom-0 w-full max-w-[430px] bg-[var(--color-surface)] border-t border-[var(--color-line)] flex pb-[env(safe-area-inset-bottom)]">
      {[{ href: "/petugas", label: "Agent", Icon: Sparkles }, { href: "/petugas/riwayat", label: "History", Icon: History }].map(({ href, label, Icon }) => <Link key={href} href={href} aria-current={pathname.startsWith(href) && href !== "/petugas" ? "page" : undefined} className={`t-label flex flex-1 flex-col items-center gap-1 py-3 ${pathname.startsWith(href) && href !== "/petugas" ? "text-[var(--color-primary)]" : "muted"}`}><Icon size={20} strokeWidth={1.5} aria-hidden="true"/>{label}</Link>)}
    </nav>}
  </div></div>;
}
