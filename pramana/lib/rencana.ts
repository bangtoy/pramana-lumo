import { z } from "zod";
import { ItemRencana, RencanaInspeksi } from "./contracts.ts";
import { getModel, getRencana, saveRencana, newId, now } from "./db.ts";
import { fail } from "./http.ts";

export function requirePlan(id: string) {
  const plan = getRencana(id);
  if (!plan) fail("Inspection plan not found.", 404);
  return plan;
}
export function createPlan() {
  const plan = RencanaInspeksi.parse({
    id: newId("RI"), judul: "Untitled inspection plan", tipe_kendaraan: "Not specified",
    model_id: null, items: [], catatan_agent: [], created_at: now(),
  });
  saveRencana(plan);
  return requirePlan(plan.id);
}

export const PlanPatch = z.object({
  judul: z.string().trim().min(1).max(160).optional(),
  tipe_kendaraan: z.string().trim().min(1).max(160).optional(),
  items: ItemRencana.extend({ nama: z.string().trim().min(1).max(160), yang_dicek: z.string().trim().min(1).max(3000) }).array().max(30).optional(),
  model_id: z.string().nullable().optional(),
  diarsipkan: z.boolean().optional(),
}).strict();

const safetyRules = [
  { match: /\b(rem|brakes?|air pressure)\b/i, stop: "Brake failure, air pressure loss or parking brake not holding." },
  { match: /\b(ban|tyres?|tires?|wheels?|roda)\b|ban_roda/i, stop: "Flat, torn or bulging tyre; missing or loose wheel nut." },
  { match: /\b(steering|kemudi|setir)\b/i, stop: "Steering locks, pulls strongly or has excessive free play." },
  { match: /\b(cabin|kabin|seat belt|sabuk|apar|extinguisher)\b/i, stop: "Seat belt, horn or reversing alarm fails; extinguisher missing or expired." },
  { match: /\b(lights?|lampu|reflectors?)\b|lampu_reflector/i, stop: "Brake light or turn signal does not work." },
  { match: /safety_bak|body prop|safety (prop|support|stay)|safety bak/i, stop: "Safety prop is missing, bent, unlocked or cannot be fitted." },
];

/** Safety requirements are enforced here for both manual and agent edits. */
export function normalizeItems(items: ItemRencana[], modelId: string | null): ItemRencana[] {
  const seen = new Set<string>();
  const model = modelId ? getModel(modelId) : null;
  return items.map((raw, index) => {
    const item = ItemRencana.parse(raw);
    const id = /^[A-Za-z0-9_-]{1,100}$/.test(item.id) && !seen.has(item.id) ? item.id : newId("ITEM");
    seen.add(id);
    const rule = safetyRules.find(rule => rule.match.test(`${item.comp_id || ""} ${item.nama}`));
    const bukti = [...item.bukti];
    if (rule && !bukti.some(b => b.jenis === "foto" && b.wajib)) bukti.push({ jenis: "foto", deskripsi: `Clear photo of ${item.nama.toLowerCase()}.`, wajib: true });
    // Unmapped is safer than highlighting an unrelated component.
    const comp_id = item.comp_id && model?.komponen.some(c => c.comp_id === item.comp_id) ? item.comp_id : null;
    return { ...item, id, urutan: index + 1, comp_id, bukti, kondisi_stop: item.kondisi_stop?.trim() || rule?.stop || null };
  });
}

export function patchPlan(id: string, input: unknown) {
  const patch = PlanPatch.parse(input);
  const plan = requirePlan(id);
  const modelId = patch.model_id === undefined ? plan.model_id : patch.model_id;
  if (modelId && getModel(modelId)?.status !== "siap") fail("Choose a ready vehicle model.");
  saveRencana({ ...plan, ...patch, items: normalizeItems(patch.items ?? plan.items, modelId) });
  return requirePlan(id);
}

export function useModel(id: string, modelId: string) {
  return patchPlan(id, { model_id: modelId });
}

export const AgentPlanUpdate = z.object({
  judul: z.string().min(1).max(160), tipe_kendaraan: z.string().min(1).max(160),
  items: ItemRencana.array().min(1).max(30), catatan_agent: z.string().array().max(20),
  spec_fakta: z.object({ label: z.string(), nilai: z.string() }).array().max(40),
});
export function setPlanItems(id: string, input: z.infer<typeof AgentPlanUpdate>) {
  const update = AgentPlanUpdate.parse(input);
  const plan = requirePlan(id);
  if (!plan.spec_file_id && (update.items.some(i => i.sumber === "spec") || update.spec_fakta.length)) fail("Spec Sheet evidence is required for document-derived items and facts.");
  const notes = [...update.catatan_agent];
  if (update.items.some(i => i.sumber === "standar") && !notes.length) notes.push("Standard P2H checks supplement the vehicle specification for pre-shift safety.");
  saveRencana({ ...plan, ...update, catatan_agent: notes, items: normalizeItems(update.items, plan.model_id) });
  return requirePlan(id);
}
