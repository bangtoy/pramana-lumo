import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const base = process.env.SIM_BASE || 'http://localhost:3005';
if (!/^http:\/\/localhost:300[567]$/.test(base)) throw Error('Use an isolated simulation server on port 3005, 3006 or 3007.');
const root = process.env.SIM_ASSETS || 'D:/Orca/example file/Foto-P2H/02-Dump-Truck-Tronton-U-Type';
const cases = JSON.parse(readFileSync(process.env.SIM_CASES, 'utf8').split(/\r?\n/).find(line => line.startsWith('[{')));
const normal = [
  'Saya sudah cek langsung: sabuk mengunci dan tidak rusak, spion utuh, klakson berbunyi. APAR ada, segel utuh, jarum di zona hijau, dan label belum kedaluwarsa. Foto ini hanya dokumentasi kabin; hasil pengecekan tersebut laporan pemeriksaan langsung saya.',
  'Saya sudah uji dengan kendaraan diam sesuai prosedur aman: tekanan udara pada rentang operasi normal kendaraan, lampu low air padam, tidak terdengar kebocoran, rem parkir menahan dan respons rem servis normal. Ini laporan tes langsung, bukan kesimpulan dari foto.',
  'Saya sudah periksa semua ban, sisi dalam dan luar, kedua sisi kendaraan: tidak ada benjolan, sobekan besar, kawat terbuka atau ban kempis. Semua mur roda ada dan tidak tampak longgar. Foto ini mewakili pemeriksaan saya.',
  'Saya sudah periksa lantai bak, sambungan las dan dudukan bak dari posisi aman: tidak ada retak struktural, deformasi atau dudukan longgar. Ada karat permukaan dan kotoran saja.',
  'Saya periksa silinder, selang, sambungan dan seal dari sisi luar setelah isolasi aman: semuanya kering, tidak ada kebocoran aktif atau selang rusak. Tidak masuk ke bawah bak; prop mekanis sudah terpasang oleh petugas berwenang.',
  'Prop mekanis ada, lurus, tidak rusak, sudah duduk pada dudukan atas dan bawah, dan pin pengunci terpasang. Pemeriksaan dari samping pada posisi aman setelah isolasi; tidak masuk ke bawah bak.',
  'Saya sudah periksa engsel, pin dan kedua pengunci pintu bak. Pintu menutup rapat dan kedua pengunci mengunci dengan baik. Ada karat permukaan, tidak ada pengunci patah atau pintu longgar.',
  'Saya sudah tes dengan bantuan rekan dari lokasi aman: lampu depan, lampu rem kiri-kanan dan semua sein berfungsi normal; reflektor utuh. Foto hanya satu kondisi saat tes, bukan bukti semua fungsi sekaligus.',
];
const issue = [
  'Temuan pemeriksaan langsung: sabuk pengaman robek dan label APAR sudah lewat masa berlaku. Kendaraan tetap diparkir dan tidak dioperasikan. Catat temuan ini.',
  'Lampu LOW AIR menyala dan tekanan udara belum mencapai batas operasi aman. Pengujian rem tidak dilanjutkan; kendaraan diam, direm parkir dan diganjal. Catat temuan ini.',
  'Ada benjolan besar pada dinding ban dan satu mur roda hilang seperti pada foto. Kendaraan tidak dioperasikan. Catat temuan ini.',
  'Foto ini bagian lantai bak kendaraan yang sedang diperiksa: ada retak struktural pada pelat dan las, serta lubang tembus. Kendaraan tidak dioperasikan. Catat temuan ini.',
  'Ada oli hidraulik aktif menetes dari sambungan silinder, coupling retak dan selang rusak. Sistem diisolasi, tidak mendekati semburan atau masuk ke bawah bak. Catat temuan ini.',
  'Prop pengaman bak bengkok dan tidak bisa duduk atau dikunci di dudukan bawah. Area dibatasi, tidak ada orang di bawah bak dan kendaraan tidak dioperasikan. Catat temuan ini.',
  'Pengunci pintu bak rusak; pintu tidak menutup atau mengunci rapat dan material tercecer. Kendaraan diparkir, tidak dioperasikan. Catat temuan ini.',
  'Tes diam dengan bantuan rekan: lampu rem kiri tidak menyala, kanan menyala, dan lensa kiri pecah. Kendaraan tidak dioperasikan. Catat temuan ini.',
];
const output = { label: process.env.SIM_LABEL, base, note: 'Controlled one-item snapshots of the real plan; operator confirmations are simulated scenario inputs, not real physical inspections.', cases: [] };
const persist = () => writeFileSync(process.env.SIM_OUT, JSON.stringify(output, null, 2) + '\n');
async function turn(id, text, bytes, name) {
  const form = new FormData(); form.set('text', text);
  if (bytes) form.set('file', new File([bytes], name, { type: 'image/jpeg' }));
  const start = Date.now();
  const response = await fetch(`${base}/api/laporan/${id}/turn`, { method: 'POST', body: form, signal: AbortSignal.timeout(180000) });
  const raw = await response.text();
  if (!response.ok) throw Error(`HTTP ${response.status}: ${raw.slice(0, 300)}`);
  const events = raw.trim().split('\n').filter(Boolean).map(JSON.parse);
  const failure = events.find(event => event.error);
  if (failure) throw Error(failure.error);
  const report = events.at(-1).reply.data;
  const message = report.messages.at(-1);
  return { seconds: (Date.now() - start) / 1000, text, reply: message.text, quickReplies: message.quick_replies, statuses: events.flatMap(event => event.status ? [event.status] : []), pills: message.pills, finding: report.hasil[cases.find(c => c.reportId === id).itemId] || null };
}
for (const c of cases) {
  const name = readdirSync(path.join(root, c.condition)).find(name => name.startsWith(String(c.index).padStart(2, '0') + '-'));
  const bytes = readFileSync(path.join(root, c.condition, name));
  const result = { ...c, asset: `${c.condition}/${name}`, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), turns: [] };
  output.cases.push(result);
  try {
    result.turns.push(await turn(c.reportId, c.condition === 'Normal' ? `Ini foto ${c.itemName}. Kondisinya normal, lanjut.` : `Ada masalah pada ${c.itemName}. Ini fotonya.`, bytes, `inspection-item-${c.index}.jpg`));
    const first = result.turns[0].finding;
    if (!first || (c.condition === 'Normal' ? first.status !== 'baik' || first.stop : first.status !== 'tidak_baik' || !first.stop)) {
      const quick = process.env.SIM_QUICK_CONFIRM === '1' && c.condition === 'Normal' ? result.turns[0].quickReplies?.find(reply => /checked|tested|normal|green|valid|secure|work/i.test(reply) && !/not|cannot|unsafe|unclear|need|haven|can't/i.test(reply)) : null;
      result.confirmationMode = quick ? 'agent quick reply (simulated completed direct check)' : 'detailed operator account';
      result.turns.push(await turn(c.reportId, quick || (c.condition === 'Normal' ? normal : issue)[c.index - 1]));
    }
    result.final = result.turns.at(-1).finding;
  } catch (error) { result.error = error.message; }
  persist();
  console.log(JSON.stringify({ label: output.label, condition: c.condition, index: c.index, turns: result.turns.length, first: result.turns[0]?.finding?.status || 'clarification', final: result.final?.status || 'unrecorded', stop: result.final?.stop, reply: result.turns.at(-1)?.reply, error: result.error }));
}
output.summary = Object.fromEntries(['Normal', 'Issue'].map(condition => {
  const rows = output.cases.filter(c => c.condition === condition);
  return [condition, { count: rows.length, firstTurnRecorded: rows.filter(c => c.turns[0]?.finding).length, finallyRecorded: rows.filter(c => c.final).length, good: rows.filter(c => c.final?.status === 'baik').length, stop: rows.filter(c => c.final?.stop).length, extraTurns: rows.filter(c => c.turns.length > 1).length, errors: rows.filter(c => c.error).length }];
})); persist(); console.log(JSON.stringify(output.summary, null, 2));
if (output.cases.some(c => c.error || !c.final || (c.condition === 'Normal' ? c.final.status !== 'baik' || c.final.stop : c.final.status !== 'tidak_baik' || !c.final.stop))) process.exitCode = 1;
