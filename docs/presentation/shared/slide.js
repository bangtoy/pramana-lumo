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
  // Prepared presentation states only; these controls do not call the app or a model.
  const demo = {
    input: { src: '../../../design/assets/demo/apar-jauh.jpg', alt: 'Sample operator photo with an unreadable extinguisher label', imageLabel: 'Prepared preview · sample photo', role: 'Guided evidence collection', status: 'Required detail missing', style: 'warning', title: 'A closer photo supplies the detail.', text: 'Lumo asks the operator for a closer view so the extinguisher label can be read and attached to the inspection item.', rule: 'The operator provides the required evidence while still at the vehicle.' },
    clarify: { src: '../../../design/assets/demo/apar-label.jpg', alt: 'Sample closer photo showing the extinguisher label', imageLabel: 'Prepared preview · sample photo', role: 'Guided evidence collection', status: 'Evidence detail supplied', style: 'ok', title: 'The operator resolves the gap.', text: 'The closer photo makes the label readable. Lumo records the evidence with its inspection item.', rule: 'The inspection continues through the remaining checks and evidence requirements.' },
    report: { src: '../assets/screens/supervisor-report.png', alt: 'English application report showing findings, evidence, and an interactive vehicle model', imageLabel: 'Application screenshot · demo report', role: 'Supervisor view', status: 'Structured report', style: 'ok', title: 'Evidence and exceptions together.', text: 'The report brings together the vehicle, component results, photos, and inspection exceptions for supervisor review.', rule: 'The supervisor can monitor the report and the Work Orders linked to its findings.' }
  };
  document.querySelectorAll('[data-demo]').forEach(button => button.addEventListener('click', () => {
    const value = demo[button.dataset.demo];
    if (!value) return;
    const image = document.getElementById('demoScreen');
    image.src = value.src; image.alt = value.alt;
    document.getElementById('demoImageLabel').textContent = value.imageLabel;
    document.getElementById('demoRole').textContent = value.role;
    const status = document.getElementById('demoStatus'); status.textContent = value.status; status.className = `pill ${value.style}`;
    document.getElementById('demoTitle').textContent = value.title;
    document.getElementById('demoText').textContent = value.text;
    document.getElementById('demoRule').textContent = value.rule;
    document.querySelectorAll('[data-demo]').forEach(other => { const selected = other === button; other.classList.toggle('active', selected); other.setAttribute('aria-pressed', String(selected)); });
  }));
  document.fonts.ready.then(() => { window.__ready = true; notify('ready'); });
})();
