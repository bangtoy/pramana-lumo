"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Camera, Check, ChevronDown, ChevronUp, Paperclip, Plus, RotateCcw, Send, X } from "lucide-react";
import { api, compressImage, fmtDate, postJson, postTurn } from "@/lib/client";
import { counts, headerMissing, itemsOf, nextItem, progress, unitCode, verdict, type ReportView } from "@/lib/rules";
import type { ChatMessage, StatusItem, TurnResponse } from "@/lib/contracts";
import { ChatPill, ErrorState, MascotAvatar, MascotHero, ProgressSegments, ResultPills, Spinner, TypingBubble } from "@/components/ui";
import { VehicleModel } from "@/components/vehicle-model/VehicleModel";
import { InspectionPlanSelect } from "./InspectionPlanSelect";
import { LocalPlannerAttachment } from "@/components/supervisor/PlannerAttachment";
import { InspectionChecklist } from "./InspectionChecklist";
import { MAX_INSPECTION_PHOTOS } from "@/lib/inspection-photos";
import "./inspector-chat.css";
type InspectorMessage = ChatMessage & { pendingFiles?: File[] };
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
  const [text, setText] = useState(''), [photos, setPhotosState] = useState<File[]>([]), [photoUrls, setPhotoUrls] = useState<string[]>([]), [preparing, setPreparing] = useState(false), [photoError, setPhotoError] = useState<string | null>(null);
  const draftText = useRef('');
  const draftPhotos = useRef<File[]>([]);
  function setDraft(value: string) { draftText.current = value; setText(value); }
  function setPhotos(value: File[]) { draftPhotos.current = value; setPhotosState(value); }
  function samePhotos(left: File[], right: File[] = []) { return left.length === right.length && left.every((file, index) => file === right[index]); }
  const [showModel, setShowModel] = useState(true), [status, setStatus] = useState(''), [optimistic, setOptimistic] = useState<InspectorMessage[]>([]);
  const query = useQuery({ queryKey: ['laporan', id], queryFn: () => api<ReportView>(`/api/laporan/${encodeURIComponent(id)}`) });
  const report = query.data;
  const turn = useMutation({ mutationFn: async ({ text, photos, planId, retry }: { text: string; photos: File[]; planId?: string; draftText: string; retry?: boolean }) => {
    if (retry && planId) {
      const latest = await api<ReportView>(`/api/laporan/${encodeURIComponent(id)}`);
      if (latest.rencana_id === planId) planId = undefined;
    }
    const body = new FormData(); body.set('text', text); photos.forEach(photo => body.append('file', photo)); if (planId) body.set('planId', planId);
    return postTurn<TurnResponse<ReportView>>(`/api/laporan/${id}/turn`, body, setStatus);
  }, onMutate: ({ text, photos }) => { setOptimistic([{ id: 'pending', role: 'user', text, pendingFiles: photos, created_at: new Date().toISOString() }]); setStatus(photos.length ? `Examining ${photos.length === 1 ? 'the photo' : `${photos.length} photos`}…` : 'Lumo is reading…'); }, onSuccess: reply => {
    setOptimistic([]); cache.setQueryData(['laporan', id], reply.data);
  }, onError: (_error, draft) => { if (!draftText.current && !draftPhotos.current.length) { setDraft(draft.draftText); setPhotos(draft.photos); } }, onSettled: () => { submitting.current = false; setOptimistic([]); void cache.invalidateQueries({ queryKey: ['laporan', id] }); } });
  useEffect(() => { const urls = photos.length > 1 ? photos.map(photo => URL.createObjectURL(photo)) : []; setPhotoUrls(urls); return () => urls.forEach(url => URL.revokeObjectURL(url)); }, [photos]);
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
  async function choosePhotos(files: File[]) {
    if (!files.length || preparing || turn.isPending) return; setPhotoError(null);
    if (photos.length + files.length > MAX_INSPECTION_PHOTOS) { setPhotoError(`Choose up to ${MAX_INSPECTION_PHOTOS} photos per message. Remove a photo before adding more.`); return; }
    setPreparing(true);
    try {
      const compressed: File[] = [];
      for (const file of files) { if (!file.type.startsWith('image/')) throw new Error('Choose photos only.'); compressed.push(await compressImage(file)); }
      setPhotos([...draftPhotos.current, ...compressed]);
    }
    catch (error) { setPhotoError(error instanceof Error ? error.message : 'The photo could not be prepared.'); }
    finally { setPreparing(false); }
  }
  function send(value = text, planId?: string) {
    if ((!value.trim() && !photos.length) || submitting.current || turn.isPending || preparing) return;
    submitting.current = true;
    const draft = { text: value.trim(), photos, planId, draftText: text || value };
    setDraft(''); setPhotos([]); setPhotoError(null);
    if (input.current) input.current.value = ''; if (attachment.current) attachment.current.value = '';
    turn.mutate(draft);
  }
  function retryFailed() {
    const draft = turn.variables;
    if (!draft || submitting.current || turn.isPending || preparing) return;
    submitting.current = true;
    if (text === draft.draftText && samePhotos(photos, draft.photos)) { setDraft(''); setPhotos([]); }
    turn.mutate({ ...draft, retry: true });
  }
  async function startNew() {
    if (turn.isPending || preparing) return;
    const unsent = !!text.trim() || !!photos.length;
    const action = 'Start a new inspection?';
    if (report?.status === 'berjalan' && (Object.keys(report.hasil).length || unsent) && !window.confirm(unsent ? `${action} Your unsent message and photos will be discarded. Recorded findings stay saved.` : `${action} Your recorded findings stay saved, but this device will resume the new inspection.`)) return;
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
  const hasNextDraft = (!!text && text !== turn.variables?.draftText) || (!!photos.length && !samePhotos(photos, turn.variables?.photos));
  return <div className="inspector-chat h-dvh flex flex-col overflow-hidden">
    <header className="shrink-0 sticky top-0 z-10 px-4 pt-3 pb-2 bg-[var(--color-surface)] border-b border-[var(--color-line)]">
      <div className="flex items-center gap-2"><Link href="/petugas/riwayat" aria-label="Back to inspection history" className={iconButton}><ArrowLeft size={18}/></Link><div className="flex-1 min-w-0"><h1 className="t-heading truncate">{report.unit ? unitCode(report.unit) : 'New P2H'}</h1><p className="t-caption-data muted truncate">{report.unit?.split('·')[1]?.trim() || 'Daily vehicle inspection'}</p></div><button className={iconButton} aria-label="New inspection" disabled={turn.isPending} onClick={() => void startNew()}><Plus size={18}/></button><button className={iconButton} aria-label="Restart inspection" disabled={turn.isPending} onClick={() => void startNew()}><RotateCcw size={16}/></button></div>
      {!!items.length && <div className="mt-3 space-y-2"><ProgressSegments items={items.map(i => report.hasil[i.id]?.status || null)} active={items.findIndex(i => i.id === active?.id)}/><p className="t-caption-data muted truncate">{done.done}/{done.total} recorded{headerMissing(report).length ? ' · Complete inspection details' : active ? ` · ${active.nama}` : report.status === 'terkirim' ? ' · Submitted' : ' · Ready to submit'}</p></div>}
    </header>
    {report.status === 'terkirim' ? <div className="inspector-scroll flex-1 overflow-y-auto p-5 flex flex-col items-center text-center gap-4 py-10"><MascotHero pose={resultCounts.stop ? 'mencatat' : 'jempol'} size={112}/><h2 className="t-heading">Inspection submitted</h2><p className={`inspector-completion-verdict t-body-lg ${resultCounts.stop ? 'text-[var(--color-status-tidak-baik)]' : ''}`}>{verdict(report)}</p><ResultPills counts={resultCounts}/><p className="t-body muted">{completionSummary}</p><Link href={`/petugas/riwayat/${report.id}`} className="btn btn-primary">View report</Link><Link href="/petugas/riwayat" className="btn btn-secondary">Inspection history</Link></div> : <>
      {report.rencana_snapshot?.model_id && !headerMissing(report).length && <div className="inspector-model border-b border-[var(--color-line)]"><button className="t-body-sm muted w-full flex shrink-0 items-center justify-between px-4 py-2" aria-expanded={showModel} onClick={() => setShowModel(!showModel)}>Vehicle model{showModel ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button>{showModel && <VehicleModel className="inspector-model-canvas px-4 pb-2" modelId={report.rencana_snapshot.model_id} focus={active?.comp_id} statuses={statuses} tiltControl={false}/>}</div>}
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
          <div className={`min-w-0 max-w-[88%] space-y-2 ${message.pendingFiles?.length ? 'inspector-photo-message' : ''}`}>
            {message.inspection_checklist?.kind === 'overview' && <InspectionChecklist checklist={message.inspection_checklist}/>}
            <div className={`p-3 t-body-lg break-words space-y-2 ${message.role === 'user' ? 'bubble-petugas' : 'bubble-pramana'}`}>
            {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
            {message.pendingFiles?.map((file, photoIndex) => <LocalPlannerAttachment key={photoIndex} file={file} pending/>)}
              {!!message.files?.length && <div className={`mt-2 grid gap-2 ${message.files.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>{message.files.map((file, photoIndex) => <a key={file.id} href={`/api/files/${encodeURIComponent(file.id)}`} target="_blank" rel="noreferrer" aria-label={`Open photo ${photoIndex + 1}`}><img src={`/api/files/${encodeURIComponent(file.id)}`} alt={file.caption || `Inspection photo ${photoIndex + 1}`} className={`inspector-evidence rounded-lg w-full object-cover ${message.files!.length > 1 ? 'h-24' : 'max-h-48'}`} onLoad={() => end.current?.scrollIntoView({ block: 'end' })}/></a>)}</div>}
          </div>{!!message.pills?.length && !message.inspection_checklist && <div className="flex flex-wrap gap-1.5">{message.pills.map((pill, i) => <ChatPill key={i} pill={pill}/>)}</div>}
            {message.inspection_checklist?.kind === 'progress' && <InspectionChecklist checklist={message.inspection_checklist}/>}
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
        {!!photos.length && <div className="mb-2 space-y-2" data-photo-previews>
          <p className="t-label muted font-normal">{photos.length}/{MAX_INSPECTION_PHOTOS} photos ready · {Math.ceil(photos.reduce((total, photo) => total + photo.size, 0) / 1024)} KB total</p>
          {photos.length === 1 ? <LocalPlannerAttachment file={photos[0]} disabled={turn.isPending || preparing} onRemove={() => { setPhotos([]); setPhotoError(null); }} removeLabel="Remove photo 1"/> : <div className="grid grid-cols-5 gap-2 pb-1">{photos.map((photo, photoIndex) => <div key={`${photoIndex}-${photo.name}`} className="relative min-w-0">
            <img src={photoUrls[photoIndex]} alt={`Photo ${photoIndex + 1} ready to send`} className="h-16 w-full rounded-lg object-cover"/>
            <button type="button" className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--color-surface)] text-[var(--color-text-strong)] border border-[var(--color-line)]" aria-label={`Remove photo ${photoIndex + 1}`} disabled={turn.isPending || preparing} onClick={() => { setPhotos(photos.filter((_, index) => index !== photoIndex)); setPhotoError(null); }}><X size={16}/></button>
            <p className="t-caption-data muted mt-1">{Math.ceil(photo.size / 1024)} KB</p>
          </div>)}</div>}
        </div>}
          {preparing && <Spinner label="Preparing photos…"/>}
        </div>
        <form className="space-y-2" onSubmit={e => { e.preventDefault(); send(); }}>
          <input ref={input} type="file" accept="image/*" capture="environment" aria-label="Take an inspection photo" tabIndex={-1} className="sr-only" disabled={turn.isPending || preparing} onChange={e => { void choosePhotos(Array.from(e.target.files || [])); e.target.value = ''; }}/>
          <input ref={attachment} type="file" accept="image/*" multiple aria-label="Attach inspection photos" tabIndex={-1} className="sr-only" disabled={turn.isPending || preparing} onChange={e => { void choosePhotos(Array.from(e.target.files || [])); e.target.value = ''; }}/>
          <textarea ref={composer} rows={1} className="inspector-composer inspector-scroll input t-body-lg w-full resize-none min-h-12" aria-label="Message Lumo" placeholder="Tell Lumo what you found…" value={text} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}/>
          <div className="flex items-center gap-2"><button type="button" className={`${iconButton} !w-12 !h-12`} aria-label="Take a photo" title="Take a photo" disabled={turn.isPending || preparing || photos.length >= MAX_INSPECTION_PHOTOS} onClick={() => input.current?.click()}><Camera size={21}/></button><button type="button" className={`${iconButton} !w-12 !h-12`} aria-label="Choose photos from gallery or files" title="Attach photos" disabled={turn.isPending || preparing || photos.length >= MAX_INSPECTION_PHOTOS} onClick={() => attachment.current?.click()}><Paperclip size={20}/></button><span className="t-label muted font-normal">Up to 5 photos</span><button className="btn btn-primary w-12 h-12 p-0 shrink-0 ml-auto" aria-label="Send message" disabled={turn.isPending || preparing || (!text.trim() && !photos.length)}><Send size={18}/></button></div>
        </form>
      </div>
    </>}
  </div>;
}
