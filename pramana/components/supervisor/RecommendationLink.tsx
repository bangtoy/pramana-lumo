import Link from 'next/link';
import { ArrowRight, MessageCircle } from 'lucide-react';
import type { RecommendationAction } from '@/lib/contracts';

export function RecommendationLink({ text, action, onAsk, onNavigate, disabled = false }: { text: string; action?: RecommendationAction; onAsk: (question: string) => void; onNavigate: () => void; disabled?: boolean }) {
  const target = action || { kind: 'ask', label: 'Discuss with Lumo', question: `Help me follow up on this recommendation: ${text}` };
  const className = 'group flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left t-body-sm text-[var(--color-text-strong)] hover:bg-[var(--color-accent-subtle)] disabled:opacity-50';
  const content = <><span className="flex-1 min-w-0"><span className="block break-words">{text}</span><span className="mt-1 block t-label font-normal text-[var(--color-primary)]">{target.label}</span></span>{target.kind === 'navigate' ? <ArrowRight size={15} aria-hidden="true" className="shrink-0 mt-0.5 text-[var(--color-primary)]"/> : <MessageCircle size={15} aria-hidden="true" className="shrink-0 mt-0.5 text-[var(--color-primary)]"/>}</>;
  return target.kind === 'navigate' ? <Link href={target.href} className={className} data-recommendation-action="navigate" onClick={event => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) onNavigate(); }}>{content}</Link> : <button type="button" className={className} data-recommendation-action="ask" disabled={disabled} onClick={() => onAsk(target.question)}>{content}</button>;
}
