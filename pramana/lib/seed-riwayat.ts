import type { DatabaseSync } from 'node:sqlite';
import { LaporanInspeksi, RencanaInspeksi, WorkOrder, type HasilItem } from './contracts.ts';
import { jakartaDay, jakartaIso } from './waktu.ts';
import { verdict } from './rules.ts';

type Issue = 'tyre' | 'brake' | 'hydraulic' | 'leak' | 'light' | 'body' | 'gate';
type Entry = [daysAgo: number, unit: number, ...issues: Issue[]];
// 40 historical inspections, followed by today's six inspected units.
const history: Entry[] = [
  [13, 1], [13, 2, 'light'], [13, 7, 'tyre'],
  [12, 3, 'brake'], [12, 4], [12, 5],
  [11, 6, 'gate'], [11, 7, 'hydraulic'], [11, 8, 'brake'],
  [10, 1], [10, 2], [10, 7, 'tyre'],
  [9, 3, 'brake'], [9, 4, 'body'], [9, 5],
  [8, 6], [8, 7, 'hydraulic'], [8, 8],
  [7, 1], [7, 2, 'light'], [7, 7, 'tyre'],
  [6, 3, 'brake'], [6, 4], [6, 5],
  [5, 6], [5, 7, 'tyre', 'hydraulic'], [5, 8, 'brake'],
  [4, 1], [4, 2], [4, 3],
  [3, 4], [3, 5], [3, 7, 'hydraulic'],
  [2, 1], [2, 2, 'light'], [2, 6], [2, 7, 'tyre'],
  [1, 3], [1, 5, 'tyre'], [1, 8],
  [0, 1], [0, 2], [0, 3, 'brake'], [0, 4], [0, 6], [0, 7, 'tyre', 'leak'],
];
const issues: Record<Issue, { comp: string; stop: boolean; note: string; title: string; action: string; unable?: boolean }> = {
  tyre: { comp: 'ban_roda', stop: true, note: 'Approximately 6 cm sidewall bulge on the left rear outer tyre. Keep the unit out of service.', title: 'Replace the damaged left rear tyre', action: 'Replace the tyre with the sidewall bulge. Check tyre pressure and wheel-nut torque before a safe reinspection.' },
  brake: { comp: 'rem', stop: true, note: 'Air pressure drops below 6 bar within two minutes; hissing is audible at the tank connection.', title: 'Repair the air brake leak', action: 'Inspect the leaking tank connection and repair the fault. Verify pressure retention and braking function before release.' },
  hydraulic: { comp: 'silinder_hidraulik', stop: false, note: 'Oil seepage around the left hydraulic hose coupling; no active dripping observed.', title: 'Repair the hydraulic coupling seal', action: 'Inspect the coupling and seal, repair the source of seepage and verify operation safely.' },
  leak: { comp: 'silinder_hidraulik', stop: true, note: 'Active hydraulic oil leak at the left cylinder hose coupling. Keep the body lowered and the unit out of service.', title: 'Repair the leaking hydraulic hose coupling', action: 'Isolate the hydraulic system, repair the leaking coupling and test for leaks before release.' },
  light: { comp: 'lampu_reflector', stop: false, note: 'Rear right indicator is dim but still flashing; the lens is clean.', title: 'Repair the dim rear right indicator', action: 'Check the bulb, connector and power supply. Repair the fault and verify indicator visibility.' },
  body: { comp: 'bak_dump', stop: false, unable: true, note: 'Residual load prevents a safe view of the dump-body floor.', title: '', action: '' },
  gate: { comp: 'pintu_dump', stop: false, note: 'Tailgate latch is stiff but engages fully. Inspect and lubricate the mechanism.', title: 'Service the tailgate latch', action: 'Inspect and lubricate the latch, then verify full engagement and secure locking.' },
};
const work: { report: number; issue: Issue; closed?: boolean; mechanic: string | null; dueAgo: number }[] = [
  { report: 2, issue: 'tyre', closed: true, mechanic: 'Joko', dueAgo: 12 },
  { report: 3, issue: 'brake', closed: true, mechanic: 'Hendra', dueAgo: 11 },
  { report: 6, issue: 'gate', closed: true, mechanic: 'Rahmat', dueAgo: 10 },
  { report: 11, issue: 'tyre', closed: true, mechanic: 'Joko', dueAgo: 9 },
  { report: 12, issue: 'brake', closed: true, mechanic: 'Hendra', dueAgo: 8 },
  { report: 16, issue: 'hydraulic', mechanic: 'Rahmat', dueAgo: -1 },
  { report: 19, issue: 'light', mechanic: null, dueAgo: 3 },
  { report: 26, issue: 'brake', mechanic: 'Hendra', dueAgo: 2 },
  { report: 32, issue: 'hydraulic', mechanic: 'Rahmat', dueAgo: 1 },
  { report: 38, issue: 'tyre', mechanic: 'Joko', dueAgo: 0 },
  { report: 42, issue: 'brake', mechanic: 'Hendra', dueAgo: 0 },
];
const pad = (n: number) => String(n).padStart(2, '0');

export function seedRiwayat(db: DatabaseSync, at: Date = new Date()) {
  if (db.prepare('SELECT 1 FROM laporan WHERE id=?').get('LI-RW-00')) return;
  const original = db.prepare('SELECT data FROM laporan WHERE id=?').get('LI-2026-10-29-DT07');
  const current = db.prepare('SELECT data FROM rencana WHERE id=?').get('RI-DT-UTYPE-01');
  const snapshot = original ? JSON.parse(String(original.data)).rencana_snapshot : current ? JSON.parse(String(current.data)) : null;
  if (!snapshot) return;
  const plan = RencanaInspeksi.parse(snapshot);
  if (Object.values(issues).some(issue => !plan.items.some(item => item.comp_id === issue.comp))) return;
  const reports = history.map(([ago, number, ...problems], index) => {
    const minute = index >= 40 ? [48, 55, 64, 75, 86, 102][index - 40] : 45 + (index * 7) % 58;
    const submitted = jakartaIso(ago, 6, minute, at);
    const hasil: Record<string, HasilItem> = Object.fromEntries(plan.items.map(item => [item.id, {
      status: 'baik', stop: false, catatan: 'Checked; no abnormality observed.', bukti_ids: [], dicatat_at: submitted, ditangani: false,
    }]));
    for (const problem of problems) {
      const issue = issues[problem], item = plan.items.find(item => item.comp_id === issue.comp)!;
      hasil[item.id] = {
        status: issue.unable ? 'tidak_bisa_diperiksa' : 'tidak_baik', stop: issue.stop,
        catatan: issue.note, alasan: issue.unable ? 'Unload the remaining material before inspecting the floor.' : null,
        bukti_ids: problem === 'tyre' && number === 7 ? ['FILE-DT07-SISI-KIRI', 'FILE-DT07-BAN'] : [],
        dicatat_at: submitted, ditangani: false,
      };
    }
    const report = LaporanInspeksi.parse({
      id: `LI-RW-${pad(index)}`, rencana_id: plan.id, rencana_snapshot: plan,
      petugas: ['Budi Santoso', 'Sinta Aryani', 'Bayu Pratama', 'Dewi Lestari'][index % 4],
      lokasi: number % 2 ? 'Pit 2' : 'Pit 3', unit: `DT-${pad(number)} · B ${number === 7 ? '9123' : `91${pad(number)}`} KD`,
      status: 'terkirim', hasil, messages: [], agent_history: [], started_at: jakartaIso(ago, 6, minute - 10, at), submitted_at: submitted,
    });
    report.ringkasan = verdict(report); return report;
  });
  const orders = work.map((entry, index) => {
    const report = reports[entry.report], issue = issues[entry.issue];
    const item = plan.items.find(item => item.comp_id === issue.comp)!;
    if (entry.closed) report.hasil[item.id].ditangani = true;
    return WorkOrder.parse({
      id: `WO-RW-${pad(index)}`, laporan_id: report.id, item_id: item.id, unit: report.unit,
      judul: issue.title, tindakan: issue.action, prioritas: issue.stop ? 'tinggi' : 'sedang',
      status: entry.closed ? 'selesai' : 'terbuka', mekanik: entry.mechanic, target: jakartaDay(entry.dueAgo, at),
      catatan_selesai: entry.closed ? 'Repair completed and function verified by the mechanic.' : null,
      selesai_at: entry.closed ? jakartaIso(entry.dueAgo, 9, 30, at) : null, created_at: report.submitted_at,
    });
  });
  db.exec('BEGIN IMMEDIATE');
  try {
    // Another worker may have finished the seed while this connection waited.
    if (db.prepare('SELECT 1 FROM laporan WHERE id=?').get('LI-RW-00')) { db.exec('COMMIT'); return; }
    const stamp = at.toISOString();
    db.prepare('INSERT OR IGNORE INTO files(id,ref,mime,name,caption,created_at) VALUES (?,?,?,?,?,?)')
      .run('FILE-DT07-SISI-KIRI', 'public:demo/truk-sisi-kiri.jpg', 'image/jpeg', 'DT-07 left side.jpg', 'DT-07 left side', stamp);
    const insertReport = db.prepare('INSERT OR IGNORE INTO laporan(id,data,status,updated_at) VALUES (?,?,?,?)');
    for (const report of reports) insertReport.run(report.id, JSON.stringify(report), report.status, stamp);
    const insertOrder = db.prepare('INSERT OR IGNORE INTO work_order(id,laporan_id,data,updated_at) VALUES (?,?,?,?)');
    for (const order of orders) insertOrder.run(order.id, order.laporan_id, JSON.stringify(order), stamp);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
