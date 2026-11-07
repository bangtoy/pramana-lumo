import Image from "next/image";
import { LoaderCircle, Check, Ban, CircleHelp, AlertTriangle } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { Pill, StatusItem, ItemRencana } from "@/lib/contracts";

export const AGENT_NAME="Lumo";
export const STATUS_LABEL_EN:Record<StatusItem,string>={baik:"Good",tidak_baik:"Not good",tidak_bisa_diperiksa:"Unable to inspect"};
export const statusColor=(status:StatusItem)=>`var(--color-status-${status.replaceAll("_","-")})`;
const statusIcon={baik:Check,tidak_baik:Ban,tidak_bisa_diperiksa:CircleHelp};
export function StatusPill({status,label}:{status:StatusItem;label?:string}) {
  const Icon=statusIcon[status];
  return <span className={`pill t-body-sm gap-1 pill-${status.replaceAll("_","-")}`}><Icon size={13} strokeWidth={1.5} aria-hidden="true"/>{label||STATUS_LABEL_EN[status]}</span>;
}
export function StopPill() {return <span className="pill pill-stop t-label gap-1"><Ban size={12} aria-hidden="true"/>STOP</span>;}
export function StatusDot({status}:{status:StatusItem}) {return <span aria-label={STATUS_LABEL_EN[status]} className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{background:statusColor(status)}}/>;}
export function ResultPills({counts}:{counts:Partial<Record<StatusItem,number>>}) {return <span className="inline-flex flex-wrap gap-3">{(Object.keys(STATUS_LABEL_EN) as StatusItem[]).map(status=><span key={status} className="t-data inline-flex items-center gap-1.5" aria-label={`${counts[status]||0} ${STATUS_LABEL_EN[status]}`}><StatusDot status={status}/>{counts[status]||0}</span>)}</span>;}
export function ChatPill({pill}:{pill:Pill}) {
  if(pill.kind==="stop") return <StopPill/>;
  if(pill.kind in STATUS_LABEL_EN) return <StatusPill status={pill.kind as StatusItem} label={pill.label}/>;
  return <span className={`pill t-body-sm ${pill.kind==="dugaan"?"pill-dugaan":"pill-warning"}`}>{pill.label}</span>;
}
export function Legend() {return <div className="flex flex-wrap gap-4">{(Object.keys(STATUS_LABEL_EN) as StatusItem[]).map(status=><span className="t-body-sm muted flex items-center gap-1.5" key={status}><StatusDot status={status}/>{STATUS_LABEL_EN[status]}</span>)}</div>;}
export function ProgressSegments({items,active}:{items:(StatusItem|null)[];active?:number}) {
  const done=items.filter(Boolean).length;
  return <div role="progressbar" aria-label="Inspection progress" aria-valuemin={0} aria-valuemax={items.length||1} aria-valuenow={done} aria-valuetext={`${done} of ${items.length} items recorded`} className="flex gap-1 w-full">
    {items.map((status,i)=><span key={i} className={`flex-1 h-1 rounded-full ${i===active?"ring-1 ring-[var(--color-primary)] ring-offset-1":""}`} style={{background:status?statusColor(status):"var(--color-track)"}}/>)}</div>;
}
export function ProgressGauge({value,total}:{value:number;total:number}) {
  const completed=Math.max(0,Math.min(value,total)), ratio=total>0?completed/total:0;
  return <div className="relative w-16 h-16 grid place-items-center" role="progressbar" aria-label="Inspection progress" aria-valuemin={0} aria-valuemax={total||1} aria-valuenow={completed}>
    <svg viewBox="0 0 64 64" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden="true"><circle cx="32" cy="32" r="28" fill="none" stroke="var(--color-track)" strokeWidth="4"/><circle cx="32" cy="32" r="28" fill="none" stroke="var(--color-primary)" strokeWidth="4" strokeDasharray={`${ratio*176} 176`} strokeLinecap="round"/></svg>
    <span className="t-data">{completed}/{total}</span></div>;
}
type Pose="menyapa"|"mencatat"|"berpikir"|"serius"|"mengamati"|"jempol";
const poseLabel:Record<Pose,string>={menyapa:"waving",mencatat:"taking notes",berpikir:"thinking",serius:"looking attentive",mengamati:"examining evidence",jempol:"giving a thumbs up"};
export function MascotAvatar({mood="netral",size=32}:{mood?:"netral"|"serius";size?:number}) {
  return <span className="lumo-avatar shrink-0" style={{width:size,height:size}}><Image src={`/lumo/lumo-avatar-${mood}.png`} alt="Lumo" width={size*2} height={size*2} className="w-full h-full object-contain"/></span>;
}
export function MascotHero({pose="menyapa",size=96}:{pose?:Pose;size?:number}) {
  return <div className="lumo-hero shrink-0" style={{width:size*1.15,height:size*1.15}}><Image src={`/lumo/lumo-${pose}.png`} alt={`Lumo ${poseLabel[pose]}`} width={size*2} height={size*2} loading="eager" className="w-full h-full object-contain"/></div>;
}
export function TypingBubble({label="Lumo is reading…"}:{label?:string}) {return <div role="status" className="flex items-center gap-2"><MascotAvatar size={28}/><span className="bubble-pramana inline-flex items-center gap-1 p-3" aria-hidden="true">{[0,1,2].map(i=><span key={i} className="typing-dot h-1.5 w-1.5 rounded-full"/>)}</span><span className="t-body-sm muted">{label}</span></div>;}
export function SumberBadge({sumber}:{sumber:ItemRencana["sumber"]}) {
  const labels={spec:"Spec sheet",standar:"Standard",form_lama:"Existing form",manual:"Manual"};
  return <span className={`pill t-label pill-sumber-${sumber==="standar"?"standar":"spec"}`}>{labels[sumber]}</span>;
}
export function Spinner({label="Loading…"}:{label?:string}) {return <span role="status" className="inline-flex gap-2 items-center t-body-sm muted"><LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true"/>{label}</span>;}
export function EmptyState({pose="menyapa",title,children}:{pose?:Pose;title:string;children?:ReactNode}) {return <div className="panel p-8 flex flex-col items-center text-center gap-3"><MascotHero pose={pose} size={96}/><h2 className="t-heading">{title}</h2><div className="t-body muted max-w-prose">{children}</div></div>;}
export function ErrorState({error,children}:{error:Error|string;children?:ReactNode}) {return <div role="alert" className="panel p-4 flex flex-col gap-2" style={{borderColor:"var(--color-stop-border)"} as CSSProperties}><div className="flex gap-2 items-center t-body text-[var(--color-status-tidak-baik)]"><AlertTriangle size={16} aria-hidden="true"/>{typeof error==="string"?error:error.message}</div>{children}</div>;}
