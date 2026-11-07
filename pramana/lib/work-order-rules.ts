import type { HasilItem, ItemRencana, WorkOrder } from './contracts.ts';
import type { ReportView } from './rules.ts';

export type WorkOrderFinding = { item: ItemRencana; finding: HasilItem };
/** Shared eligibility rule for creation and the report's pending count. */
export function pendingWorkOrderFindings(report: ReportView, orders: WorkOrder[]): WorkOrderFinding[] {
  if (report.status !== 'terkirim') return [];
  const assigned = new Set(orders.filter(w => w.laporan_id === report.id).map(w => w.item_id));
  return (report.rencana_snapshot?.items || []).flatMap(item => {
    const finding = report.hasil[item.id];
    return finding?.status === 'tidak_baik' && !assigned.has(item.id) ? [{ item, finding }] : [];
  });
}
