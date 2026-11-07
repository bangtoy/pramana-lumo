"use client";
import { useEffect, useRef, useState } from 'react';

const minimum = 320, initial = 360;
export function usePanelWidth() {
  const [preferred, setPreferred] = useState(initial), [maximum, setMaximum] = useState(720);
  useEffect(() => {
    try { const saved = Number(localStorage.getItem('pramana.tanya-width')); if (Number.isFinite(saved) && saved >= minimum) setPreferred(Math.min(720, saved)); } catch {}
    const main = document.getElementById('supervisor-content');
    const measure = () => setMaximum(window.innerWidth < 1024 ? Math.min(720, window.innerWidth) : Math.min(720, Math.max(minimum, window.innerWidth - (main?.getBoundingClientRect().left || 0) - 320)));
    measure(); window.addEventListener('resize', measure);
    const observer = new ResizeObserver(measure); if (main) observer.observe(main);
    return () => { window.removeEventListener('resize', measure); observer.disconnect(); };
  }, []);
  const width = Math.min(preferred, maximum);
  const update = (value: number, persist = true) => {
    const next = Math.round(Math.max(Math.min(minimum, maximum), Math.min(maximum, value)));
    setPreferred(next);
    if (persist) try { localStorage.setItem('pramana.tanya-width', String(next)); } catch {}
    return next;
  };
  return { width, maximum, update };
}

export function PanelResize({ width, maximum, update }: ReturnType<typeof usePanelWidth>) {
  const drag = useRef<{ x: number; width: number; current: number } | null>(null);
  const [active, setActive] = useState(false);
  return <div role="separator" aria-label="Resize Lumo panel" aria-orientation="vertical" aria-valuemin={Math.min(minimum, maximum)} aria-valuemax={maximum} aria-valuenow={width} aria-valuetext={`${width} pixels`} tabIndex={0} title="Drag to resize. Arrow keys adjust width; double-click to reset." className={`absolute -left-1 top-0 bottom-0 w-2 z-50 cursor-col-resize touch-none group outline-offset-2 ${active ? 'bg-[var(--color-accent-subtle)]' : 'hover:bg-[var(--color-accent-subtle)]'}`}
    onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, width, current: width }; setActive(true); }}
    onPointerMove={event => { if (drag.current) drag.current.current = update(drag.current.width + drag.current.x - event.clientX, false); }}
    onPointerUp={event => { if (drag.current) update(drag.current.current); drag.current = null; setActive(false); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
    onPointerCancel={() => { if (drag.current) update(drag.current.current); drag.current = null; setActive(false); }}
    onDoubleClick={() => update(initial)}
    onKeyDown={event => { const next = event.key === 'ArrowLeft' ? width + 16 : event.key === 'ArrowRight' ? width - 16 : event.key === 'Home' ? minimum : event.key === 'End' ? maximum : null; if (next !== null) { event.preventDefault(); update(next); } }}>
    <span aria-hidden="true" className={`absolute top-1/2 left-0.5 w-1 h-10 rounded-full bg-[var(--color-border-strong)] group-hover:bg-[var(--color-primary)] ${active ? '!bg-[var(--color-primary)]' : ''}`}/>
  </div>;
}
