"use client";
import { EmptyState } from "@/components/ui";
export default function Page() { return <div className="px-6 pt-5 pb-10 space-y-4"><p className="t-data muted">Dashboard</p><h1 className="t-display">Inspection reports</h1><p className="t-body muted">Vehicle condition, findings and photo evidence in one place.</p><EmptyState title="Evidence for every inspection" pose="mencatat">Submitted inspections bring the condition of each vehicle into focus.</EmptyState></div>; }
