import { listLaporan, listWorkOrders } from './db.ts';
import { filterLaporan, type LaporanFilter } from './laporan-filter.ts';
import type { LaporanInspeksi, WorkOrder } from './contracts.ts';
import { counts, itemsOf, unitCode, verdict } from './rules.ts';
import { dayKey, dayLabel, jakartaDay, lastDays } from './waktu.ts';
import { isWorkOrderOverdue, pendingWorkOrderFindings } from './work-order-rules.ts';

export const isTerlambat = isWorkOrderOverdue;
export type RingkasanUnit = {
  unit: string; plat: string; vonis: 'stop' | 'belum' | 'layak'; laporan_id: string;
  petugas: string | null; waktu: string; temuan: number; catatan: string;
  wo_terbuka: number; stop_tanpa_wo: boolean; temuan_tanpa_wo: number;
};
export type KomponenRingkasan = {
  nama: string; comp_id: string | null; kali: number; units: string[];
  berulang: { unit: string; kali: number } | null; laporan_terakhir: string;
};
const timestamp = (report: LaporanInspeksi) => report.submitted_at || report.started_at;

export function buildRingkasan(reports: LaporanInspeksi[], orders: WorkOrder[], hari = 14, at: Date = new Date()) {
  if (hari !== 7 && hari !== 14) throw new RangeError('Choose 7 or 14 days.');
  const today = jakartaDay(0, at), from = jakartaDay(13, at), weekStart = jakartaDay(6, at);
  const submitted = reports.filter(r => r.status === 'terkirim' && dayKey(timestamp(r)) <= today)
    .sort((a, b) => new Date(timestamp(b)).getTime() - new Date(timestamp(a)).getTime() || a.id.localeCompare(b.id));
  const recent = submitted.filter(r => dayKey(timestamp(r)) >= from);
  const open = orders.filter(w => w.status === 'terbuka');
  const latest = new Map<string, LaporanInspeksi>();
  for (const report of recent) if (report.unit?.trim() && !latest.has(unitCode(report.unit))) latest.set(unitCode(report.unit), report);
  const units: RingkasanUnit[] = [...latest].map(([unit, report]) => {
    const day = dayKey(timestamp(report)), c = counts(report);
    const vonis = day !== today ? 'belum' : c.stop ? 'stop' : 'layak';
    const finding = itemsOf(report).find(item => report.hasil[item.id]?.status === 'tidak_baik');
    const catatan = vonis === 'belum' ? `Last inspection ${dayLabel(day)}` : finding ? `${finding.nama}: ${report.hasil[finding.id].catatan}` : c.tidak_bisa_diperiksa ? `${c.tidak_bisa_diperiksa} item${c.tidak_bisa_diperiksa === 1 ? '' : 's'} could not be inspected.` : `${c.baik} items good`;
    return {
      unit, plat: report.unit?.split('·').slice(1).join('·').trim() || '', vonis,
      laporan_id: report.id, petugas: report.petugas, waktu: timestamp(report), temuan: c.tidak_baik, catatan,
      wo_terbuka: open.filter(w => unitCode(w.unit) === unit).length,
      stop_tanpa_wo: vonis === 'stop' && !orders.some(w => w.laporan_id === report.id),
      temuan_tanpa_wo: pendingWorkOrderFindings(report, orders).length,
    };
  });
  const rank = { stop: 0, belum: 1, layak: 2 };
  units.sort((a, b) => rank[a.vonis] - rank[b.vonis] || a.unit.localeCompare(b.unit));
  const week = submitted.filter(r => dayKey(timestamp(r)) >= weekStart);
  const kpi = {
    unit_total: units.length, unit_diperiksa: units.filter(u => u.vonis !== 'belum').length,
    layak: units.filter(u => u.vonis === 'layak').length, stop: units.filter(u => u.vonis === 'stop').length,
    belum_p2h: units.filter(u => u.vonis === 'belum').length,
    wo_terbuka: open.length, wo_tinggi: open.filter(w => w.prioritas === 'tinggi').length,
    wo_terlambat: open.filter(w => isTerlambat(w, today)).length,
    stop_tanpa_wo: units.filter(u => u.stop_tanpa_wo).length,
    laporan_7h: week.length, stop_7h: week.filter(r => counts(r).stop).length,
  };
  const dailyHistory = lastDays(14, at).map(tanggal => {
    const daily = submitted.filter(r => dayKey(timestamp(r)) === tanggal);
    const stop = daily.filter(r => counts(r).stop).length;
    return { tanggal, label: dayLabel(tanggal), layak: daily.length - stop, stop };
  });
  const tren = dailyHistory.slice(-hari);
  const sparkline = {
    laporan: dailyHistory.map(day => day.layak + day.stop), layak: dailyHistory.map(day => day.layak),
    stop: dailyHistory.map(day => day.stop), wo: dailyHistory.map(day => orders.filter(w => dayKey(w.created_at) === day.tanggal).length),
  };
  const components = new Map<string, { nama: string; comp_id: string | null; kali: number; perUnit: Map<string, number>; laporan_terakhir: string }>();
  for (const report of recent) for (const item of itemsOf(report)) {
    if (report.hasil[item.id]?.status !== 'tidak_baik') continue;
    const key = item.comp_id || item.nama.trim().toLowerCase();
    const component = components.get(key) || { nama: item.nama, comp_id: item.comp_id, kali: 0, perUnit: new Map<string, number>(), laporan_terakhir: report.id };
    component.kali++;
    const unit = unitCode(report.unit); component.perUnit.set(unit, (component.perUnit.get(unit) || 0) + 1);
    components.set(key, component);
  }
  const komponen: KomponenRingkasan[] = [...components.values()].map(({ perUnit, ...component }) => {
    const repeated = [...perUnit].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    return { ...component, units: [...perUnit.keys()].sort(), berulang: repeated && repeated[1] >= 2 ? { unit: repeated[0], kali: repeated[1] } : null };
  }).sort((a, b) => b.kali - a.kali || a.nama.localeCompare(b.nama)).slice(0, 6);
  const terbaru = submitted.slice(0, 8).map(report => ({
    id: report.id, unit: unitCode(report.unit), petugas: report.petugas, waktu: timestamp(report),
    judul: verdict(report), stop: counts(report).stop > 0, tidak_baik: counts(report).tidak_baik,
  }));
  return { hari, hari_ini: today, diperbarui_at: at.toISOString(), kpi, units, tren, sparkline, komponen, terbaru };
}
export type Ringkasan = ReturnType<typeof buildRingkasan>;

export function ringkasan(hari = 14): Ringkasan {
  return buildRingkasan(listLaporan('terkirim'), listWorkOrders(), hari);
}

/** Report search shared by dashboard links, the report API and the analyst. */
export function cariLaporan(filter: LaporanFilter = {}) {
  return filterLaporan(listLaporan('terkirim'), listWorkOrders(), filter);
}
