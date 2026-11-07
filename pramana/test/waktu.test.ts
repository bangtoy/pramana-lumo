import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, jakartaDay, jakartaIso, lastDays, dayLabel } from '../lib/waktu.ts';

test('Jakarta calendar dates and wall-clock timestamps agree across UTC midnight', () => {
  const at = new Date('2026-11-06T00:30:00Z');
  assert.equal(dayKey('2026-11-05T23:30:00Z'), '2026-11-06');
  assert.equal(dayKey('2026-11-05T16:59:59Z'), '2026-11-05');
  assert.equal(dayKey('2026-11-05T17:00:00Z'), '2026-11-06');
  assert.equal(jakartaIso(0, 6, 30, at), '2026-11-05T23:30:00.000Z');
  assert.equal(jakartaIso(0, 6, 90, at), '2026-11-06T00:30:00.000Z');
  assert.equal(jakartaIso(0, 0, -1, at), '2026-11-05T16:59:00.000Z');
  assert.equal(jakartaIso(-1, 7, 0, at), '2026-11-07T00:00:00.000Z');
  assert.equal(jakartaDay(1, new Date('2024-03-01T00:00:00Z')), '2024-02-29');
});

test('day windows run from oldest to newest across year and leap boundaries', () => {
  assert.deepEqual(lastDays(3, new Date('2027-01-01T01:00:00Z')), ['2026-12-30', '2026-12-31', '2027-01-01']);
  assert.deepEqual(lastDays(3, new Date('2024-03-01T01:00:00Z')), ['2024-02-28', '2024-02-29', '2024-03-01']);
  assert.deepEqual(lastDays(0), []);
  assert.throws(() => lastDays(-1), RangeError);
});

test('day labels follow the English app language without losing their calendar day', () => {
  assert.equal(dayLabel('2026-11-06'), '6 Nov');
  assert.equal(dayLabel('2026-05-01'), '1 May');
  assert.equal(dayLabel('2026-08-01'), '1 Aug');
  assert.equal(dayLabel('2026-10-01'), '1 Oct');
  assert.equal(dayLabel('2026-12-01'), '1 Dec');
  assert.throws(() => dayLabel('2026-02-30'), RangeError);
});
