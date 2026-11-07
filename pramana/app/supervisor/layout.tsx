"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChartNoAxesCombined, ClipboardList, FileCheck2, PanelLeftClose, PanelLeftOpen, Sparkles, Wrench, UserRound, Plus, LogOut } from "lucide-react";
import { RiwayatSidebar } from "@/components/supervisor/RiwayatSidebar";
import { Spinner } from "@/components/ui";
import { api } from "@/lib/client";
import type { WorkOrder } from "@/lib/contracts";

const menus = [
  { href: "/supervisor", label: "Summary", icon: ChartNoAxesCombined },
  { href: "/supervisor/laporan", label: "Inspection reports", icon: FileCheck2 },
  { href: "/supervisor/work-order", label: "Work orders", icon: Wrench },
  { href: "/supervisor/rencana", label: "Inspection plans", icon: ClipboardList },
];
export default function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(), agent = pathname.startsWith("/supervisor/agent");
  const [collapsed, setCollapsed] = useState(false);
  const workOrders = useQuery({ queryKey: ["work-orders"], queryFn: () => api<WorkOrder[]>("/api/work-order"), refetchInterval: 5000 });
  const open = workOrders.data?.filter(w => w.status === "terbuka").length;
  useEffect(() => {
    try { setCollapsed(localStorage.getItem("pramana.sidebar") === "collapsed"); } catch { /* Storage is optional. */ }
    function shortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") { event.preventDefault(); toggle(); }
    }
    window.addEventListener("keydown", shortcut); return () => window.removeEventListener("keydown", shortcut);
  }, []);
  function toggle() { setCollapsed(value => { const next = !value; try { localStorage.setItem("pramana.sidebar", next ? "collapsed" : "expanded"); } catch {} return next; }); }
  const labelClass = collapsed ? "hidden" : "max-md:hidden";
  return <div className="flex h-dvh overflow-hidden">
    <aside aria-label="Supervisor navigation" data-collapsed={collapsed} style={{ width: collapsed ? 64 : 240 }} className={`shrink-0 max-md:!w-[64px] bg-[var(--color-rail)] border-r border-[var(--color-line)] py-5 flex flex-col gap-6 ${collapsed ? "px-2" : "px-4 max-md:px-2"}`}>
      <Link href="/" className="flex items-center gap-2.5" aria-label="Pramana — choose role"><span className="t-body-sm font-medium grid place-items-center h-[28px] w-[28px] shrink-0 rounded-[7px] bg-[image:var(--gradient-primary)] text-[var(--color-on-primary)] shadow-[var(--shadow-primary-rest)]">P</span><span className={labelClass}><span className="t-heading block">Pramana</span><span className="t-label muted font-normal block">Site Tanjung Enim</span></span></Link>
      <nav aria-label="Workspace" className={`p-[3px] rounded-[10px] bg-[var(--color-seg-rail)] flex ${collapsed ? "flex-col" : "max-md:flex-col"}`}>
        {[{ href: "/supervisor/laporan", label: "Dashboard", active: !agent, Icon: ChartNoAxesCombined }, { href: "/supervisor/agent", label: "Agent", active: agent, Icon: Sparkles }].map(({ href, label, active, Icon }) => <Link key={label} href={href} aria-label={label} aria-current={active ? "page" : undefined} className={`t-body flex-1 flex justify-center items-center gap-2 rounded-[7px] px-2 py-1.5 ${active ? "bg-[var(--color-surface)] shadow-[var(--shadow-active)]" : "text-[var(--color-text-secondary)]"}`}><Icon size={16} strokeWidth={1.5} aria-hidden="true" className={collapsed ? "" : "md:hidden"}/><span className={labelClass}>{label}</span></Link>)}
      </nav>
      {agent ? <><div className={`${labelClass} flex-1 min-h-0 flex flex-col`}><Suspense fallback={<Spinner/>}><RiwayatSidebar/></Suspense></div><Link href="/supervisor/agent" aria-label="New plan" className={`btn btn-primary h-[36px] ${collapsed ? "flex" : "md:hidden"}`}><Plus size={16}/></Link></> : <nav aria-label="Dashboard pages" className="space-y-1">
        {menus.map(({ href, label, icon: Icon }) => { const active = pathname === href || (href !== "/supervisor" && pathname.startsWith(href + "/")); return <Link key={href} href={href} aria-label={label} aria-current={active ? "page" : undefined} title={collapsed ? label : undefined} className={`t-body h-[36px] px-2 rounded-[7px] flex items-center gap-2.5 ${active ? "bg-[var(--color-surface)] shadow-[var(--shadow-active)]" : "text-[var(--color-text-nav)] hover:bg-white/70"}`}><Icon size={16} strokeWidth={1.5} className="shrink-0" aria-hidden="true"/><span className={`${labelClass} truncate`}>{label}</span>{href.endsWith("work-order") && open !== undefined && <span className={`${labelClass} t-label ml-auto min-w-[22px] h-[22px] rounded-[5px] bg-[var(--color-surface)] text-[var(--color-status-tidak-baik)] shadow-[var(--shadow-hairline)] text-center pt-0.5`}>{open}</span>}</Link>; })}
      </nav>}
      <footer className="mt-auto space-y-3"><div className="flex gap-2 items-center px-1"><UserRound size={20} className="muted shrink-0" aria-hidden="true"/><span className={labelClass}><span className="t-body block">Rina</span><span className="t-label muted font-normal block">Supervisor</span></span></div><div className="flex justify-between"><button onClick={toggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title="Ctrl+B" className="w-8 h-8 rounded-md muted hover:bg-[var(--color-surface-muted)] grid place-items-center">{collapsed ? <PanelLeftOpen size={16}/> : <PanelLeftClose size={16}/>}</button><Link href="/" aria-label="Switch role" className={`${labelClass} w-8 h-8 rounded-md muted grid place-items-center hover:bg-[var(--color-surface-muted)]`}><LogOut size={16}/></Link></div></footer>
    </aside>
    <main id="supervisor-content" className="flex-1 min-w-0 h-dvh overflow-y-auto @container">{children}</main>
    <div id="supervisor-assistant-slot"/>
  </div>;
}
