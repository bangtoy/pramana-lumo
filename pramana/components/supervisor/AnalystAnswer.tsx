import Link from 'next/link';
import { ArrowUpRight, Lightbulb } from 'lucide-react';
import type { ChatMessage } from '@/lib/contracts';
import { answerBlocks, answerParts, sourceHref } from '@/lib/answer-format';
import { MascotAvatar } from '@/components/ui';
import { AnswerChart } from './AnswerChart';

function Inline({ text, sources }: { text: string; sources: string[] }) {
  return <>{answerParts(text, sources).map((part, index) => part.kind === 'source' ? <Link key={index} href={sourceHref(part.text)} title={part.text} aria-label={`Open source ${part.index + 1}: ${part.text}`} className="text-[var(--color-primary)] font-medium hover:underline">[{part.index + 1}]</Link> : part.kind === 'strong' ? <strong key={index} className="font-medium"><Inline text={part.text} sources={sources}/></strong> : part.text)}</>;
}

export function AnalystAnswer({ message }: { message: ChatMessage }) {
  const sources = [...new Set(message.sumber || [])].filter(id => /^(LI|WO)-/.test(id));
  return <div className="flex items-start gap-2" data-analyst-message={message.id} data-fallback={!!message.fallback}>
    <MascotAvatar size={28} mood={message.fallback ? 'serius' : 'netral'}/>
    <div className="flex-1 min-w-0 space-y-3">
      <div className="bubble-pramana t-body px-3 py-3 break-words space-y-3" data-answer-text>{answerBlocks(message.text).map((block, index) => block.kind === 'list' ? <ul key={index} className="list-disc pl-4 space-y-2">{block.items.map((item, i) => <li key={i}><Inline text={item} sources={sources}/></li>)}</ul> : <p key={index}><Inline text={block.text} sources={sources}/></p>)}</div>
      {message.chart && <AnswerChart chart={message.chart}/>}
      {!!sources.length && <details className="rounded-[10px] border border-[var(--color-line)] bg-[var(--color-surface)]" data-answer-sources><summary className="cursor-pointer px-3 py-2 t-label muted rounded-[10px]">Sources · {sources.length}</summary><ol className="px-3 pb-3 space-y-2" aria-label="Answer sources">{sources.map((id, index) => <li key={id}><Link href={sourceHref(id)} title={id} aria-label={`Open ${id.startsWith('LI-') ? 'report' : 'work order'} ${id}`} className="flex items-start gap-2 rounded t-body-sm hover:text-[var(--color-primary)]"><span className="t-caption-data muted pt-0.5">{index + 1}.</span><span className="min-w-0 flex-1"><span className="block break-words">{message.source_details?.find(source => source.id === id)?.label || (id.startsWith('LI-') ? `Inspection report ${index + 1}` : `Work order ${index + 1}`)}</span><span className="t-caption-data muted block truncate">{id}</span></span><ArrowUpRight size={13} aria-hidden="true" className="shrink-0 mt-1"/></Link></li>)}</ol></details>}
      {!!message.rekomendasi?.length && <section className="rounded-[10px] bg-[var(--color-table-head)] px-3 py-3"><h3 className="t-label muted flex items-center gap-1"><Lightbulb size={13} aria-hidden="true"/>Recommended next steps</h3><ul className="list-disc pl-4 space-y-2 mt-2 t-body-sm text-[var(--color-text-strong)]">{message.rekomendasi.map((text, index) => <li key={index}><Inline text={text} sources={sources}/></li>)}</ul></section>}
      {message.fallback && <p className="t-label muted font-normal">Data-based fallback · agent is currently unavailable</p>}
    </div>
  </div>;
}
