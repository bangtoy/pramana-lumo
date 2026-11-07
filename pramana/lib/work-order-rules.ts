import type { HasilItem, ItemRencana, WorkOrder } from './contracts.ts';
import type { ReportView } from './rules.ts';
import { jakartaDay } from './waktu.ts';

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

export function isWorkOrderOverdue(order: WorkOrder, today = jakartaDay()): boolean {
  return order.status === 'terbuka' && !!order.target && order.target < today;
}

export function sortWorkOrders(orders: WorkOrder[], today = jakartaDay()): WorkOrder[] {
  return [...orders].sort((a, b) =>
    Number(b.status === 'terbuka') - Number(a.status === 'terbuka') ||
    Number(isWorkOrderOverdue(b, today)) - Number(isWorkOrderOverdue(a, today)) ||
    Number(b.prioritas === 'tinggi') - Number(a.prioritas === 'tinggi') ||
    b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id));
}
