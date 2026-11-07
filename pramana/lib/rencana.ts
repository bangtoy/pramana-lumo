import { RencanaInspeksi } from "./contracts.ts";
import { getRencana, saveRencana, newId, now } from "./db.ts";
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
