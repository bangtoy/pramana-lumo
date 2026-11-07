// Two real-agent P0 journeys. Requires the configured app and Playwright/Chrome.
// Photo fixtures represent a simulation; unverified safety checks remain STOP.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const base = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [], runs = [];
const seconds = start => +((performance.now() - start) / 1000).toFixed(2);
const api = async (path, options) => {
  const response = await fetch(`${base}${path}`, options);
  assert.ok(response.ok, `${path}: ${await response.clone().text()}`);
  return response.json();
};
function reply(body) {
  const events = body.trim().split('\n').map(JSON.parse);
  assert.ok(!events.some(e => e.error), JSON.stringify(events));
  assert.ok(events.at(-1).reply, body);
  return events.at(-1).reply;
}
function watch(page) {
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
}
try {
  for (let run = 1; run <= 2; run++) {
    const started = performance.now(), turns = [], focus = [], photoBytes = [];
    const draft = await api('/api/rencana', { method: 'POST' });
    // Same explicit model selection offered by Change model in the editor.
    await api(`/api/rencana/${draft.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model_id: 'MDL-DT-UTYPE' }) });
    const form = new FormData();
    form.set('file', new Blob([readFileSync('public/demo/spec-dump-truck.webp')], { type: 'image/webp' }), 'dump-truck-spec.webp');
    form.set('text', `Create an English P2H dump truck plan called Demo ${run} · Spec inspection from this specification sheet and the P2H standard. I have selected model MDL-DT-UTYPE. Make exactly 8 items in this order, mapped to these components: cabin and safety equipment (kabin), brakes (rem), tyres and wheel nuts (ban_roda), dump body (bak_dump), hydraulics and fluids (silinder_hidraulik), mechanical safety prop (safety_bak), tailgate (pintu_dump), lights (lampu_reflector). Keep check descriptions to 1–2 short sentences and evidence requests as brief phrases. Require photos and operator answers for functional checks; preserve all safety STOP criteria. Record legible spec facts and distinguish spec from standard additions.`);
    const planStart = performance.now();
    const planResponse = await fetch(`${base}/api/rencana/${draft.id}/turn`, { method: 'POST', body: form });
    const generated = reply(await planResponse.text()).data, planSeconds = seconds(planStart);
    assert.equal(generated.items.length, 8); assert.equal(generated.model_id, 'MDL-DT-UTYPE');
    assert.ok(generated.spec_fakta.length); assert.ok(generated.items.some(i => i.sumber === 'spec')); assert.ok(generated.items.some(i => i.sumber === 'standar'));
    assert.ok(generated.items.every(i => i.comp_id));
    console.log({ run, phase: 'spec-plan', planId: generated.id, seconds: planSeconds });
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); watch(desktop);
    await desktop.goto(`${base}/supervisor/agent?rencana=${generated.id}`, { waitUntil: 'networkidle' });
    const tyre = generated.items.find(i => i.comp_id === 'ban_roda');
    await desktop.getByText(tyre.nama, { exact: true }).first().click();
    await desktop.locator('.truck-svg [data-comp="ban_roda"].is-focus[aria-hidden="false"]').first().waitFor();
    await desktop.screenshot({ path: `../docs/verification/screenshots/integration-${run}-plan-1440.png` });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }); watch(page);
    const inspectionStart = performance.now();
    await page.goto(`${base}/petugas?baru=1`, { waitUntil: 'networkidle' });
    const composer = page.getByRole('textbox', { name: 'Message Lumo', exact: true }); await composer.waitFor();
    const reportId = await page.evaluate(() => localStorage.getItem('pramana.inspection-draft'));
    let report;
    async function send(text, photo, camera = false) {
      if (photo) {
        await page.getByLabel(camera ? 'Take an inspection photo' : 'Attach inspection photos', { exact: true }).setInputFiles(`public/demo/${photo}`);
        await page.getByText(/1\/5 photos ready ·/).waitFor();
      }
      await composer.fill(text);
      const start = performance.now();
      const answers = await page.locator('[role="log"] .bubble-pramana').count();
      await page.getByRole('button', { name: 'Send message', exact: true }).click();
      // Next may replace the initial draft URL while the response is streamed;
      // observe the rendered answer and authoritative report, not CDP body storage.
      await page.waitForFunction(expected => [...document.querySelectorAll('h2')].some(h => h.textContent === 'Inspection submitted') || (!document.querySelector('textarea')?.disabled && document.querySelectorAll('[role="log"] .bubble-pramana').length >= expected), answers + 1, { timeout: 180000 });
      report = await api(`/api/laporan/${reportId}`);
      turns.push({ seconds: seconds(start), recorded: Object.keys(report.hasil).length, reply: report.messages.at(-1).text });
      console.log({ run, phase: 'inspection', ...turns.at(-1) });
      return report.messages.at(-1);
    }
    const planId = run === 1 ? 'RI-DT-UTYPE-01' : generated.id;
    await send(`I am Alex at Tanjung Enim. Use inspection plan ${planId} for unit DEMO-${run} · B 910${run} KD. The truck is parked, isolated and chocked. This is a supervised demo inspection.`);
    assert.equal(report.rencana_id, planId); assert.equal(report.rencana_snapshot.items.length, 8);
    const unclear = await send('Please assess this fire extinguisher photo for the cabin safety check. Is the label readable enough to record a good result?', 'apar-jauh.jpg', true);
    assert.equal(Object.keys(report.hasil).length, 0, 'Distant photo must not establish good');
    assert.ok(unclear.pills?.some(p => p.kind === 'foto_kurang_jelas') || /close|clear|read|blur/i.test(unclear.text));
    await page.screenshot({ path: `../docs/verification/screenshots/integration-${run}-retake-390.png` });
    for (const item of report.rencana_snapshot.items) {
      await page.locator(`.truck-svg [data-comp="${item.comp_id}"].is-focus[aria-hidden="false"]`).first().waitFor();
      focus.push(item.comp_id);
      const isTyre = item.comp_id === 'ban_roda';
      const requiredPhotos = item.bukti.filter(b => b.jenis === 'foto' && b.wajib).length;
      for (let index = 1; index < requiredPhotos; index++) {
        await send(`Additional available view ${index} for ${item.nama}. I cannot obtain the required safe access or testing; this photo does not establish a good result. I will send the final available evidence and inspection account next.`, isTyre ? 'truk-sisi-kiri.jpg' : 'apar-jauh.jpg');
      }
      await send(isTyre ? `For ${item.nama}, the attached photo shows a tyre sidewall bulge. Record the defect and STOP; the vehicle must not operate.` : `For ${item.nama}, safe access and qualified functional testing are unavailable. Record cannot inspect, reason safe access and testing unavailable, and STOP pending safe reinspection. This attached photo documents only the available view; do not infer functionality or ask me to approach unsafe equipment.`, isTyre ? 'ban-benjol.jpg' : item.comp_id === 'kabin' ? 'apar-label.jpg' : 'truk-sisi-kiri.jpg');
      assert.ok(report.hasil[item.id], `${item.nama} must be recorded`);
      assert.equal(report.hasil[item.id].stop, true);
      assert.equal(report.hasil[item.id].status, isTyre ? 'tidak_baik' : 'tidak_bisa_diperiksa');
      for (const id of report.hasil[item.id].bukti_ids) {
        const photo = await fetch(`${base}/api/files/${id}`);
        assert.ok(photo.ok); const bytes = (await photo.arrayBuffer()).byteLength;
        photoBytes.push(bytes); assert.ok(bytes < 300 * 1024, `Photo ${bytes} bytes`);
      }
      if (focus.length === 1) {
        await page.reload({ waitUntil: 'networkidle' });
        await page.getByText(/1\/8 recorded/).waitFor();
        assert.equal(await page.evaluate(() => localStorage.getItem('pramana.inspection-draft')), reportId);
      }
    }
    await send('Submit this completed inspection report now.');
    assert.equal(report.status, 'terkirim'); assert.ok(!('agent_history' in report));
    await page.getByRole('heading', { name: 'Inspection submitted' }).waitFor();
    const inspectionSeconds = seconds(inspectionStart);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `../docs/verification/screenshots/integration-${run}-submitted-390.png` });
    await desktop.goto(`${base}/supervisor/laporan`, { waitUntil: 'networkidle' });
    await desktop.locator(`a[href="/supervisor/laporan/${reportId}"]`).first().click();
    await desktop.getByRole('heading', { name: `DEMO-${run} is not roadworthy`, exact: true }).waitFor();
    await desktop.locator('.truck-svg [data-comp="ban_roda"][data-status="tidak_baik"][aria-hidden="false"]').first().waitFor();
    await desktop.screenshot({ path: `../docs/verification/screenshots/integration-${run}-report-1440.png` });
    const tyreId = report.rencana_snapshot.items.find(i => i.comp_id === 'ban_roda').id;
    const tanyaResponse = await fetch(`${base}/api/laporan/${reportId}/tanya`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_id: tyreId, text: 'What does the tyre evidence show, and can this vehicle operate?' }) });
    const tanya = reply(await tanyaResponse.text());
    const after = await api(`/api/laporan/${reportId}`); assert.ok(after.tanya[tyreId].length >= 2);
    assert.deepEqual(after.hasil, report.hasil, 'Finding chat is read-only');
    const pdf = await fetch(`${base}/api/laporan/${reportId}/pdf`); assert.ok(pdf.ok);
    const pdfBytes = Buffer.from(await pdf.arrayBuffer()); assert.equal(pdfBytes.subarray(0, 5).toString(), '%PDF-');
    writeFileSync(`../docs/verification/demo-${run}-report.pdf`, pdfBytes);
    const result = { run, generatedPlan: generated.id, inspectedPlan: planId, reportId, planSeconds, inspectionSeconds, journeySeconds: seconds(started), retakeRequested: true, resumed: true, componentFocus: focus, photoBytes, recorded: 8, stopCount: 8, submitted: true, dashboardVisible: true, findingChatReadOnly: true, findingAnswer: after.tanya[tyreId].at(-1).text, pdfBytes: pdfBytes.length, turns };
    runs.push(result);
    writeFileSync('../docs/verification/integration-check.json', JSON.stringify({ base, runs, errors }, null, 2));
    console.log({ ...result, turns: undefined, findingAnswer: undefined });
    await page.close(); await desktop.close();
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
