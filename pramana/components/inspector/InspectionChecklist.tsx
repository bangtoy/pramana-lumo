import { Camera, CheckCircle2, ChevronDown, MessageCircle } from 'lucide-react';
import type { ChatMessage } from '@/lib/contracts';

export function InspectionChecklist({ checklist }: { checklist: NonNullable<ChatMessage['inspection_checklist']> }) {
  const overview = checklist.kind === 'overview';
  const recorded = checklist.items.filter(item => item.state === 'recorded').length;
  const received = checklist.items.filter(item => item.state === 'photo_received').length;
  const items = overview ? checklist.items : [...checklist.items].sort((a, b) => Number(a.state === 'recorded') - Number(b.state === 'recorded'));
  return <details open className="panel overflow-hidden bg-[var(--color-surface)]" data-inspection-checklist={checklist.kind}>
    <summary className="cursor-pointer list-none p-3 flex gap-2 items-start">
      <div className="min-w-0 flex-1"><h3 className="t-heading">{overview ? 'Your inspection checklist' : `${recorded}/${checklist.items.length} checks recorded`}</h3><p className="t-body-sm muted mt-1">{overview ? `${checklist.items.length} components to inspect` : `${received} with photos awaiting checks · ${checklist.items.length - recorded - received} still to cover`}</p></div>
      <ChevronDown size={18} strokeWidth={1.5} className="shrink-0 muted mt-1" aria-hidden="true"/>
    </summary>
    <ol className="max-h-64 overflow-y-auto overscroll-contain border-t border-[var(--color-line)] divide-y divide-[var(--color-line)]" aria-label="Inspection components">
      {items.map(item => <li key={item.id} className="px-3 py-2.5 flex items-start gap-2" data-checklist-item={item.id} data-state={item.state}>
        <span className="t-caption-data muted pt-1 shrink-0">{checklist.items.indexOf(item) + 1}.</span>
        <div className="flex-1 min-w-0"><p className="t-body-lg break-words">{item.name}</p><p className={`t-label font-normal mt-1 flex items-center gap-1.5 ${item.stop ? 'text-[var(--color-status-tidak-baik)]' : 'muted'}`}>
          {item.state === 'recorded' ? <CheckCircle2 size={14} aria-hidden="true"/> : item.state === 'photo_received' ? <MessageCircle size={14} aria-hidden="true"/> : <Camera size={14} aria-hidden="true"/>}
          {item.state === 'recorded' ? item.stop ? 'Recorded · STOP' : item.status === 'baik' ? 'Recorded · Good' : item.status === 'tidak_baik' ? 'Recorded · Finding' : 'Recorded · Unable to inspect' : item.state === 'photo_received' ? 'Photo saved · Checks pending' : item.photo_required ? 'Photo required' : 'Observation required'}
        </p></div>
      </li>)}
    </ol>
    {overview && <p className="t-body-sm muted p-3 border-t border-[var(--color-line)]">Send up to 5 photos at once, in any order. I’ll match them to this checklist and ask for anything still missing.</p>}
  </details>;
}
