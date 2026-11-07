"use client";
import { useEffect, useId, useRef, useState } from 'react';
import type { Ringkasan } from '@/lib/dashboard';

type Point = { x: number; y: number };
function curve(points: Point[], top: number, bottom: number) {
  if (!points.length) return '';
  const bound = (y: number) => Math.max(top, Math.min(bottom, y));
  return `M${points[0].x},${points[0].y}` + points.slice(1).map((point, i) => {
    const previous = points[i], before = points[Math.max(0, i - 1)], after = points[Math.min(points.length - 1, i + 2)];
    return ` C${previous.x + (point.x - before.x) / 6},${bound(previous.y + (point.y - before.y) / 6)} ${point.x - (after.x - previous.x) / 6},${bound(point.y - (after.y - previous.y) / 6)} ${point.x},${point.y}`;
  }).join('');
}
export function TrenChart({ data }: { data: Ringkasan['tren'] }) {
  const host = useRef<HTMLDivElement>(null), [width, setWidth] = useState(640), [active, setActive] = useState<number | null>(null);
  const id = useId().replaceAll(':', '');
  useEffect(() => {
    const observer = new ResizeObserver(entries => setWidth(Math.max(160, entries[0].contentRect.width)));
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => setActive(null), [data.length]);
  const left = 28, right = width - 12, top = 18, bottom = 204;
  const max = Math.max(3, Math.ceil(Math.max(...data.map(d => Math.max(d.layak, d.stop)), 0) / 3) * 3);
  const x = (i: number) => left + i * (right - left) / Math.max(1, data.length - 1);
  const y = (n: number) => bottom - n / max * (bottom - top);
  const good = data.map((d, i) => ({ x: x(i), y: y(d.layak) })), stop = data.map((d, i) => ({ x: x(i), y: y(d.stop) }));
  const goodPath = curve(good, top, bottom), stopPath = curve(stop, top, bottom);
  const step = Math.max(1, Math.ceil(data.length / (width / 70))), index = active === null ? null : Math.min(data.length - 1, active);
  const selected = index === null ? null : data[index];
  return <div ref={host} className="relative h-[240px] w-full" data-trend-days={data.length} data-chart-width={width} tabIndex={0} role="group" aria-label="Daily inspection trend. Use left and right arrows to explore dates."
    onKeyDown={e => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(e.key)) { e.preventDefault(); setActive(e.key === 'Escape' ? null : e.key === 'Home' ? 0 : e.key === 'End' ? data.length - 1 : Math.max(0, Math.min(data.length - 1, (index ?? data.length - 1) + (e.key === 'ArrowLeft' ? -1 : 1)))); } }}
    onFocus={() => setActive(data.length - 1)} onBlur={() => setActive(null)}>
    <svg width="100%" height="240" viewBox={`0 0 ${width} 240`} aria-hidden="true" onPointerLeave={() => setActive(null)} onPointerMove={e => { const rect = e.currentTarget.getBoundingClientRect(); setActive(Math.max(0, Math.min(data.length - 1, Math.round(((e.clientX - rect.left) * width / rect.width - left) / (right - left) * (data.length - 1))))); }}>
      <defs>
        <linearGradient id={`${id}-good`} x1="0%" x2="100%"><stop offset="0%" stopColor="#1b8ce8" stopOpacity="0"/><stop offset="15%" stopColor="#1b8ce8"/><stop offset="85%" stopColor="#1b8ce8"/><stop offset="100%" stopColor="#1b8ce8" stopOpacity="0"/></linearGradient>
        <linearGradient id={`${id}-stop`} x1="0%" x2="100%"><stop offset="0%" stopColor="#ffb27a" stopOpacity="0"/><stop offset="15%" stopColor="#ffb27a"/><stop offset="85%" stopColor="#ffb27a"/><stop offset="100%" stopColor="#ffb27a" stopOpacity="0"/></linearGradient>
        <linearGradient id={`${id}-area`} x1="0%" x2="0%" y1="0%" y2="100%"><stop offset="0%" stopColor="#1b8ce8" stopOpacity=".1"/><stop offset="100%" stopColor="#1b8ce8" stopOpacity="0"/></linearGradient>
        <filter id={`${id}-point`} x="-100%" y="-100%" width="300%" height="300%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="var(--color-on-surface)" floodOpacity=".15"/></filter>
      </defs>
      {[0, 1, 2, 3].map(i => <g key={i}><line x1={left} y1={y(i * max / 3)} x2={right} y2={y(i * max / 3)} stroke="#f0f0f0" strokeDasharray="4 4"/><text x={left - 8} y={y(i * max / 3) + 4} textAnchor="end" className="t-label font-normal" fill="#747474">{i * max / 3}</text></g>)}
      {!!good.length && <path d={`${goodPath} L${right},${bottom} L${left},${bottom} Z`} fill={`url(#${id}-area)`}/>}
      <path data-series="roadworthy" d={goodPath} fill="none" stroke={`url(#${id}-good)`} strokeWidth="2"/>
      <path data-series="stop" d={stopPath} fill="none" stroke={`url(#${id}-stop)`} strokeWidth="2"/>
      {data.map((day, i) => (i === data.length - 1 || (i % step === 0 && data.length - 1 - i >= step)) && <text key={day.tanggal} x={x(i)} y="232" textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} className="t-label font-normal" fill="#747474">{day.label}</text>)}
      {index !== null && selected && <g><line x1={x(index)} y1={top} x2={x(index)} y2={bottom} stroke="var(--color-border-strong)" strokeDasharray="3 3"/><circle cx={x(index)} cy={y(selected.layak)} r="4" fill="var(--color-surface)" stroke="#1b8ce8" strokeWidth="2" filter={`url(#${id}-point)`}/><circle cx={x(index)} cy={y(selected.stop)} r="4" fill="var(--color-surface)" stroke="#ffb27a" strokeWidth="2" filter={`url(#${id}-point)`}/></g>}
    </svg>
    {index !== null && selected && <div role="tooltip" className="panel floating pop-in pointer-events-none absolute z-10 px-3 py-2 w-[160px]" style={{ left: Math.max(80, Math.min(width - 80, x(index))), top: Math.max(4, Math.min(y(selected.layak), y(selected.stop)) - 68), transform: 'translateX(-50%)' }}><p className="t-label">{selected.label}</p><p className="t-body-sm muted mt-1">Roadworthy <span className="t-data text-[var(--color-chart-blue)]">{selected.layak}</span> · STOP <span className="t-data text-[var(--color-chart-orange)]">{selected.stop}</span></p></div>}
    <span className="sr-only" role="status">{selected ? `${selected.label}: ${selected.layak} roadworthy, ${selected.stop} STOP.` : ''}</span>
  </div>;
}
