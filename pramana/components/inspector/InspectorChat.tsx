"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, ChevronDown, ChevronUp, Plus, RotateCcw, Send, X } from "lucide-react";
import { api, compressImage, fmtDate, postJson, postTurn } from "@/lib/client";
import { counts, itemsOf, nextItem, progress, unitCode, verdict, type ReportView } from "@/lib/rules";
import type { ChatMessage, StatusItem, TurnResponse } from "@/lib/contracts";
import { ChatPill, ErrorState, MascotAvatar, MascotHero, ProgressSegments, ResultPills, Spinner, TypingBubble } from "@/components/ui";
import { VehicleModel } from "@/components/vehicle-model/VehicleModel";
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
  if (error) return <div className="p-5"><ErrorState error={error}><button className="btn btn-secondary" onClick={() => void create()}>Try again</button></ErrorState></div>;
  return id ? <Conversation key={id} id={id} create={create}/> : <div className="p-5"><Spinner label="Opening your inspection…"/></div>;
}
function Conversation({ id, create }: { id: string; create: () => Promise<void> }) {
  const cache = useQueryClient(), end = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(''), [photo, setPhoto] = useState<File>(), [photoUrl, setPhotoUrl] = useState(''), [preparing, setPreparing] = useState(false), [photoError, setPhotoError] = useState<string | null>(null);
  const [showModel, setShowModel] = useState(true), [status, setStatus] = useState(''), [optimistic, setOptimistic] = useState<ChatMessage[]>([]);
  const query = useQuery({ queryKey: ['laporan', id], queryFn: () => api<ReportView>(`/api/laporan/${encodeURIComponent(id)}`) });
  const report = query.data;
  const turn = useMutation({ mutationFn: async ({ text, photo }: { text: string; photo?: File }) => {
    const body = new FormData(); body.set('text', text); if (photo) body.set('file', photo);
    return postTurn<TurnResponse<ReportView>>(`/api/laporan/${id}/turn`, body, setStatus);
  }, onMutate: ({ text }) => { setOptimistic([{ id: 'pending', role: 'user', text: text || 'Photo attached', created_at: new Date().toISOString() }]); setStatus('Lumo is reading…'); }, onSuccess: reply => {
    cache.setQueryData(['laporan', id], reply.data); setText(''); setPhoto(undefined); if (input.current) input.current.value = '';
  }, onSettled: () => { setOptimistic([]); void cache.invalidateQueries({ queryKey: ['laporan', id] }); } });
  useEffect(() => { if (!photo) { setPhotoUrl(''); return; } const url = URL.createObjectURL(photo); setPhotoUrl(url); return () => URL.revokeObjectURL(url); }, [photo]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end', behavior: 'instant' }); }, [report?.messages.length, turn.isPending]);
  async function choosePhoto(file?: File) {
    if (!file) return; setPreparing(true); setPhotoError(null);
    try { if (!file.type.startsWith('image/')) throw new Error('Choose a photo.'); setPhoto(await compressImage(file)); }
    catch (error) { setPhotoError(error instanceof Error ? error.message : 'The photo could not be prepared.'); }
    finally { setPreparing(false); }
  }
  function send(value = text) { if ((!value.trim() && !photo) || turn.isPending || preparing) return; turn.mutate({ text: value.trim(), photo }); }
  async function startNew() { if (report?.status === 'berjalan' && Object.keys(report.hasil).length && !window.confirm('Start a new inspection? Your current draft will stay saved, but this device will resume the new one.')) return; await create(); }
  if (query.isLoading) return <div className="p-5"><Spinner/></div>;
  if (query.error || !report) return <div className="p-5"><ErrorState error={query.error || 'Inspection not found.'}><button className="btn btn-secondary" onClick={() => void create()}>Start a new inspection</button></ErrorState></div>;
  const items = itemsOf(report), active = nextItem(report), done = progress(report), last = report.messages.filter(m => m.role === 'pramana').at(-1);
  const statuses = Object.fromEntries(items.filter(i => i.comp_id && report.hasil[i.id]).map(i => [i.comp_id!, report.hasil[i.id].status])) as Record<string, StatusItem>;
  return <div className="h-dvh flex flex-col overflow-hidden">
    <header className="shrink-0 sticky top-0 z-10 px-4 pt-3 pb-2 bg-[var(--color-surface)] border-b border-[var(--color-line)]">
      <div className="flex items-center gap-2"><Link href="/petugas/riwayat" aria-label="Back to inspection history" className={iconButton}><ArrowLeft size={18}/></Link><div className="flex-1 min-w-0"><h1 className="t-heading truncate">{report.unit ? unitCode(report.unit) : 'New P2H'}</h1><p className="t-caption-data muted truncate">{report.unit?.split('·')[1]?.trim() || 'Daily vehicle inspection'}</p></div><button className={iconButton} aria-label="New inspection" disabled={turn.isPending} onClick={() => void startNew()}><Plus size={18}/></button><button className={iconButton} aria-label="Restart inspection" disabled={turn.isPending} onClick={() => void startNew()}><RotateCcw size={16}/></button></div>
      {!!items.length && <div className="mt-3 space-y-2"><ProgressSegments items={items.map(i => report.hasil[i.id]?.status || null)} active={items.findIndex(i => i.id === active?.id)}/><p className="t-caption-data muted truncate">{done.done}/{done.total} recorded{active ? ` · ${active.nama}` : report.status === 'terkirim' ? ' · Submitted' : ' · Ready to submit'}</p></div>}
    </header>
    {report.status === 'terkirim' ? <div className="flex-1 overflow-y-auto p-5 flex flex-col items-center text-center gap-4 py-10"><MascotHero pose={counts(report).stop ? 'mencatat' : 'jempol'} size={112}/><h2 className="t-heading">Inspection submitted</h2><p className={`t-body-lg ${counts(report).stop ? 'text-[var(--color-status-tidak-baik)]' : ''}`}>{verdict(report)}</p><ResultPills counts={counts(report)}/><p className="t-body muted">{report.ringkasan}</p><Link href={`/petugas/riwayat/${report.id}`} className="btn btn-primary">View report</Link><Link href="/petugas/riwayat" className="btn btn-secondary">Inspection history</Link></div> : <>
      {report.rencana_snapshot?.model_id && <div className="shrink-0 border-b border-[var(--color-line)]"><button className="t-body-sm muted w-full flex items-center justify-between px-4 py-2" aria-expanded={showModel} onClick={() => setShowModel(!showModel)}>Vehicle model{showModel ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button>{showModel && <VehicleModel className="h-44 px-4 pb-2" modelId={report.rencana_snapshot.model_id} focus={active?.comp_id} statuses={statuses} tiltControl={false}/>}</div>}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4" role="log" aria-label="Inspection conversation" aria-live="polite">
        <div className="flex flex-col items-center gap-1 pb-3"><MascotHero pose="menyapa" size={96}/><h2 className="t-heading">Lumo</h2><p className="t-body-sm muted">Your P2H companion · {fmtDate(report.started_at)}</p></div>
        {[...report.messages, ...optimistic].map(message => <div key={message.id} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : ''}`}>
          {message.role === 'pramana' && <MascotAvatar size={28} mood={message.mood}/>}
          <div className="min-w-0 max-w-[88%] space-y-2"><div className={`p-3 t-body-lg whitespace-pre-wrap break-words ${message.role === 'user' ? 'bubble-petugas' : 'bubble-pramana'}`}>{message.text}{message.files?.map(file => <a key={file.id} href={`/api/files/${file.id}`} target="_blank" rel="noreferrer" className="block mt-2"><img src={`/api/files/${file.id}`} alt={file.caption || 'Inspection photo'} className="rounded-lg max-h-48 w-full object-cover" onLoad={() => end.current?.scrollIntoView({ block: 'end' })}/></a>)}</div>{!!message.pills?.length && <div className="flex flex-wrap gap-1.5">{message.pills.map((pill, i) => <ChatPill key={i} pill={pill}/>)}</div>}</div>
        </div>)}
        {turn.isPending && <TypingBubble label={status}/>}<div ref={end}/>
      </div>
      <div className="shrink-0 p-3 border-t border-[var(--color-line)] bg-[var(--color-surface)] pb-[max(12px,env(safe-area-inset-bottom))]">
        {(turn.error || photoError) && <div className="mb-2 max-h-28 overflow-y-auto"><ErrorState error={photoError || turn.error!}/></div>}
        {!turn.isPending && !!last?.quick_replies?.length && <div className="flex gap-2 overflow-x-auto pb-3">{last.quick_replies.map(reply => <button key={reply} className="btn btn-secondary-field t-body-sm shrink-0 max-w-64 truncate" onClick={() => send(reply)} disabled={preparing}>{reply}</button>)}</div>}
        {photo && photoUrl && <div className="mb-2 flex items-center gap-2"><img src={photoUrl} alt="Photo ready to send" className="h-12 w-12 shrink-0 rounded object-cover"/><span className="t-caption-data muted flex-1">Photo ready · {Math.ceil(photo.size / 1024)} KB</span><button className={iconButton} aria-label="Remove photo" disabled={turn.isPending} onClick={() => { setPhoto(undefined); if (input.current) input.current.value = ''; }}><X size={16}/></button></div>}
        {preparing && <Spinner label="Preparing photo…"/>}
        <form className="flex gap-2 items-end" onSubmit={e => { e.preventDefault(); send(); }}><input ref={input} type="file" accept="image/*" capture="environment" aria-label="Take an inspection photo" className="sr-only" disabled={turn.isPending || preparing} onChange={e => void choosePhoto(e.target.files?.[0])}/><button type="button" className={`${iconButton} !w-12 !h-12`} aria-label="Take a photo" disabled={turn.isPending || preparing} onClick={() => input.current?.click()}><Camera size={21}/></button><textarea rows={1} className="input t-body-lg min-w-0 flex-1 resize-none min-h-12 max-h-28" aria-label="Message Lumo" placeholder="Tell Lumo what you found…" value={text} disabled={turn.isPending || preparing} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}/><button className="btn btn-primary w-12 h-12 p-0 shrink-0" aria-label="Send message" disabled={turn.isPending || preparing || (!text.trim() && !photo)}><Send size={18}/></button></form>
      </div>
    </>}
  </div>;
}
