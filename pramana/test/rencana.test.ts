import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), "pramana-plan-"));
const { createPlan, patchPlan, setPlanItems, normalizeItems } = await import("../lib/rencana.ts");
const { getRencana } = await import("../lib/db.ts");
const { compactHistory } = await import("../lib/agents/client.ts");
const { lockTurn, assertTurnIdle } = await import("../lib/agents/turn.ts");
const { ItemRencana } = await import("../lib/contracts.ts");

test("manual and agent safety edits enforce evidence, STOP, IDs and model mapping", () => {
  const plan = createPlan();
  const item = ItemRencana.parse({ id: "duplicate", urutan: 42, nama: "Tyres and wheel nuts", sumber: "manual", yang_dicek: "Check every wheel.", bukti: [], kondisi_stop: null, comp_id: "ban_roda" });
  const updated = patchPlan(plan.id, { model_id: "MDL-DT-UTYPE", items: [item, { ...item, nama: "Brakes", comp_id: "no-such-component" }] });
  assert.equal(updated.items[0].comp_id, "ban_roda");
  assert.equal(updated.items[1].comp_id, null);
  assert.notEqual(updated.items[0].id, updated.items[1].id);
  assert.deepEqual(updated.items.map(i => i.urutan), [1, 2]);
  assert.ok(updated.items.every(i => i.kondisi_stop && i.bukti.some(b => b.jenis === "foto" && b.wajib)));
  assert.throws(() => patchPlan(plan.id, { model_id: "missing" }), /ready vehicle model/);
  assert.throws(() => setPlanItems(plan.id, { judul: "Test", tipe_kendaraan: "Truck", items: [{ ...item, sumber: "spec" }], catatan_agent: [], spec_fakta: [] }), /Spec Sheet evidence/);
  assert.equal(getRencana(plan.id)?.items.length, 2);
  const result = normalizeItems([{ ...item, nama: "Steering", comp_id: null }], null);
  assert.ok(result[0].kondisi_stop?.includes("Steering"));
});

test("conversation lock rejects concurrent turns and edits", () => {
  const unlock = lockTurn("test-plan");
  assert.throws(() => assertTurnIdle("test-plan"), /still working/);
  assert.throws(() => lockTurn("test-plan"), /still working/);
  unlock();
  assert.doesNotThrow(() => assertTurnIdle("test-plan"));
});

test("history omits tool messages and base64 and keeps the last 30 user/assistant messages", () => {
  const history = compactHistory([
    { role: "system", content: "Do not keep" }, { type: "function_call_result", output: "Do not keep" },
    ...Array.from({ length: 35 }, (_, i) => ({ role: i % 2 ? "user" : "assistant", content: `message ${i}` })),
    { role: "user", content: [{ type: "input_text", text: "[file FILE-DT07-BAN]" }, { type: "input_image", image: "data:image/jpeg;base64,aGVsbG8=" }] },
  ]);
  assert.equal(history.length, 30);
  assert.ok(history.every(i => "role" in i && ["user", "assistant"].includes(i.role)));
  assert.ok(!JSON.stringify(history).includes("base64"));
  assert.ok(!JSON.stringify(history).includes("Do not keep"));
  assert.match(JSON.stringify(history.at(-1)), /FILE-DT07-BAN: /);
});
