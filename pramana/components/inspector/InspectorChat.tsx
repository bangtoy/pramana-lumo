"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Camera, Check, ChevronDown, ChevronUp, Paperclip, Plus, RotateCcw, Send } from "lucide-react";
import { api, compressImage, fmtDate, postJson, postTurn } from "@/lib/client";
import { counts, itemsOf, nextItem, progress, unitCode, verdict, type ReportView } from "@/lib/rules";
import type { ChatMessage, StatusItem, TurnResponse } from "@/lib/contracts";
import { ChatPill, ErrorState, MascotAvatar, MascotHero, ProgressSegments, ResultPills, Spinner, TypingBubble } from "@/components/ui";
import { VehicleModel } from "@/components/vehicle-model/VehicleModel";
import { InspectionPlanSelect } from "./InspectionPlanSelect";
import { LocalPlannerAttachment } from "@/components/supervisor/PlannerAttachment";
import "./inspector-chat.css";
type InspectorMessage = ChatMessage & { pendingFile?: File };
const draftKey = 'pramana.inspection-draft';
const iconButton = 'btn btn-secondary w-11 h-11 p-0 shrink-0';
export function InspectorChat() {
  const search = useSearchParams(), router = useRouter(), booted = useRef(false);
  const [id, setId] = useState<string | null>(null), [error, setError] = useState<Error | null>(null);
  async function create() {
    setError(null);
    try { const report = await postJson<ReportView>('/api/laporan', {}); try { localStorage.setItem(draftKey, report.id); } catch {} setId(report.id); router.replace(`/petugas?laporan=${report.id}`); }
    catch (e) { setError(e as Error); }
  }
  useEffect(() => {
    if (booted.current) return; booted.current = true;
    let saved: string | null = null; try { saved = localStorage.getItem(draftKey); } catch {}
    const selected = search.get('laporan') || saved;
    if (search.get('baru') === '1' || !selected) void create(); else { setId(selected); try { localStorage.setItem(draftKey, selected); } catch {} }
  });
  if (error) return <div className="inspector-chat p-5"><ErrorState error={error}><button className="btn btn-secondary" onClick={() => void create()}>Try again</button></ErrorState></div>;
  return id ? <Conversation key={id} id={id} create={create}/> : <div className="p-5"><Spinner label="Opening your inspection…"/></div>;
}
function Conversation({ id, create }: { id: string; create: () => Promise<void> }) {
  const cache = useQueryClient(), end = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null), attachment = useRef<HTMLInputElement>(null), composer = useRef<HTMLTextAreaElement>(null), submitting = useRef(false);
  const [text, setText] = useState(''), [photo, setPhotoState] = useState<File>(), [preparing, setPreparing] = useState(false), [photoError, setPhotoError] = useState<string | null>(null);
  const draftText = useRef('');
  const draftPhoto = useRef<File | undefined>(undefined);
  function setDraft(value: string) { draftText.current = value; setText(value); }
  function setPhoto(value: File | undefined) { draftPhoto.current = value; setPhotoState(value); }
  const [showModel, setShowModel] = useState(true), [status, setStatus] = useState(''), [optimistic, setOptimistic] = useState<InspectorMessage[]>([]);
  const query = useQuery({ queryKey: ['laporan', id], queryFn: () => api<ReportView>(`/api/laporan/${encodeURIComponent(id)}`) });
  const report = query.data;
  const turn = useMutation({ mutationFn: async ({ text, photo, planId, retry }: { text: string; photo?: File; planId?: string; draftText: string; retry?: boolean }) => {
    if (retry && planId) {
      const latest = await api<ReportView>(`/api/laporan/${encodeURIComponent(id)}`);
      if (latest.rencana_id === planId) planId = undefined;
    }
    const body = new FormData(); body.set('text', text); if (photo) body.set('file', photo); if (planId) body.set('planId', planId);
    return postTurn<TurnResponse<ReportView>>(`/api/laporan/${id}/turn`, body, setStatus);
  }, onMutate: ({ text, photo }) => { setOptimistic([{ id: 'pending', role: 'user', text, pendingFile: photo, created_at: new Date().toISOString() }]); setStatus(photo ? 'Examining the photo…' : 'Lumo is reading…'); }, onSuccess: reply => {
    setOptimistic([]); cache.setQueryData(['laporan', id], reply.data);
  }, onError: (_error, draft) => { if (!draftText.current && !draftPhoto.current) { setDraft(draft.draftText); setPhoto(draft.photo); } }, onSettled: () => { submitting.current = false; setOptimistic([]); void cache.invalidateQueries({ queryKey: ['laporan', id] }); } });
  useLayoutEffect(() => {
    const field = composer.current;
    if (!field) return;
    function resize() {
      if (!field) return;
      const css = getComputedStyle(field), border = parseFloat(css.borderTopWidth) + parseFloat(css.borderBottomWidth);
      const threeLines = parseFloat(css.lineHeight) * 3 + parseFloat(css.paddingTop) + parseFloat(css.paddingBottom) + border;
      const cssMax = parseFloat(css.maxHeight), max = Math.min(threeLines, Number.isFinite(cssMax) ? cssMax : threeLines);
      const previousScroll = field.scrollTop;
      field.style.height = 'auto';
      const needed = field.scrollHeight + border;
      field.style.height = `${Math.max(parseFloat(css.minHeight), Math.min(needed, max))}px`;
      field.style.overflowY = needed > max ? 'auto' : 'hidden';
      field.scrollTop = document.activeElement === field && field.selectionEnd === field.value.length ? field.scrollHeight : previousScroll;
    }
    resize();
    const observer = new ResizeObserver(resize); observer.observe(field);
    return () => observer.disconnect();
  }, [text, query.isLoading, turn.isPending]);
  useEffect(() => {
    const media = matchMedia('(max-height: 640px)');
    const adapt = () => { if (media.matches) setShowModel(false); };
    adapt(); media.addEventListener('change', adapt);
    return () => media.removeEventListener('change', adapt);
  }, []);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end', behavior: 'instant' }); }, [report?.messages.length, turn.isPending]);
  async function choosePhoto(file?: File) {
    if (!file) return; setPreparing(true); setPhotoError(null);
    try { if (!file.type.startsWith('image/')) throw new Error('Choose a photo.'); setPhoto(await compressImage(file)); }
    catch (error) { setPhotoError(error instanceof Error ? error.message : 'The photo could not be prepared.'); }
    finally { setPreparing(false); }
  }
  function send(value = text, planId?: string) {
    if ((!value.trim() && !photo) || submitting.current || turn.isPending || preparing) return;
    submitting.current = true;
    const draft = { text: value.trim(), photo, planId, draftText: text || value };
    setDraft(''); setPhoto(undefined); setPhotoError(null);
    if (input.current) input.current.value = ''; if (attachment.current) attachment.current.value = '';
    turn.mutate(draft);
  }
  function retryFailed() {
    const draft = turn.variables;
    if (!draft || submitting.current || turn.isPending || preparing) return;
    submitting.current = true;
    if (text === draft.draftText && photo === draft.photo) { setDraft(''); setPhoto(undefined); }
    turn.mutate({ ...draft, retry: true });
  }
  async function startNew() {
    if (turn.isPending || preparing) return;
    const unsent = !!text.trim() || !!photo;
    const action = 'Start a new inspection?';
    if (report?.status === 'berjalan' && (Object.keys(report.hasil).length || unsent) && !window.confirm(unsent ? `${action} Your unsent message and photo will be discarded. Recorded findings stay saved.` : `${action} Your recorded findings stay saved, but this device will resume the new inspection.`)) return;
    await create();
  }
  if (query.isLoading) return <div className="p-5"><Spinner/></div>;
  if (query.error || !report) return <div className="inspector-chat p-5"><ErrorState error={query.error || 'Inspection not found.'}><button className="btn btn-secondary" onClick={() => void create()}>Start a new inspection</button></ErrorState></div>;
  const items = itemsOf(report), active = nextItem(report), done = progress(report), last = report.messages.filter(m => m.role === 'pramana').at(-1);
  const resultCounts = counts(report);
  const completionSummary = [
    resultCounts.tidak_baik ? `${resultCounts.tidak_baik} ${resultCounts.tidak_baik === 1 ? 'finding needs' : 'findings need'} attention.` : '',
    resultCounts.tidak_bisa_diperiksa ? `${resultCounts.tidak_bisa_diperiksa} ${resultCounts.tidak_bisa_diperiksa === 1 ? 'check could' : 'checks could'} not be completed.` : '',
    resultCounts.stop ? 'Keep the vehicle out of service pending repair and safe reinspection.' : 'Your findings and photos are saved in the report.',
  ].filter(Boolean).join(' ');
  const statuses = Object.fromEntries(items.filter(i => i.comp_id && report.hasil[i.id]).map(i => [i.comp_id!, report.hasil[i.id].status])) as Record<string, StatusItem>;
  const messages: InspectorMessage[] = [...report.messages, ...optimistic];
  const hasNextDraft = (!!text && text !== turn.variables?.draftText) || (!!photo && photo !== turn.variables?.photo);
  return <div className="inspector-chat h-dvh flex flex-col overflow-hidden">
    <header className="shrink-0 sticky top-0 z-10 px-4 pt-3 pb-2 bg-[var(--color-surface)] border-b border-[var(--color-line)]">
      <div className="flex items-center gap-2"><Link href="/petugas/riwayat" aria-label="Back to inspection history" className={iconButton}><ArrowLeft size={18}/></Link><div className="flex-1 min-w-0"><h1 className="t-heading truncate">{report.unit ? unitCode(report.unit) : 'New P2H'}</h1><p className="t-caption-data muted truncate">{report.unit?.split('·')[1]?.trim() || 'Daily vehicle inspection'}</p></div><button className={iconButton} aria-label="New inspection" disabled={turn.isPending} onClick={() => void startNew()}><Plus size={18}/></button><button className={iconButton} aria-label="Restart inspection" disabled={turn.isPending} onClick={() => void startNew()}><RotateCcw size={16}/></button></div>
      {!!items.length && <div className="mt-3 space-y-2"><ProgressSegments items={items.map(i => report.hasil[i.id]?.status || null)} active={items.findIndex(i => i.id === active?.id)}/><p className="t-caption-data muted truncate">{done.done}/{done.total} recorded{active ? ` · ${active.nama}` : report.status === 'terkirim' ? ' · Submitted' : ' · Ready to submit'}</p></div>}
    </header>
    {report.status === 'terkirim' ? <div className="inspector-scroll flex-1 overflow-y-auto p-5 flex flex-col items-center text-center gap-4 py-10"><MascotHero pose={resultCounts.stop ? 'mencatat' : 'jempol'} size={112}/><h2 className="t-heading">Inspection submitted</h2><p className={`inspector-completion-verdict t-body-lg ${resultCounts.stop ? 'text-[var(--color-status-tidak-baik)]' : ''}`}>{verdict(report)}</p><ResultPills counts={resultCounts}/><p className="t-body muted">{completionSummary}</p><Link href={`/petugas/riwayat/${report.id}`} className="btn btn-primary">View report</Link><Link href="/petugas/riwayat" className="btn btn-secondary">Inspection history</Link></div> : <>
      {report.rencana_snapshot?.model_id && <div className="inspector-model border-b border-[var(--color-line)]"><button className="t-body-sm muted w-full flex shrink-0 items-center justify-between px-4 py-2" aria-expanded={showModel} onClick={() => setShowModel(!showModel)}>Vehicle model{showModel ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button>{showModel && <VehicleModel className="inspector-model-canvas px-4 pb-2" modelId={report.rencana_snapshot.model_id} focus={active?.comp_id} statuses={statuses} tiltControl={false}/>}</div>}
      <div className="inspector-scroll inspector-thread flex-1 min-h-0 overflow-y-auto p-4 space-y-4" role="log" aria-label="Inspection conversation" aria-live="polite">
        <div className="flex flex-col items-center gap-1 pb-3"><MascotHero pose="menyapa" size={96}/><h2 className="t-heading">Lumo</h2><p className="t-body-sm muted">Your P2H companion · {fmtDate(report.started_at)}</p></div>
        {messages.map((message, index) => {
          const replies = message.role === 'pramana' ? message.quick_replies || [] : [];
          const answer = messages[index + 1]?.role === 'user' ? messages[index + 1].text.trim() : '';
          const selected = replies.includes(answer) ? answer : null;
          const current = message.id === last?.id;
          const choices = current ? replies : selected ? [selected] : [];
          const disabled = !current || turn.isPending || preparing;
          return <div key={message.id} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : ''}`}>
          {message.role === 'pramana' && <MascotAvatar size={28} mood={message.mood}/>}
          <div className={`min-w-0 max-w-[88%] space-y-2 ${message.pendingFile ? 'inspector-photo-message' : ''}`}><div className={`p-3 t-body-lg break-words space-y-2 ${message.role === 'user' ? 'bubble-petugas' : 'bubble-pramana'}`}>
            {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
            {message.pendingFile && <LocalPlannerAttachment file={message.pendingFile} pending/>}
            {message.files?.map(file => <a key={file.id} href={`/api/files/${encodeURIComponent(file.id)}`} target="_blank" rel="noreferrer" className="block"><img src={`/api/files/${encodeURIComponent(file.id)}`} alt={file.caption || 'Inspection photo'} className="inspector-evidence rounded-lg max-h-48 w-full object-cover" onLoad={() => end.current?.scrollIntoView({ block: 'end' })}/></a>)}
          </div>{!!message.pills?.length && <div className="flex flex-wrap gap-1.5">{message.pills.map((pill, i) => <ChatPill key={i} pill={pill}/>)}</div>}
            {current && message.plan_choices && !report.rencana_id && <InspectionPlanSelect plans={message.plan_choices} disabled={disabled} onChoose={plan => send(plan.title, plan.id)}/>}
            {!!choices.length && !message.plan_choices && <div role="group" aria-label={current ? 'Reply choices' : 'Selected reply'} className="space-y-2" data-inspection-choices>
              <p className="t-label muted font-normal pt-1">{current ? 'Choose an option' : 'Selected option'}</p>
              {choices.map(reply => <button key={reply} type="button" className={`flex w-full min-h-12 items-center gap-3 rounded-[12px] border px-3 py-3 text-left t-body-lg disabled:cursor-default ${selected === reply ? 'border-[var(--color-primary)] bg-[var(--color-accent-subtle)] text-[var(--color-on-accent-subtle)]' : 'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-text-strong)] enabled:hover:border-[var(--color-primary)] enabled:hover:bg-[var(--color-accent-subtle)]'} ${turn.isPending || preparing ? 'opacity-60' : ''}`} aria-pressed={selected === reply} disabled={disabled} onClick={() => send(reply)}><span className="min-w-0 flex-1 whitespace-normal [overflow-wrap:anywhere]">{reply}</span>{selected === reply ? <Check size={18} aria-hidden="true" className="shrink-0"/> : <ArrowRight size={18} aria-hidden="true" className="shrink-0 text-[var(--color-primary)]"/>}</button>)}
            </div>}
          </div>
        </div>; })}
        {turn.isPending && <TypingBubble label={status}/>}<div ref={end}/>
      </div>
      <div className="shrink-0 p-3 border-t border-[var(--color-line)] bg-[var(--color-surface)] pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="inspector-draft-tools inspector-scroll">
          {(turn.error || photoError) && <div className="inspector-scroll mb-2 max-h-28 overflow-y-auto"><ErrorState error={photoError || turn.error!}/><p className="t-body-sm muted mt-1">{photoError ? 'Choose another photo and try again.' : hasNextDraft ? 'Your next draft is preserved. Retry the failed message, or continue with this draft.' : 'Your draft is ready to retry. Send it again, or choose another photo.'}</p>{turn.error && <button type="button" className="btn btn-secondary t-body-sm mt-2" onClick={retryFailed} disabled={turn.isPending || preparing}>Retry failed message</button>}</div>}
          {photo && <div className="mb-2"><LocalPlannerAttachment file={photo} disabled={turn.isPending || preparing} onRemove={() => { setPhoto(undefined); if (input.current) input.current.value = ''; if (attachment.current) attachment.current.value = ''; }} removeLabel="Remove photo"/></div>}
          {preparing && <Spinner label="Preparing photo…"/>}
        </div>
        <form className="space-y-2" onSubmit={e => { e.preventDefault(); send(); }}>
          <input ref={input} type="file" accept="image/*" capture="environment" aria-label="Take an inspection photo" tabIndex={-1} className="sr-only" disabled={turn.isPending || preparing} onChange={e => { void choosePhoto(e.target.files?.[0]); e.target.value = ''; }}/>
          <input ref={attachment} type="file" accept="image/*" aria-label="Attach an image" tabIndex={-1} className="sr-only" disabled={turn.isPending || preparing} onChange={e => { void choosePhoto(e.target.files?.[0]); e.target.value = ''; }}/>
          <textarea ref={composer} rows={1} className="inspector-composer inspector-scroll input t-body-lg w-full resize-none min-h-12" aria-label="Message Lumo" placeholder="Tell Lumo what you found…" value={text} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}/>
          <div className="flex items-center gap-2"><button type="button" className={`${iconButton} !w-12 !h-12`} aria-label="Take a photo" title="Take a photo" disabled={turn.isPending || preparing} onClick={() => input.current?.click()}><Camera size={21}/></button><button type="button" className={`${iconButton} !w-12 !h-12`} aria-label="Choose an image from gallery or files" title="Attach an image" disabled={turn.isPending || preparing} onClick={() => attachment.current?.click()}><Paperclip size={20}/></button><span className="t-label muted font-normal">Camera or image</span><button className="btn btn-primary w-12 h-12 p-0 shrink-0 ml-auto" aria-label="Send message" disabled={turn.isPending || preparing || (!text.trim() && !photo)}><Send size={18}/></button></div>
        </form>
      </div>
    </>}
  </div>;
}
