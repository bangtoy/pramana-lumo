import { z } from 'zod';
import { database, listWorkOrders, newId, now, saveLaporan, saveWorkOrder } from './db.ts';
import type { WorkOrder } from './contracts.ts';
import { requireReport } from './laporan.ts';
import { fail } from './http.ts';
import { assertTurnIdle } from './agents/turn.ts';
import { draftWorkOrders, WorkOrderDraft } from './agents/penyusun-wo.ts';
import { pendingWorkOrderFindings } from './work-order-rules.ts';
import { jakartaDay } from './waktu.ts';

export const CreateWorkOrders = z.object({ laporan_id: z.string().trim().min(1) }).strict();

export async function createWorkOrders(reportId: string, draft = draftWorkOrders): Promise<WorkOrder[]> {
  const report = requireReport(reportId);
  if (report.status !== 'terkirim') fail('Submit the inspection before creating work orders.');
  const candidates = pendingWorkOrderFindings(report, listWorkOrders(reportId));
  if (!candidates.length) return [];
  let suggestions: WorkOrderDraft[] = [];
  try { suggestions = WorkOrderDraft.array().parse(await draft(reportId, candidates)); } catch { /* Fall back per finding. */ }

  const db = database();
  db.exec('BEGIN IMMEDIATE');
  try {
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
    db.exec('COMMIT'); return created;
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
