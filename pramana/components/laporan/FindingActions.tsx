"use client";
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, MessageCircle, Send, X } from 'lucide-react';
import { postJson, postTurn } from '@/lib/client';
import type { ReportView } from '@/lib/rules';
import type { ChatMessage } from '@/lib/contracts';
import { ErrorState, MascotAvatar, TypingBubble } from '@/components/ui';
export function FindingActions({ report, itemId }: { report: ReportView; itemId: string }) {
  const cache = useQueryClient(), [open, setOpen] = useState(false), [text, setText] = useState(''), [status, setStatus] = useState('');
  const handled = report.hasil[itemId].ditangani;
  const patch = useMutation({ mutationFn: () => postJson<ReportView>(`/api/laporan/${report.id}`, { item_id: itemId, ditangani: !handled }, 'PATCH'), onSuccess: data => cache.setQueryData(['laporan', report.id], data) });
  const ask = useMutation({ mutationFn: () => postTurn<{ data: ReportView; messages: ChatMessage[] }>(`/api/laporan/${report.id}/tanya`, { item_id: itemId, text }, setStatus), onSuccess: reply => { cache.setQueryData(['laporan', report.id], reply.data); setText(''); }, onSettled: () => { void cache.invalidateQueries({ queryKey: ['laporan', report.id] }); } });
  const thread = report.tanya?.[itemId] || [];
  return <div className="space-y-3 border-t border-[var(--color-line)] pt-3">
    <div className="flex flex-wrap gap-2"><button className="btn btn-secondary t-body-sm" disabled={patch.isPending || ask.isPending} onClick={() => patch.mutate()}><Check size={14}/>{handled ? 'Mark unresolved' : 'Mark handled'}</button><button className="btn btn-secondary t-body-sm" aria-expanded={open} onClick={() => setOpen(!open)}><MessageCircle size={14}/>Ask Lumo</button></div>
    {patch.error && <ErrorState error={patch.error}/>}
    {open && <section className="panel p-3 space-y-3 bg-[var(--color-rail)]" aria-label="Ask Lumo about this finding"><header className="flex gap-2 items-center"><MascotAvatar size={24}/><h4 className="t-heading flex-1">Lumo</h4><button aria-label="Close finding conversation" onClick={() => setOpen(false)} className="p-1"><X size={16}/></button></header>{!thread.length && <p className="t-body-sm muted">Ask about this finding and its evidence.</p>}<div className="max-h-64 overflow-y-auto space-y-2" role="log">{thread.map(message => <p key={message.id} className={`t-body whitespace-pre-wrap break-words ${message.role === 'user' ? 'bubble-petugas' : 'bubble-pramana'}`}>{message.text}</p>)}</div>{ask.isPending && <TypingBubble label={status || 'Lumo is reading…'}/>} {ask.error && <ErrorState error={ask.error}/>}<form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (text.trim()) ask.mutate(); }}><input aria-label="Question about this finding" className="input t-body min-w-0 flex-1" value={text} onChange={e => setText(e.target.value)} disabled={ask.isPending} placeholder="What should I check next?" maxLength={4000}/><button aria-label="Send finding question" className="btn btn-primary p-2" disabled={ask.isPending || !text.trim()}><Send size={16}/></button></form></section>}
  </div>;
}
