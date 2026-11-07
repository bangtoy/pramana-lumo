import Link from 'next/link';

export function KpiCard({ label, value, note, color, noteColor, bars, href, id }: {
  label: string; value: string | number; note: string; color: string; noteColor: string; bars: number[]; href: string; id: string;
}) {
  const max = Math.max(1, ...bars);
  return <Link data-kpi={id} href={href} className="panel h-[128px] px-5 pt-4 pb-3 relative min-w-0 hover:border-[var(--color-border-strong)]">
    <span className="absolute left-[14px] top-2 h-20 w-px" style={{ background: color }}/>
    <p className="t-label muted truncate" title={label}>{label}</p><p className="t-metric mt-1">{value}</p><p className="t-body-sm truncate" style={{ color: noteColor }} title={note}>{note}</p>
    <div aria-hidden="true" className="flex items-end gap-0.5 h-4 mt-3">{bars.map((bar, i) => <span key={i} className="w-[3px]" style={{ height: `${Math.max(1, bar / max * 16)}px`, background: color, opacity: .25 + i / Math.max(1, bars.length - 1) * .75 }}/>)}</div>
  </Link>;
}
