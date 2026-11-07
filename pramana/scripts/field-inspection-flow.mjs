import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const base = 'http://localhost:3007';
const assets = process.env.SIM_ASSETS || 'D:/Orca/example file/Foto-P2H/02-Dump-Truck-Tronton-U-Type';
const flows = JSON.parse(readFileSync(process.env.SIM_CASES, 'utf8').split(/\r?\n/).find(line => line.startsWith('{"fullReports"'))).fullReports;
const observations = {
  Normal: [
    'Kabin normal. Saya sudah cek sabuk mengunci, spion utuh, klakson bunyi; APAR segel utuh, gauge hijau dan belum kedaluwarsa.',
    'Rem sudah dites diam sesuai SOP: tekanan udara rentang operasi normal, low air padam, tidak bocor, rem parkir menahan dan respons rem servis normal.',
    'Semua ban dan mur kedua sisi sudah saya cek: normal, tidak ada benjolan atau sobekan besar, semua mur ada dan tidak longgar.',
    'Lantai bak, las dan dudukan sudah saya cek dari posisi aman: tidak retak, tidak deformasi atau longgar; hanya karat permukaan dan kotoran.',
    'Silinder, selang, sambungan dan seal sudah saya cek: kering tanpa kebocoran atau kerusakan. Foto dari sisi aman; bak diisolasi dan prop mekanis terpasang.',
    'Prop mekanis normal, lurus, duduk pada kedua dudukan dan pin terkunci; saya cek dari samping dengan isolasi aman, tidak masuk ke bawah bak.',
    'Engsel dan pin utuh; pintu sudah dites menutup rapat dan kedua pengunci mengunci baik. Hanya karat permukaan.',
    'Lampu depan, rem kiri-kanan dan semua sein sudah dites dengan bantuan rekan dari posisi aman: normal. Reflektor utuh. Foto hanya satu keadaan dari tes tersebut.',
  ],
  Issue: [
    'Sabuk pengaman robek dan label APAR sudah lewat masa berlaku. Kendaraan diparkir, tidak dioperasikan. Ini temuan pemeriksaan saya.',
    'LOW AIR menyala dan tekanan udara belum mencapai batas aman. Tes rem tidak dilanjutkan. Kendaraan tetap diam, rem parkir dan ganjal terpasang.',
    'Ada benjolan besar pada dinding ban dan satu mur roda hilang. Kendaraan tidak dioperasikan.',
    'Foto ini bagian lantai bak kendaraan yang diperiksa: pelat dan sambungan las retak struktural, ada lubang tembus. Kendaraan tidak dioperasikan.',
    'Oli hidraulik aktif menetes, coupling retak dan selang rusak. Sistem diisolasi; saya tidak menyentuh kebocoran atau masuk ke bawah bak.',
    'Prop bak bengkok, tidak bisa duduk atau dikunci pada dudukan bawah. Area dibatasi, tidak ada orang di bawah bak; tidak dioperasikan.',
    'Pengunci pintu bak rusak; pintu tidak menutup atau mengunci rapat dan material tercecer. Kendaraan tidak dioperasikan.',
    'Tes diam dengan bantuan rekan: lampu rem kiri tidak menyala, kanan menyala; lensa kiri pecah. Kendaraan tidak dioperasikan.',
  ],
};
async function run(flow) {
  const evidence = { ...flow, base, note: 'Real agent and full eight-item plan. Direct checks are simulated operator reports, not measurements performed on a real vehicle.', turns: [] };
  const file = `../docs/verification/field-inspection-full-${flow.condition.toLowerCase()}.json`;
  const persist = () => writeFileSync(file, JSON.stringify(evidence, null, 2) + '\n');
  let report;
  async function turn(text, photo) {
    const start = Date.now(), form = new FormData(); form.set('text', text);
    if (photo) form.set('file', new File([readFileSync(photo)], `inspection-${evidence.turns.length}.jpg`, { type: 'image/jpeg' }));
    const response = await fetch(`${base}/api/laporan/${flow.reportId}/turn`, { method: 'POST', body: form, signal: AbortSignal.timeout(180000) });
    const raw = await response.text(); assert.ok(response.ok, raw);
    const events = raw.trim().split('\n').filter(Boolean).map(JSON.parse);
    assert.ok(!events.some(e => e.error), JSON.stringify(events.find(e => e.error)));
    report = events.at(-1).reply.data;
    evidence.turns.push({ input: text, photo: photo ? path.basename(photo) : null, seconds: (Date.now() - start) / 1000, reply: report.messages.at(-1).text, choices: report.messages.at(-1).quick_replies, count: Object.keys(report.hasil).length, status: report.status }); persist();
    console.log(JSON.stringify({ flow: flow.condition, ...evidence.turns.at(-1) }));
  }
  try {
    await turn(`Nama saya Kandar, lokasi Riau. Pakai rencana RI-DT-UTYPE-01 untuk unit ${flow.condition === 'Normal' ? 'DT-09 · B 9129 KD' : 'DT-10 · B 9130 KD'}. Kendaraan diparkir aman, terisolasi dan diganjal. Pemeriksaan dilakukan dari posisi aman, dengan petugas berwenang dan prop mekanis bila perlu.`);
    assert.equal(report.rencana_snapshot?.items.length, 8);
    assert.equal(Object.keys(report.hasil).length, 0);
    for (const item of report.rencana_snapshot.items) {
      const index = item.urutan - 1;
      const asset = readdirSync(path.join(assets, flow.condition)).find(name => name.startsWith(String(item.urutan).padStart(2, '0') + '-'));
      await turn(observations[flow.condition][index], path.join(assets, flow.condition, asset));
      assert.ok(report.hasil[item.id], `${flow.condition} blocked on ${item.nama}: ${report.messages.at(-1).text}`);
      assert.equal(Object.keys(report.hasil).length, item.urutan, 'Only the current item should advance');
      assert.equal(report.hasil[item.id].status, flow.condition === 'Normal' ? 'baik' : 'tidak_baik');
      assert.equal(report.hasil[item.id].stop, flow.condition === 'Issue');
    }
    assert.equal(report.status, 'berjalan', 'Submission requires a separate explicit instruction');
    await turn('Submit the completed inspection report now.');
    assert.equal(report.status, 'terkirim');
    evidence.result = { submitted: true, items: 8, stop: Object.values(report.hasil).filter(f => f.stop).length, findings: report.hasil, summary: report.ringkasan, turnCount: evidence.turns.length }; persist();
    return evidence.result;
  } catch (error) { evidence.error = error.message; persist(); throw error; }
}
const results = await Promise.allSettled(flows.map(run));
results.forEach((result, index) => console.log(JSON.stringify({ flow: flows[index].condition, ...result })));
if (results.some(result => result.status === 'rejected')) process.exitCode = 1;
