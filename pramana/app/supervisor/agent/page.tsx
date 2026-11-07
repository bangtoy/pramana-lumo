"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, ChevronDown, FileText, Sparkles } from "lucide-react";
import type { ChatMessage, ItemRencana, ModelKendaraan, RencanaInspeksi, TurnResponse } from "@/lib/contracts";
import type { PlannerMessage } from "@/components/supervisor/PlannerAttachment";
import { api, postJson, postTurn } from "@/lib/client";
import { ErrorState, MascotHero, Spinner } from "@/components/ui";
import { VehicleModel } from "@/components/vehicle-model/VehicleModel";
import { GenerationStage } from "@/components/vehicle-model/GenerationStage";
import { PlanItems } from "@/components/supervisor/PlanItems";
import { PlannerChat } from "@/components/supervisor/PlannerChat";
type PlanDetail = RencanaInspeksi & { messages: ChatMessage[] };

export default function AgentPage() { return <Suspense fallback={<div className="p-6"><Spinner/></div>}><PlanRouter/></Suspense>; }
function PlanRouter() {
  const search = useSearchParams(), router = useRouter(), cache = useQueryClient();
  const id = search.get("rencana"), chatMode = search.get("chat");
  const creating = useRef(false);
  const [createError, setCreateError] = useState<Error | null>(null);
  useEffect(() => {
    if (id) { creating.current = false; return; }
    if (creating.current) return;
    creating.current = true;
    postJson<RencanaInspeksi>("/api/rencana", {}).then(plan => {
      void cache.invalidateQueries({ queryKey: ["rencana"] });
      router.replace(`/supervisor/agent?rencana=${encodeURIComponent(plan.id)}${chatMode ? `&chat=${chatMode}` : ""}`);
    }).catch(error => { setCreateError(error); creating.current = false; });
  }, [id, chatMode, router, cache]);
  if (createError && !id) return <div className="p-6"><ErrorState error={createError}><button className="btn btn-secondary" onClick={() => location.reload()}>Try again</button></ErrorState></div>;
  return id ? <PlanWorkspace key={id} id={id} chatMode={chatMode}/> : <div className="p-6"><Spinner label="Creating your inspection plan…"/></div>;
}

function PlanWorkspace({ id, chatMode }: { id: string; chatMode: string | null }) {
  const cache = useQueryClient();
  const planQuery = useQuery({ queryKey: ["rencana", id], queryFn: () => api<PlanDetail>(`/api/rencana/${encodeURIComponent(id)}`) });
  const plan = planQuery.data;
  const models = useQuery({ queryKey: ["models"], queryFn: () => api<ModelKendaraan[]>("/api/models") });
  const modelQuery = useQuery({ queryKey: ["model", plan?.model_id], queryFn: () => api<ModelKendaraan>(`/api/models/${encodeURIComponent(plan!.model_id!)}`), enabled: !!plan?.model_id, refetchInterval: query => query.state.data?.status === "proses" ? 2000 : false });
  const model = modelQuery.data;
  useEffect(() => { if (model?.status === "siap" || model?.status === "gagal") void cache.invalidateQueries({ queryKey: ["rencana", id] }); }, [model?.id, model?.status, cache, id]);
  const [selected, setSelected] = useState<string | null>(null), [hovered, setHovered] = useState<string | null>(null);
  const [tab, setTab] = useState("items"), [menu, setMenu] = useState(false), [picker, setPicker] = useState(false);
  const [pinPreference, setPinPreference] = useState(false), [wide, setWide] = useState(false);
  const [status, setStatus] = useState(""), [flashed, setFlashed] = useState<string[]>([]), [optimistic, setOptimistic] = useState<PlannerMessage[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pinned = pinPreference && wide;
  useEffect(() => {
    try { setPinPreference(chatMode ? chatMode === "pin" : localStorage.getItem("pramana.chat-pin") === "true"); } catch { setPinPreference(chatMode === "pin"); }
    const media = matchMedia("(min-width: 1280px)"); const change = () => setWide(media.matches); change(); media.addEventListener("change", change); return () => media.removeEventListener("change", change);
  }, [chatMode]);
  useEffect(() => {
    if (!menu) return;
    const outside = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [menu]);
  const patch = useMutation({ mutationFn: (body: unknown) => postJson<RencanaInspeksi>(`/api/rencana/${encodeURIComponent(id)}`, body, "PATCH"), onSuccess: result => {
    cache.setQueryData<PlanDetail>(["rencana", id], old => ({ ...result, messages: old?.messages || [] })); void cache.invalidateQueries({ queryKey: ["rencana"], exact: true });
  } });
  const generate = useMutation({ mutationFn: () => postJson<ModelKendaraan>(`/api/rencana/${encodeURIComponent(id)}/model`, {}), onSuccess: result => {
    cache.setQueryData(["model", result.id], result); void cache.invalidateQueries({ queryKey: ["rencana", id] }); setNotice(null);
  } });
  const turn = useMutation({ mutationFn: async ({ text, file }: { text: string; file?: File }) => {
    const form = new FormData(); form.set("text", text); if (file) form.set("file", file);
    return postTurn<TurnResponse<RencanaInspeksi>>(`/api/rencana/${encodeURIComponent(id)}/turn`, form, setStatus);
  }, onMutate: ({ text, file }) => { setOptimistic([{ id: "pending", role: "user", text, pendingFile: file, created_at: new Date().toISOString() }]); setStatus(file ? "Reading the attachment…" : "Lumo is reading…"); }, onSuccess: result => {
    setFlashed(result.data.items.filter(i => !plan?.items.some(old => old.id === i.id)).map(i => i.id));
    cache.setQueryData(["rencana", id], { ...result.data, messages: result.messages });
    void cache.invalidateQueries({ queryKey: ["rencana"], exact: true }); setTab("items");
  }, onSettled: () => { setOptimistic([]); void cache.invalidateQueries({ queryKey: ["rencana", id] }); } });
  function setPin(value: boolean) { setPinPreference(value); try { localStorage.setItem("pramana.chat-pin", String(value)); } catch {} }
  async function saveItems(items: ItemRencana[]) { await patch.mutateAsync({ items }); }
  const focused = plan?.items.find(i => i.id === (hovered || selected));
  const busy = patch.isPending || turn.isPending || !!plan?.diarsipkan;
  if (planQuery.isLoading) return <div className="p-6"><Spinner label="Loading inspection plan…"/></div>;
  if (planQuery.error || !plan) return <div className="p-6"><ErrorState error={planQuery.error || "Inspection plan not found."}/></div>;
  return <div className="h-dvh flex flex-col min-w-0">
    <header className="px-6 py-3.5 border-b border-[var(--color-line)] flex flex-wrap items-center justify-between gap-3 shrink-0">
      <div className="min-w-0 flex-1"><p className="t-data muted truncate">Inspection plans / {plan.id}</p><h1 className="sr-only">Inspection plan editor</h1><input aria-label="Plan title" className="t-title mt-1 bg-transparent w-full min-w-0 rounded focus:bg-[var(--color-surface-muted)]" key={plan.judul} defaultValue={plan.judul} maxLength={160} disabled={busy} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { e.currentTarget.value = plan.judul; e.currentTarget.blur(); } }} onBlur={e => { const judul = e.target.value.trim(); if (judul && judul !== plan.judul) patch.mutate({ judul }); else e.target.value = plan.judul; }}/></div>
      <div className="text-right"><p className="t-body-sm muted">{plan.tipe_kendaraan}</p><p className="t-label muted font-normal mt-1">{plan.items.length} items · {patch.isPending ? "Saving…" : turn.isPending ? "Lumo is working…" : "Saved automatically"}</p></div>
    </header>
    {(patch.error || generate.error) && <div className="px-4 pt-2"><ErrorState error={patch.error || generate.error!}/></div>}
    {plan.diarsipkan && <div className="p-3 flex gap-3 items-center bg-[var(--color-warning-subtle)]"><p className="t-body">This plan is archived.</p><button className="btn btn-secondary" onClick={() => patch.mutate({ diarsipkan: false })}>Restore plan</button></div>}
    <div className={`flex-1 min-h-0 flex ${pinned ? "flex-row" : "flex-col"}`}>
      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto @container">
        <div className={`grid grid-cols-1 min-h-full ${pinned ? "@2xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,1fr)]" : "@2xl:grid-cols-[minmax(0,1.35fr)_minmax(380px,1fr)]"}`}>
          <section className="p-5 min-w-0" aria-label="Vehicle model">
            <div className="flex flex-wrap gap-2 items-center mb-4"><h2 className="t-label-caps muted mr-auto">Vehicle model</h2>{model && <span className={`pill t-label ${model.status === "siap" ? "pill-baik" : "pill-warning"}`}>{model.status === "siap" ? "Ready" : model.status === "proses" ? "Generating" : "Failed"}</span>}
              <div className="relative" ref={menuRef}><button className="btn btn-secondary t-body" aria-expanded={menu} disabled={busy} onClick={() => setMenu(!menu)}>Change model<ChevronDown size={14}/></button>{menu && <div className="panel floating pop-in absolute right-0 top-full mt-2 w-56 z-20 p-1"><button className="t-body w-full text-left flex gap-2 items-center p-2 rounded hover:bg-[var(--color-surface-muted)]" onClick={() => { setPicker(true); setMenu(false); }}><Box size={16}/>Use an existing model</button><button className="t-body w-full text-left flex gap-2 items-center p-2 rounded hover:bg-[var(--color-surface-muted)]" onClick={() => { generate.mutate(); setMenu(false); }}><Sparkles size={16}/>Generate a new model</button></div>}</div>
            </div>
            {notice && <p role="status" className="t-body-sm muted mb-3">{notice}</p>}
            {picker && <div className="panel p-3 mb-3 space-y-2"><div className="flex justify-between items-center"><h3 className="t-heading">Choose a vehicle model</h3><button className="t-body-sm muted" onClick={() => setPicker(false)}>Cancel</button></div>{models.isLoading && <Spinner/>}{models.error && <ErrorState error={models.error}/>}<div className="grid gap-2">{models.data?.map(m => <button key={m.id} className="btn btn-secondary t-body justify-start !whitespace-normal text-left" disabled={busy} onClick={async () => { try { await patch.mutateAsync({ model_id: m.id }); setPicker(false); setNotice("Model linked. Open an item to map it to a component, or ask Lumo to map the plan."); } catch {} }}><Box size={16} className="shrink-0"/><span>{m.nama}<span className="t-body-sm muted block">{m.komponen.length} components</span></span></button>)}</div></div>}
            <div className={`panel overflow-hidden ${pinned ? "h-[min(52vh,520px)]" : "h-[min(58vh,620px)]"}`}>
              {model && model.status !== "siap" ? <GenerationStage model={model}/> : plan.model_id ? <VehicleModel modelId={plan.model_id} version={model?.updated_at} focus={focused?.comp_id} onPick={comp => { const item = plan.items.find(i => i.comp_id === comp); if (item) { setSelected(item.id); setTab("items"); } }} className="h-full w-full p-3"/> : <div className="h-full flex flex-col justify-center items-center text-center p-6 gap-3"><MascotHero pose="berpikir" size={96}/><h3 className="t-heading">Bring your vehicle into view</h3><p className="t-body-sm muted max-w-prose">Choose an existing model to connect inspection items to the vehicle.</p><button className="btn btn-secondary" onClick={() => setPicker(true)} disabled={busy}><Box size={16}/>Choose a model</button></div>}
            </div>
            <div className="mt-4 min-h-7">{focused ? <span className="pill pill-dugaan t-body-sm gap-2 max-w-full"><Box size={14} className="shrink-0"/><span className="truncate">{focused.nama}{model ? ` · ${model.komponen.length} components` : ""}</span></span> : <p className="t-body-sm muted">Select an item, or click a vehicle component to open its check.</p>}</div>
          </section>
          <section className="p-4 min-w-0 bg-[var(--color-surface)] border-t @2xl:border-t-0 @2xl:border-l border-[var(--color-line)]" aria-label="Plan details">
            <div className="seg mb-4 flex-wrap" aria-label="Plan detail sections"><button className="t-body" aria-pressed={tab === "items"} onClick={() => setTab("items")}>Items · {plan.items.length}</button>{(plan.spec_file_id || !!plan.spec_fakta?.length) && <button className="t-body" aria-pressed={tab === "spec"} onClick={() => setTab("spec")}>Spec Sheet</button>}{!!plan.catatan_agent.length && <button className="t-body" aria-pressed={tab === "notes"} onClick={() => setTab("notes")}>Agent notes</button>}</div>
            {tab === "items" && <PlanItems items={plan.items} model={model} selected={selected} select={setSelected} hover={setHovered} save={saveItems} disabled={busy} flashed={flashed}/>}
            {tab === "spec" && <div className="space-y-4">{plan.spec_file_id && <a href={`/api/files/${encodeURIComponent(plan.spec_file_id)}`} target="_blank" rel="noreferrer" className="btn btn-secondary t-body"><FileText size={16}/>Open original Spec Sheet</a>}<dl className="space-y-4">{plan.spec_fakta?.map((fact, i) => <div key={i}><dt className="t-label muted">{fact.label}</dt><dd className="t-body mt-1">{fact.nilai}</dd></div>)}</dl></div>}
            {tab === "notes" && <ul className="space-y-4 t-body">{plan.catatan_agent.map((note, i) => <li className="flex gap-2" key={i}><Sparkles size={15} className="text-[var(--color-primary)] shrink-0 mt-1"/><span>{note}</span></li>)}</ul>}
          </section>
        </div>
      </div>
      <PlannerChat messages={[...plan.messages, ...optimistic]} pinned={pinned} setPinned={setPin} busy={turn.isPending} status={status} error={turn.error} disabled={patch.isPending || !!plan.diarsipkan} send={async (text, file) => { await turn.mutateAsync({ text, file }); }}/>
    </div>
  </div>;
}
