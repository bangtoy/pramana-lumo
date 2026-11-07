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
    distant: { file: 'apar-jauh.jpg', caption: 'Initial evidence · fire extinguisher too far away', status: 'Photo retake needed', style: 'warning', message: 'I can’t read the label yet. Could you take a closer photo?', rule: 'A visible component ≠ enough information.', hint: 'A distant photo prompts a request for clearer evidence.' },
    label: { file: 'apar-label.jpg', caption: 'New evidence · closer view of the extinguisher label', status: 'Clearer label', style: 'ok', message: 'The label is visible now. The extinguisher’s condition still needs checking against the Inspection Plan.', rule: 'A label photo does not establish the extinguisher’s overall condition.', hint: 'Improve evidence quality before recording the result.' },
    tire: { file: 'ban-benjol.jpg', caption: 'Sample finding · bulge in the tire sidewall', status: 'STOP', style: 'stop', message: 'There is a bulge in the tire sidewall. In this scenario, the Inspection Plan requires marking the vehicle STOP.', rule: 'STOP conditions come from the Inspection Plan.', hint: 'Finding + evidence → report → supervisor decision.' }
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
    report: { file: '03-supervisor-laporan-detail.png', title: 'Findings keep their evidence.', text: 'One Inspection Report shows photos, components, notes, and STOP conditions.', label: 'Inspection Report', code: 'LI-RW-45 · DT-07' },
    wo: { file: '04-supervisor-work-order.png', title: 'Each repair has an owner.', text: 'The supervisor creates a Work Order from the finding, then assigns a mechanic and a deadline.', label: 'Work Order', code: 'Finding → Work Order' },
    analysis: { file: '10-tanya-lumo-jawaban.png', title: 'Answers cite their sources.', text: 'Ask Lumo reads reports and Work Orders. Recommendations refer to source IDs.', label: 'Ask Lumo', code: 'Sources + recommendations' }
  };
  const operationOverrides = JSON.parse(document.getElementById('operationSources')?.textContent || '{}');
  for (const [key, value] of Object.entries(operationOverrides)) Object.assign(operations[key], value);
  document.querySelectorAll('[data-operation]').forEach(button => button.addEventListener('click', () => {
    const value = operations[button.dataset.operation];
    const image = document.getElementById('operationScreen'); image.src = value.src || `../../../design/screens/${value.file}`; image.alt = value.title;
    document.querySelector('.operations .screenshot-label').textContent = value.src ? value.label : 'UI reference · sample data';
    document.getElementById('operationTitle').textContent = value.title;
    document.getElementById('operationText').textContent = value.text;
    document.getElementById('operationCode').textContent = value.code;
    document.querySelectorAll('[data-operation]').forEach(other => { const selected = other === button; other.classList.toggle('active', selected); other.setAttribute('aria-pressed', String(selected)); });
  }));
  // Live captures are used only on pages that actually exist on the deployment.
  document.querySelectorAll('img[data-live]').forEach(img => { const probe = new Image(); probe.onload = () => { img.src = probe.src; }; probe.src = img.dataset.live; });
  document.fonts.ready.then(() => { window.__ready = true; notify('ready'); });
})();
