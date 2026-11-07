"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Box, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import type { ItemRencana, ModelKendaraan } from "@/lib/contracts";
const iconButton = "w-8 h-8 grid place-items-center rounded-md muted hover:bg-[var(--color-surface-muted)] disabled:opacity-40";
const sources = { spec: "Spec sheet", standar: "Standard", form_lama: "Existing form", manual: "Manual" };

type Props = { items: ItemRencana[]; model?: ModelKendaraan; selected: string | null; select: (id: string | null) => void; hover: (id: string | null) => void; save: (items: ItemRencana[]) => Promise<void>; disabled: boolean; flashed: string[] };
export function PlanItems({ items, model, selected, select, hover, save, disabled, flashed }: Props) {
  const [editing, setEditing] = useState<ItemRencana | null>(null);
  const [adding, setAdding] = useState(false);
  const nodes = useRef(new Map<string, HTMLDivElement>());
  useEffect(() => { if (selected) nodes.current.get(selected)?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); }, [selected]);
  async function move(index: number, direction: number) {
    const reordered = [...items]; [reordered[index], reordered[index + direction]] = [reordered[index + direction], reordered[index]];
    await save(reordered);
  }
  return <div className="space-y-1" aria-label="Inspection items">
    {!items.length && !adding && <div className="py-12 px-4 text-center"><h2 className="t-heading">Start with your vehicle</h2><p className="t-body-sm muted mt-2">Upload a Spec Sheet or describe the vehicle to Lumo. Your inspection items will appear here.</p></div>}
    {items.map((item, index) => <div key={item.id} ref={node => { if (node) nodes.current.set(item.id, node); else nodes.current.delete(item.id); }} data-item-id={item.id} className={`rounded-[10px] border ${selected === item.id ? "border-[var(--color-primary)] bg-[var(--color-surface)]" : "border-transparent"} ${flashed.includes(item.id) ? "flash" : ""}`} onMouseEnter={() => hover(item.id)} onMouseLeave={() => hover(null)}>
      <button aria-expanded={selected === item.id} onClick={() => select(selected === item.id ? null : item.id)} className="w-full flex items-center gap-3 px-3 py-3 text-left rounded-[9px] hover:bg-[var(--color-surface-muted)]">
        <span className="t-data muted w-4 shrink-0">{index + 1}</span><span className="t-body font-medium truncate flex-1">{item.nama}</span><span className="t-label muted font-normal shrink-0">{sources[item.sumber]}</span>{item.comp_id && <Box size={14} className="muted shrink-0" aria-label="Mapped to model"/>}
      </button>
      {selected === item.id && (editing?.id === item.id ? <ItemForm key={item.id} item={editing} model={model} disabled={disabled} cancel={() => setEditing(null)} submit={async value => { await save(items.map(i => i.id === item.id ? value : i)); setEditing(null); }}/> : <div className="px-4 pb-3 space-y-3">
        <div><p className="t-label muted">Check</p><p className="t-body mt-1">{item.yang_dicek}</p></div>
        <div><p className="t-label muted">Evidence</p><ul className="t-body mt-1 space-y-1">{item.bukti.map((b, i) => <li key={i}>{b.deskripsi} <span className="t-body-sm muted">({b.wajib ? "required" : "optional"})</span></li>)}</ul></div>
        {item.kondisi_stop && <div className="text-[var(--color-status-tidak-baik)]"><p className="t-label">STOP if</p><p className="t-body mt-1">{item.kondisi_stop}</p></div>}
        {!item.comp_id && <p className="t-body-sm muted">No model component linked. Edit to choose one.</p>}
        <div className="flex gap-1 border-t border-[var(--color-line)] pt-2">
          <button className={iconButton} aria-label={`Edit ${item.nama}`} disabled={disabled} onClick={() => setEditing(item)}><Pencil size={15}/></button>
          <button className={iconButton} aria-label={`Move ${item.nama} up`} disabled={disabled || index === 0} onClick={() => void move(index, -1).catch(() => {})}><ArrowUp size={15}/></button>
          <button className={iconButton} aria-label={`Move ${item.nama} down`} disabled={disabled || index === items.length - 1} onClick={() => void move(index, 1).catch(() => {})}><ArrowDown size={15}/></button>
          <button className={`${iconButton} ml-auto`} aria-label={`Delete ${item.nama}`} disabled={disabled} onClick={async () => { try { await save(items.filter(i => i.id !== item.id)); select(null); } catch {} }}><Trash2 size={15}/></button>
        </div>
      </div>)}
    </div>)}
    {adding ? <div className="panel border-[var(--color-primary)] py-4"><h3 className="t-heading px-4 pb-3">New inspection item</h3><ItemForm model={model} disabled={disabled} cancel={() => setAdding(false)} submit={async value => { await save([...items, value]); setAdding(false); select(value.id); }}/></div> : <button className="btn btn-secondary t-body mt-3" disabled={disabled || items.length >= 30} onClick={() => { setAdding(true); setEditing(null); }}><Plus size={15}/>Add item</button>}
  </div>;
}

function ItemForm({ item, model, submit, cancel, disabled }: { item?: ItemRencana; model?: ModelKendaraan; submit: (value: ItemRencana) => Promise<void>; cancel: () => void; disabled: boolean }) {
  const [draft, setDraft] = useState<ItemRencana>(item ?? { id: `ITEM-${crypto.randomUUID()}`, urutan: 0, nama: "", sumber: "manual", yang_dicek: "", bukti: [{ jenis: "foto", deskripsi: "", wajib: true }], kondisi_stop: null, comp_id: null });
  const name = useRef<HTMLInputElement>(null);
  useEffect(() => { name.current?.focus(); }, []);
  return <form className="px-4 pb-2 space-y-3" onSubmit={async event => { event.preventDefault(); try { await submit(draft); } catch {} }}>
    <label className="block t-label">Item name<input ref={name} className="input t-body w-full mt-1" value={draft.nama} required maxLength={160} onChange={e => setDraft({ ...draft, nama: e.target.value })}/></label>
    <label className="block t-label">What to check<textarea className="input t-body w-full mt-1" rows={3} value={draft.yang_dicek} required maxLength={3000} onChange={e => setDraft({ ...draft, yang_dicek: e.target.value })}/></label>
    <fieldset className="space-y-2"><legend className="t-label mb-1">Evidence requirements</legend>{draft.bukti.map((b, index) => <div key={index} className="rounded-lg border border-[var(--color-line)] p-2 space-y-2">
      <div className="flex gap-2"><select aria-label={`Evidence ${index + 1} type`} className="input t-body min-w-0 flex-1" value={b.jenis} onChange={e => setDraft({ ...draft, bukti: draft.bukti.map((v, i) => i === index ? { ...v, jenis: e.target.value as "foto" | "jawaban" } : v) })}><option value="foto">Photo</option><option value="jawaban">Answer</option></select><button type="button" className={iconButton} aria-label={`Remove evidence ${index + 1}`} onClick={() => setDraft({ ...draft, bukti: draft.bukti.filter((_, i) => i !== index) })}><X size={15}/></button></div>
      <input aria-label={`Evidence ${index + 1} description`} placeholder="Describe the evidence" className="input t-body w-full" required value={b.deskripsi} onChange={e => setDraft({ ...draft, bukti: draft.bukti.map((v, i) => i === index ? { ...v, deskripsi: e.target.value } : v) })}/>
      <label className="t-body-sm flex gap-2 items-center"><input type="checkbox" checked={b.wajib} onChange={e => setDraft({ ...draft, bukti: draft.bukti.map((v, i) => i === index ? { ...v, wajib: e.target.checked } : v) })}/>Required</label>
    </div>)}<button type="button" className="btn btn-secondary t-body" onClick={() => setDraft({ ...draft, bukti: [...draft.bukti, { jenis: "foto", deskripsi: "", wajib: true }] })}><Plus size={14}/>Add evidence</button></fieldset>
    <label className="block t-label">STOP condition<textarea className="input t-body w-full mt-1" rows={2} value={draft.kondisi_stop || ""} onChange={e => setDraft({ ...draft, kondisi_stop: e.target.value || null })}/></label>
    <label className="block t-label">Model component<select className="input t-body w-full mt-1" value={draft.comp_id || ""} onChange={e => setDraft({ ...draft, comp_id: e.target.value || null })}><option value="">Not linked</option>{model?.komponen.map(c => <option key={c.comp_id} value={c.comp_id}>{c.label}</option>)}</select></label>
    <p className="t-body-sm muted">Safety checks always require a photo and a STOP condition.</p>
    <div className="flex gap-2"><button className="btn btn-primary t-body" disabled={disabled || !draft.nama.trim() || !draft.yang_dicek.trim()}><Check size={15}/>Save item</button><button className="btn btn-secondary t-body" type="button" onClick={cancel}>Cancel</button></div>
  </form>;
}
