/* Every page works directly over file:// and in the deck's iframe. */
(() => {
  const root = document.querySelector('.slide');
  function fit() {
    const scale = Math.min(innerWidth / 1920, innerHeight / 1080);
    root.style.transform = `scale(${scale})`;
    root.style.left = `${(innerWidth - 1920 * scale) / 2}px`;
    root.style.top = `${(innerHeight - 1080 * scale) / 2}px`;
  }
  fit(); addEventListener('resize', fit);
  const embedded = window.parent !== window;
  const notify = (action) => { if (embedded) parent.postMessage({ source: 'pramana-slide', action }, '*'); };
  document.addEventListener('keydown', (event) => {
    if (/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    const action = { ArrowRight: 'next', PageDown: 'next', ArrowLeft: 'prev', PageUp: 'prev', Escape: 'overview', Home: 'first', End: 'last', n: 'notes', N: 'notes', f: 'fullscreen', F: 'fullscreen', t: 'timer', T: 'timer' }[event.key];
    if (action) { event.preventDefault(); notify(action); }
    if (event.key === ' ' && event.target.tagName !== 'BUTTON') { event.preventDefault(); notify('next'); }
  });
  // Labels are scenario states; no live model request or inspection is submitted.
  const evidence = {
    distant: { file: 'apar-jauh.jpg', caption: 'Bukti awal · APAR masih terlalu jauh', status: 'Perlu foto ulang', style: 'warning', message: 'Labelnya belum terbaca. Bisa difoto lebih dekat, Pak?', rule: 'Komponen terlihat ≠ informasi sudah cukup.', hint: 'Foto jarak jauh → permintaan bukti yang lebih jelas.' },
    label: { file: 'apar-label.jpg', caption: 'Bukti ulang · label APAR terlihat lebih dekat', status: 'Label lebih jelas', style: 'ok', message: 'Label sudah terlihat. Kondisi APAR tetap perlu diperiksa sesuai Rencana Inspeksi.', rule: 'Foto label belum membuktikan seluruh kondisi APAR.', hint: 'Kualitas bukti diperbaiki sebelum hasil dicatat.' },
    tire: { file: 'ban-benjol.jpg', caption: 'Temuan contoh · benjol pada dinding ban', status: 'STOP', style: 'stop', message: 'Ada benjol pada dinding ban. Pada skenario ini, unit ditandai STOP sesuai Rencana Inspeksi.', rule: 'Kondisi STOP berasal dari Rencana Inspeksi.', hint: 'Temuan + bukti → laporan → keputusan Supervisor.' }
  };
  function selectEvidence(key) {
    const item = evidence[key]; if (!item) return;
    const photo = document.getElementById('evidencePhoto'); if (!photo) return;
    photo.src = `../../../design/assets/demo/${item.file}`;
    photo.alt = item.caption;
    document.getElementById('photoCaption').textContent = item.caption;
    const status = document.getElementById('evidenceStatus'); status.textContent = item.status; status.className = `pill ${item.style}`;
    document.getElementById('evidenceMessage').textContent = item.message;
    document.getElementById('evidenceRule').textContent = item.rule;
    document.getElementById('evidenceHint').textContent = item.hint;
    document.querySelectorAll('[data-evidence]').forEach(button => { const selected = button.dataset.evidence === key; button.classList.toggle('active', selected); button.setAttribute('aria-pressed', String(selected)); });
  }
  document.querySelectorAll('[data-evidence]').forEach(button => button.addEventListener('click', () => selectEvidence(button.dataset.evidence)));
  const operations = {
    report: { file: '03-supervisor-laporan-detail.png', title: 'Temuan tetap punya bukti.', text: 'Foto, komponen, catatan, dan kondisi STOP terbaca dalam satu Laporan Inspeksi.', label: 'Laporan Inspeksi', code: 'LI-RW-45 · DT-07' },
    wo: { file: '04-supervisor-work-order.png', title: 'Perbaikan punya pemilik.', text: 'Supervisor membuat Work Order dari Temuan, lalu menentukan mekanik dan target.', label: 'Work Order', code: 'Temuan → Work Order' },
    analysis: { file: '10-tanya-lumo-jawaban.png', title: 'Jawaban menyebut sumber.', text: 'Tanya Lumo membaca laporan dan Work Order. Rekomendasi merujuk ke ID sumber.', label: 'Tanya Lumo', code: 'Sumber + rekomendasi' }
  };
  const operationOverrides = JSON.parse(document.getElementById('operationSources')?.textContent || '{}');
  for (const [key, value] of Object.entries(operationOverrides)) Object.assign(operations[key], value);
  document.querySelectorAll('[data-operation]').forEach(button => button.addEventListener('click', () => {
    const value = operations[button.dataset.operation];
    const image = document.getElementById('operationScreen'); image.src = value.src || `../../../design/screens/${value.file}`; image.alt = value.title;
    document.querySelector('.operations .screenshot-label').textContent = value.src ? value.label : 'Referensi UI · data contoh';
    document.getElementById('operationTitle').textContent = value.title;
    document.getElementById('operationText').textContent = value.text;
    document.getElementById('operationCode').textContent = value.code;
    document.querySelectorAll('[data-operation]').forEach(other => { const selected = other === button; other.classList.toggle('active', selected); other.setAttribute('aria-pressed', String(selected)); });
  }));
  // Live captures are used only on pages that actually exist on the deployment.
  document.querySelectorAll('img[data-live]').forEach(img => { const probe = new Image(); probe.onload = () => { img.src = probe.src; }; probe.src = img.dataset.live; });
  document.fonts.ready.then(() => { window.__ready = true; notify('ready'); });
})();
