"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FileText, Paperclip, Pin, PinOff, Send, X } from "lucide-react";
import type { ChatMessage } from "@/lib/contracts";
import { ErrorState, MascotAvatar, MascotHero, TypingBubble } from "@/components/ui";
const iconButton = "w-8 h-8 shrink-0 grid place-items-center rounded-md muted hover:bg-[var(--color-surface-muted)]";

export function PlannerChat({ messages, pinned, setPinned, busy, status, error, send, disabled }: { messages: ChatMessage[]; pinned: boolean; setPinned: (value: boolean) => void; busy: boolean; status: string; error: Error | null; send: (text: string, file?: File) => Promise<void>; disabled: boolean }) {
  const [open, setOpen] = useState(false), [text, setText] = useState(""), [file, setFile] = useState<File>();
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null), composer = useRef<HTMLTextAreaElement>(null), end = useRef<HTMLDivElement>(null), panel = useRef<HTMLDivElement>(null);
  const last = messages.findLast(m => m.role === "pramana");
  const quick = last?.quick_replies ?? ["Create a dump truck plan", "Which safety checks are required?"];
  useLayoutEffect(() => {
    const input = composer.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 128)}px`;
  }, [text, pinned]);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [messages.length, busy, open, pinned]);
  useEffect(() => {
    if (!open || pinned) return;
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); composer.current?.focus(); } };
    const outside = (e: PointerEvent) => { if (panel.current && !panel.current.parentElement?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", escape); document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", escape); document.removeEventListener("pointerdown", outside); };
  }, [open, pinned]);
  async function submit(value = text) {
    if (busy || disabled || (!value.trim() && !file)) return;
    setOpen(true);
    try { await send(value.trim(), file); setText(""); setFile(undefined); if (fileInput.current) fileInput.current.value = ""; } catch { /* Preserve draft for retry. */ }
  }
  const header = <header className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--color-line)]"><MascotAvatar size={30}/><div className="min-w-0 flex-1"><h2 className="t-heading">Lumo</h2><p className="t-body-sm muted">Inspection plan assistant</p></div><button className={`${iconButton} max-xl:hidden`} aria-label={pinned ? "Minimise conversation" : "Pin conversation"} onClick={() => { setPinned(!pinned); setOpen(false); }}>{pinned ? <PinOff size={16}/> : <Pin size={16}/>}</button>{!pinned && <button className={iconButton} aria-label="Close conversation" onClick={() => { setOpen(false); composer.current?.focus(); }}><X size={16}/></button>}</header>;
  const thread = <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4" role="log" aria-label="Conversation with Lumo" aria-live="polite">
    {!messages.length && <div className="py-8 flex flex-col items-center text-center gap-3"><MascotHero pose="menyapa" size={88}/><p className="t-heading">Let’s build a safer shift.</p><p className="t-body muted max-w-prose">Share a Spec Sheet or tell me about your vehicle. I’ll turn it into practical inspection checks.</p></div>}
    {messages.map(message => <div key={message.id} className={`flex gap-2 ${message.role === "user" ? "justify-end" : ""}`}>
      {message.role === "pramana" && <MascotAvatar size={26}/>}<div className={`t-body max-w-[90%] break-words whitespace-pre-wrap ${message.role === "user" ? "bubble-petugas" : "bubble-pramana"}`}>{message.text}{message.files?.map(f => <a href={`/api/files/${encodeURIComponent(f.id)}`} target="_blank" rel="noreferrer" key={f.id} className="t-body-sm flex items-center gap-2 mt-2 underline"><FileText size={14}/>{f.caption || "View attachment"}</a>)}</div>
    </div>)}
    {busy && <div><TypingBubble label="Lumo is working…"/><p className="t-body-sm muted ml-9 mt-2" role="status">{status}</p></div>}{error && <ErrorState error={error}/>}<div ref={end}/>
  </div>;
  return <section aria-label="Plan conversation" className={pinned ? "w-[400px] shrink-0 border-r border-[var(--color-line)] flex flex-col order-first bg-[var(--color-rail)] min-h-0" : "relative border-t border-[var(--color-line)] bg-[var(--color-surface)] p-4 shrink-0"}>
    {pinned ? <>{header}{thread}</> : <>
      {open && <div ref={panel} role="dialog" aria-label="Lumo conversation" className="panel floating absolute bottom-full right-4 mb-2 w-[460px] max-w-[calc(100%-2rem)] h-[64vh] max-h-[680px] z-30 flex flex-col overflow-hidden">{header}{thread}</div>}
      <button className="flex items-center gap-2 w-full text-left mb-3" onClick={() => setOpen(!open)} aria-expanded={open}><MascotAvatar size={22}/><span className="t-body-sm muted truncate flex-1">{busy ? status : last?.text || "I’m Lumo. Share a Spec Sheet to start your inspection plan."}</span><span className="t-body-sm shrink-0 hidden md:inline">View conversation · {messages.length}</span></button>
    </>}
    <div className={pinned ? "p-3 border-t border-[var(--color-line)]" : ""}>
      <div className="flex flex-wrap gap-1.5 mb-2">{quick.map(reply => <button key={reply} className="btn btn-secondary t-body-sm !whitespace-normal text-left" disabled={busy || disabled} onClick={() => void submit(reply)}>{reply}</button>)}</div>
      {file && <div className="flex gap-2 items-center mb-2 t-body-sm"><Paperclip size={14}/><span className="truncate">{file.name}</span><button className={iconButton} aria-label="Remove attachment" onClick={() => { setFile(undefined); if (fileInput.current) fileInput.current.value = ""; }}><X size={14}/></button></div>}
      {fileError && <p role="alert" className="t-body-sm text-[var(--color-status-tidak-baik)] mb-2">{fileError}</p>}
      <form className="flex gap-2 items-end" onSubmit={event => { event.preventDefault(); void submit(); }}>
        <input ref={fileInput} aria-label="Attach Spec Sheet" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" disabled={busy || disabled} onChange={event => { const chosen = event.target.files?.[0]; if (chosen && chosen.size > 20 * 1024 * 1024) { setFileError("Choose a file smaller than 20 MB."); event.target.value = ""; return; } setFileError(null); setFile(chosen); }}/>
        <button type="button" className={`${iconButton} mb-1`} aria-label="Attach a Spec Sheet" disabled={busy || disabled} onClick={() => fileInput.current?.click()}><Paperclip size={18}/></button>
        <textarea ref={composer} rows={1} aria-label="Message Lumo" placeholder="Ask Lumo to build or refine your plan…" className="input t-body flex-1 min-w-0 min-h-10 max-h-32 resize-none overflow-y-auto" value={text} disabled={busy || disabled} onClick={() => setOpen(true)} onChange={event => setText(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void submit(); } }}/>
        <button className="btn btn-primary h-9 px-3" aria-label="Send message" disabled={busy || disabled || (!text.trim() && !file)}><Send size={16}/></button>
        {!pinned && <button type="button" className={`${iconButton} max-xl:hidden mb-1`} aria-label="Pin conversation" onClick={() => setPinned(true)}><Pin size={16}/></button>}
      </form>
    </div>
  </section>;
}
