import { z } from 'zod';
import { database, getWorkOrder, listWorkOrders, newId, now, saveLaporan, saveWorkOrder } from './db.ts';
import type { WorkOrder } from './contracts.ts';
import { requireReport } from './laporan.ts';
import { fail } from './http.ts';
import { assertTurnIdle } from './agents/turn.ts';
import { draftWorkOrders, WorkOrderDraft } from './agents/penyusun-wo.ts';
import { pendingWorkOrderFindings } from './work-order-rules.ts';
import { jakartaDay } from './waktu.ts';

export const CreateWorkOrders = z.object({ laporan_id: z.string().trim().min(1) }).strict();

const CalendarDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.').refine(value => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Choose a valid calendar date.');
export const WorkOrderPatch = z.object({
  status: z.enum(['terbuka', 'selesai']).optional(),
  mekanik: z.string().trim().max(120).nullable().optional(),
  target: CalendarDay.nullable().optional(),
  catatan_selesai: z.string().trim().max(2000).nullable().optional(),
}).strict();

export function requireWorkOrder(id: string): WorkOrder {
  const order = getWorkOrder(id);
  if (!order) fail('Work order not found.', 404);
  return order;
}

function transaction<T>(work: () => T): T {
  const db = database(); db.exec('BEGIN IMMEDIATE');
  try { const result = work(); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}

function applyPatch(order: WorkOrder, patch: z.infer<typeof WorkOrderPatch>): WorkOrder {
  const updated = { ...order, ...patch };
  if (patch.mekanik !== undefined) updated.mekanik = patch.mekanik || null;
  if (updated.status === 'terbuka') { updated.selesai_at = null; updated.catatan_selesai = null; }
  else if (order.status !== 'selesai') updated.selesai_at = now();
  saveWorkOrder(updated); return updated;
}

export function updateWorkOrder(order: WorkOrder, input: unknown): WorkOrder {
  const patch = WorkOrderPatch.parse(input);
  return transaction(() => {
    // Reload inside the transaction so a stale caller cannot replace newer fields.
    const current = requireWorkOrder(order.id);
    assertTurnIdle(current.laporan_id);
    const report = requireReport(current.laporan_id), finding = report.hasil[current.item_id];
    if (report.status !== 'terkirim' || !finding) fail('Choose a recorded finding in a submitted report.');
    const updated = applyPatch(current, patch);
    report.hasil[current.item_id] = { ...finding, ditangani: updated.status === 'selesai' };
    saveLaporan(report); return updated;
  });
}

export function syncItemDitangani(reportId: string, itemId: string, handled: boolean) {
  return transaction(() => {
    assertTurnIdle(reportId);
    const report = requireReport(reportId), finding = report.hasil[itemId];
    if (report.status !== 'terkirim' || !finding) fail('Choose a recorded finding in a submitted report.');
    for (const order of listWorkOrders(reportId).filter(w => w.item_id === itemId)) {
      applyPatch(order, {
        status: handled ? 'selesai' : 'terbuka',
        ...(handled && order.status !== 'selesai' ? { catatan_selesai: 'Marked handled from the inspection report.' } : {}),
      });
    }
    report.hasil[itemId] = { ...finding, ditangani: handled }; saveLaporan(report);
    return report;
  });
}

export async function createWorkOrders(reportId: string, draft = draftWorkOrders): Promise<WorkOrder[]> {
  const report = requireReport(reportId);
  if (report.status !== 'terkirim') fail('Submit the inspection before creating work orders.');
  const candidates = pendingWorkOrderFindings(report, listWorkOrders(reportId));
  if (!candidates.length) return [];
  let suggestions: WorkOrderDraft[] = [];
  try { suggestions = WorkOrderDraft.array().parse(await draft(reportId, candidates)); } catch { /* Fall back per finding. */ }

  return transaction(() => {
    assertTurnIdle(reportId);
    const current = requireReport(reportId), created: WorkOrder[] = [];
    // Recheck under the database write lock: overlapping POSTs cannot duplicate.
    for (const { item, finding } of pendingWorkOrderFindings(current, listWorkOrders(reportId))) {
      const matching = suggestions.filter(s => s.item_id === item.id);
      const suggestion = matching.length === 1 ? matching[0] : undefined;
      const order: WorkOrder = {
        id: newId('WO'), laporan_id: reportId, item_id: item.id, unit: current.unit,
        judul: suggestion?.judul || `Repair ${item.nama}`,
        tindakan: suggestion?.tindakan || finding.catatan,
        prioritas: finding.stop ? 'tinggi' : 'sedang',
        status: 'terbuka', mekanik: null, target: jakartaDay(finding.stop ? 0 : -2),
        catatan_selesai: null, selesai_at: null, created_at: now(),
      };
      saveWorkOrder(order); created.push(order);
      current.hasil[item.id] = { ...finding, ditangani: false };
    }
    if (created.length) saveLaporan(current);
    return created;
  });
}
