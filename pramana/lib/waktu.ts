/** Calendar day in Jakarta. Positive offsets mean days ago; -2 means in two days. */
export function jakartaDay(daysAgo = 0, at: Date = new Date()): string {
  const shifted = new Date(at.getTime() - daysAgo * 86_400_000);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(shifted);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
