if (!process.env.DATA_DIR?.includes('field-simulation')) throw Error('Use an isolated field-simulation database.');
// Check before importing db.ts: its startup recovery can modify model jobs.
const { createReport, setHeader, requireReport } = await import('../lib/laporan.ts');
const { getRencana, saveLaporan, newId, now } = await import('../lib/db.ts');
const plan = getRencana('RI-DT-UTYPE-01');
const cases = [];
function focus(item) {
  const report = createReport();
  setHeader(report.id, { petugas: 'Kandar', lokasi: 'Riau', rencana_id: plan.id, unit: 'DT-SIM · SIMULATION' });
  saveLaporan({ ...requireReport(report.id), rencana_snapshot: { ...plan, items: [item] }, messages: [{ id: newId('MSG'), role: 'pramana', text: `Please share a photo of ${item.nama} and tell me what you found.`, created_at: now() }], agent_history: [] });
  return { index: item.urutan, itemId: item.id, itemName: item.nama, reportId: report.id };
}
if (process.env.SIM_SET === 'controls') {
  for (const [kind, index] of [['missing-photo', 2], ['unrelated-photo', 1], ['contradictory-tyre', 3], ['contradictory-prop', 6], ['unable-safe-check', 2]]) cases.push({ kind, ...focus(plan.items[index - 1]) });
  console.log(JSON.stringify(cases));
} else {
  for (const condition of ['Normal', 'Issue']) for (const item of plan.items) cases.push({ condition, ...focus(item) });
  console.log(JSON.stringify(cases));
  console.log(JSON.stringify({ fullReports: ['Normal', 'Issue'].map(condition => ({ condition, reportId: createReport().id })) }));
}
