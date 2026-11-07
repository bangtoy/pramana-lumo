const calendar = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' });

/** The calendar date of a timestamp in Jakarta, including UTC date boundaries. */
export function dayKey(iso: string | Date): string {
  const parts = calendar.formatToParts(new Date(iso));
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** Calendar day in Jakarta. Positive offsets mean days ago; -2 means in two days. */
export function jakartaDay(daysAgo = 0, at: Date = new Date()): string {
  return dayKey(new Date(at.getTime() - daysAgo * 86_400_000));
}

/** UTC timestamp for a Jakarta wall-clock time. Minutes may overflow either way. */
export function jakartaIso(daysAgo: number, hh: number, mm: number, at: Date = new Date()): string {
  if (![daysAgo, hh, mm].every(Number.isInteger)) throw new RangeError('Use whole days, hours and minutes.');
  const midnight = new Date(`${jakartaDay(daysAgo, at)}T00:00:00+07:00`).getTime();
  return new Date(midnight + (hh * 60 + mm) * 60_000).toISOString();
}

export function lastDays(n: number, at: Date = new Date()): string[] {
  if (!Number.isInteger(n) || n < 0) throw new RangeError('Use a non-negative number of days.');
  return Array.from({ length: n }, (_, i) => jakartaDay(n - i - 1, at));
}

/** English labels follow the application's language; dates still use Jakarta. */
export function dayLabel(day: string): string {
  const date = new Date(`${day}T00:00:00+07:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(date.getTime()) || dayKey(date) !== day) throw new RangeError('Use a valid YYYY-MM-DD date.');
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short' }).format(date);
}
