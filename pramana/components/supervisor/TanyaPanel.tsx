"use client";
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lightbulb, MessageSquarePlus, PanelRightClose, PanelRightOpen, Send, Sparkles } from 'lucide-react';
import { api, postJson } from '@/lib/client';
import type { PublicPercakapan } from '@/lib/tanya';
import { AnalystAnswer } from './AnalystAnswer';
import { PanelResize, usePanelWidth } from './PanelResize';
import { ErrorState, MascotAvatar, MascotHero, Spinner, TypingBubble } from '@/components/ui';

const examples = ['Which units had STOP this week?', 'Why is DT-07 not roadworthy?', 'Which components fail most often?', 'Which work orders are still open?'];
const validId = (id: string | null): id is string => !!id && /^TL-[A-Za-z0-9-]{1,100}$/.test(id);
function remember(key: string, value: string | null) { try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch {} }

export function TanyaPanel() {
  const sizing = usePanelWidth();
  const cache = useQueryClient();
  const [open, setOpen] = useState(false), [hydrated, setHydrated] = useState(false);
  const [id, setId] = useState<string | null>(null), [text, setText] = useState('');
  const scroll = useRef<HTMLDivElement>(null), composer = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    let savedOpen: string | null = null, savedId: string | null = null;
    try { savedOpen = localStorage.getItem('pramana.tanya-open'); savedId = localStorage.getItem('pramana.tanya-id'); } catch {}
    setOpen(savedOpen === 'true' || (savedOpen !== 'false' && window.innerWidth >= 1360));
    if (validId(savedId)) setId(savedId); else if (savedId) remember('pramana.tanya-id', null);
    setHydrated(true);
    const show = (event: Event) => {
      setOpen(true); remember('pramana.tanya-open', 'true');
      const question = (event as CustomEvent<unknown>).detail;
      if (typeof question === 'string') setText(question.slice(0, 4000));
      requestAnimationFrame(() => composer.current?.focus());
    };
    window.addEventListener('pramana:ask-lumo', show);
    return () => window.removeEventListener('pramana:ask-lumo', show);
  }, []);
  const conversation = useQuery({
    queryKey: ['tanya', id], queryFn: () => api<PublicPercakapan>(`/api/tanya/${encodeURIComponent(id!)}`),
    enabled: hydrated && open && validId(id), staleTime: 30_000, retry: false,
  });
  const suggestions = useQuery({ queryKey: ['tanya', 'saran'], queryFn: () => api<{ rekomendasi: string[] }>('/api/tanya/saran'), enabled: hydrated && open, refetchInterval: 30_000, staleTime: 30_000, retry: false });
  const ask = useMutation({
    mutationFn: (input: { percakapan_id: string | null; text: string }) => postJson<PublicPercakapan>('/api/tanya', input),
    onSuccess: result => {
      // Fill the NEW key first. Refetching here would still use the previous ID.
      cache.setQueryData(['tanya', result.id], result);
      setId(result.id); remember('pramana.tanya-id', result.id);
    },
    onError: (_error, input) => setText(input.text),
  });
  const messages = conversation.data?.messages || [];
  useEffect(() => {
    if (!open) return;
    const element = scroll.current; if (!element) return;
    let cancelled = false, frame = 0, observer: ResizeObserver | undefined;
    const align = () => {
      if (cancelled) return;
      cancelAnimationFrame(frame); frame = requestAnimationFrame(() => {
      const answers = element.querySelectorAll<HTMLElement>('[data-analyst-message]'), last = answers.item(answers.length - 1);
      element.scrollTop = !ask.isPending && last ? element.scrollTop + last.getBoundingClientRect().top - element.getBoundingClientRect().top - 16 : element.scrollHeight;
      });
    };
    const stop = () => { cancelled = true; observer?.disconnect(); cancelAnimationFrame(frame); };
    // Styles/fonts can settle after hydration. Follow that layout until the reader interacts.
    void document.fonts.ready.then(() => {
      if (cancelled) return;
      observer = new ResizeObserver(align);
      if (element.firstElementChild) observer.observe(element.firstElementChild);
      align();
    });
    const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
    events.forEach(event => element.addEventListener(event, stop, { passive: true }));
    return () => { stop(); events.forEach(event => element.removeEventListener(event, stop)); };
  }, [open, id, messages.length, ask.isPending, conversation.error]);
  function toggle(next: boolean) { setOpen(next); remember('pramana.tanya-open', String(next)); }
  function send(question = text) {
    const value = question.trim();
    if (!hydrated || !value || ask.isPending || (id && (conversation.isLoading || conversation.isError))) return;
    setText(''); ask.mutate({ percakapan_id: id, text: value });
  }
  function newConversation() {
    if (ask.isPending) return;
    setId(null); setText(''); ask.reset(); remember('pramana.tanya-id', null);
    requestAnimationFrame(() => composer.current?.focus());
  }
  const waitingForConversation = !!id && conversation.isLoading;
  const disabled = !hydrated || ask.isPending || waitingForConversation || !!conversation.error;
  return <aside id="supervisor-assistant-slot" aria-label="Ask Lumo" data-open={open} data-ready={hydrated} style={{ width: open ? sizing.width : 48 }} className={`relative shrink-0 h-dvh border-l border-[var(--color-line)] flex flex-col ${open ? 'bg-[var(--color-surface)] max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-40 max-lg:max-w-full max-lg:shadow-[var(--shadow-overlay)]' : 'bg-[var(--color-rail)]'}`} onKeyDown={event => { if (event.key === 'Escape' && open) { event.preventDefault(); toggle(false); } }}>
    {open ? <>
      <PanelResize {...sizing}/>
      <header className="h-[60px] shrink-0 px-4 flex items-center gap-2 border-b border-[var(--color-line)]"><MascotAvatar size={30}/><div className="flex-1 min-w-0"><h2 className="t-heading leading-5">Ask Lumo</h2><p className="t-label muted font-normal truncate" title="Reports & work orders · read only">Reports & work orders · read only</p></div><button className="w-8 h-8 shrink-0 grid place-items-center rounded-md muted hover:bg-[var(--color-surface-muted)] disabled:opacity-50" aria-label="New conversation" title="New conversation" onClick={newConversation} disabled={ask.isPending}><MessageSquarePlus size={16}/></button><button className="w-8 h-8 shrink-0 grid place-items-center rounded-md muted hover:bg-[var(--color-surface-muted)]" aria-label="Collapse Lumo panel" aria-expanded="true" onClick={() => toggle(false)}><PanelRightClose size={16}/></button></header>
      <div ref={scroll} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 [overflow-anchor:none]" data-tanya-scroll>
        {waitingForConversation ? <Spinner label="Loading conversation…"/> : conversation.error ? <ErrorState error={conversation.error}><p className="t-body-sm muted">Retry, or start a new conversation using the header button.</p><button className="btn btn-secondary t-body-sm self-start" onClick={() => { if (validId(id)) void conversation.refetch(); }}>Retry conversation</button></ErrorState> : !messages.length && !ask.isPending ? <>
          <div className="flex items-center gap-3"><MascotHero pose="berpikir" size={64}/><p className="t-body text-[var(--color-text-strong)]">Ask about P2H reports and work orders. I’ll answer from the data and link the evidence.</p></div>
          <section className="rounded-[10px] bg-[var(--color-warning-subtle)] p-3 space-y-2"><h3 className="t-label text-[var(--color-warning)] flex items-center gap-1"><Lightbulb size={13} aria-hidden="true"/>Lumo’s suggestions today</h3>{suggestions.isLoading ? <Spinner label="Reading today’s data…"/> : suggestions.error ? <><p className="t-body-sm text-[var(--color-text-strong)]">Suggestions could not be loaded.</p><button className="btn btn-secondary t-body-sm" onClick={() => void suggestions.refetch()}>Retry suggestions</button></> : suggestions.data?.rekomendasi.length ? suggestions.data.rekomendasi.map((suggestion, index) => <p key={index} className="t-body-sm text-[var(--color-text-strong)]">{suggestion}</p>) : <p className="t-body-sm text-[var(--color-text-strong)]">No follow-up recommendations in the available data.</p>}</section>
          <section className="space-y-2"><h3 className="t-label muted">Example questions</h3>{examples.map(question => <button key={question} className="btn btn-secondary t-body w-full !justify-start text-left" onClick={() => send(question)} disabled={disabled}><Sparkles size={14} className="text-[var(--color-primary)] shrink-0"/>{question}</button>)}</section>
        </> : <div role="log" aria-label="Lumo conversation" aria-live="polite" className="space-y-3">
          {messages.map(message => message.role === 'user' ? <div key={message.id} className="flex justify-end"><p className="bubble-petugas t-body max-w-[88%] px-3 py-2.5 whitespace-pre-wrap break-words">{message.text}</p></div> : <AnalystAnswer key={message.id} message={message}/>)}
          {ask.isPending && <><div className="flex justify-end" data-pending-question><p className="bubble-petugas t-body max-w-[88%] px-3 py-2.5 whitespace-pre-wrap break-words">{ask.variables.text}</p></div><TypingBubble label="Reading the evidence…"/></>}
        </div>}
        {ask.error && <ErrorState error={ask.error}><p className="t-body-sm muted">Your question is restored below. Send it again to retry.</p></ErrorState>}
      </div>
      <form className="shrink-0 p-3 border-t border-[var(--color-line)] flex items-end gap-2" onSubmit={event => { event.preventDefault(); send(); }}><textarea ref={composer} className="input t-body min-w-0 flex-1 min-h-10 max-h-32 resize-y" aria-label="Question for Lumo" placeholder="Ask about units, findings, or WO…" rows={1} maxLength={4000} value={text} disabled={disabled} onChange={event => setText(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); } }}/><button className="btn btn-primary w-10 h-10 !p-0 shrink-0" aria-label="Send question" disabled={disabled || !text.trim()}><Send size={17}/></button></form>
    </> : <button className="flex-1 flex flex-col items-center gap-4 py-4 muted hover:bg-[var(--color-surface-muted)]" aria-label="Expand Lumo panel" aria-expanded="false" disabled={!hydrated} onClick={() => toggle(true)}><MascotAvatar size={32}/><PanelRightOpen size={16}/><span className="t-body rotate-180" style={{ writingMode: 'vertical-rl' }}>Ask Lumo</span></button>}
  </aside>;
}
