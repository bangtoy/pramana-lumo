import type { RecommendationAction } from './contracts.ts';
import { getLaporan, getWorkOrder } from './db.ts';
import { ringkasan, type Ringkasan } from './dashboard.ts';
import { unitCode } from './rules.ts';

const contains = (text: string, value: string) => new RegExp(`(^|[^A-Za-z0-9-])${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^A-Za-z0-9-])`, 'i').test(text);
const navigate = (label: string, href: string): RecommendationAction => ({ kind: 'navigate', label, href });
function scoped(path: string, values: Record<string, string>, units: string[], hash = '') {
  const params = new URLSearchParams(values); units.forEach(unit => params.append('unit', unit));
  return `${path}?${params}${hash}`;
}

/** Destinations are built from known records and local routes, never URLs supplied by a model. */
export function recommendationActions(recommendations: string[], sources: string[] = [], data: Ringkasan = ringkasan()): RecommendationAction[] {
  const sourceUnits = [...new Set(sources.flatMap(id => {
    const record = id.startsWith('LI-') ? getLaporan(id) : id.startsWith('WO-') ? getWorkOrder(id) : null;
    return record?.unit ? [unitCode(record.unit)] : [];
  }))];
  const knownUnits = [...new Set([...data.units.map(unit => unit.unit), ...sourceUnits])];
  return recommendations.map(text => {
    const mentioned = knownUnits.filter(unit => contains(text, unit));
    const units = mentioned.length ? mentioned : sourceUnits.length === 1 ? sourceUnits : [];
    if (/remind.*(?:inspectors?|p2h|inspection)|not (?:yet )?inspected|no (?:submitted )?p2h|no p2h submitted|await.*inspection|missing.*inspection/i.test(text)) {
      return navigate('Review units awaiting inspection', scoped('/supervisor', { unit_status: 'belum' }, mentioned, '#units-today'));
    }
    const references = text.match(/\b(?:LI|WO)-[A-Za-z0-9-]+\b/g) || [];
    const workId = references.find(id => id.startsWith('WO-') && getWorkOrder(id));
    if (workId) return navigate('Open work order', `/supervisor/work-order?wo=${encodeURIComponent(workId)}`);
    if (/overdue|terlambat/i.test(text)) return navigate('Review overdue work orders', scoped('/supervisor/work-order', { filter: 'terlambat' }, units));
    const reportId = references.find(id => id.startsWith('LI-') && getLaporan(id)?.status === 'terkirim');
    if (reportId) return navigate('Review inspection report', `/supervisor/laporan/${encodeURIComponent(reportId)}`);
    if (/\b(?:create|draft|buat)\b.*\b(?:work orders?|wo)\b/i.test(text)) {
      const report = units.length === 1 ? data.units.find(unit => unit.unit === units[0]) : null;
      return report ? navigate('Review report and create work orders', `/supervisor/laporan/${encodeURIComponent(report.laporan_id)}`) : navigate('Review STOP units', scoped('/supervisor', { unit_status: 'stop' }, units, '#units-today'));
    }
    if (/work orders?|\bwo\b|mechanic|assign|repair/i.test(text)) return navigate('Review open work orders', scoped('/supervisor/work-order', { filter: 'terbuka' }, units));
    const component = data.komponen.find(component => text.toLowerCase().includes(component.nama.toLowerCase()));
    if (component) {
      const params = new URLSearchParams({ item: component.nama });
      if (units.length === 1) params.set('unit', units[0]);
      return navigate('Review related findings', `/supervisor/laporan?${params}`);
    }
    if (units.length === 1) return navigate('Review unit reports', `/supervisor/laporan?unit=${encodeURIComponent(units[0])}`);
    return { kind: 'ask', label: 'Discuss with Lumo', question: `Help me follow up on this recommendation: ${text}` };
  });
}
