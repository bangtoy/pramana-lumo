import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { requireIndependentAudit } from '../lib/model-validation.ts';

// Actual independent output from the Dozer build rejected during the demo.
const output = readFileSync(new URL('./fixtures/anatomy-zero-audit.log', import.meta.url), 'utf8');
const quality = { part_count: 78, world_space_audit: { ran: true, problems: 0, passed: true } };

test('independent audit accepts the complete zero-problem report without a magic console phrase', () => {
  assert.equal(requireIndependentAudit(0, output, quality).part_count, 78);
  assert.equal(requireIndependentAudit(0, output + '\naudit passed\n', quality).part_count, 78);
});

test('independent audit rejects failed processes, nonzero checks, incomplete evidence and contradictory success claims', () => {
  for (const exit of [1, 124, null]) assert.throws(() => requireIndependentAudit(exit, output, quality), /independent Anatomy audit/);
  for (const line of output.split('\n').filter(line => /^[a-z-]+.*: 0/.test(line))) {
    assert.throws(() => requireIndependentAudit(0, output.replace(line, line.replace(': 0', ': 1')) + '\naudit passed', quality), /independent Anatomy audit/);
    assert.throws(() => requireIndependentAudit(0, output.replace(line, '') + '\naudit passed', quality), /independent Anatomy audit/);
  }
  assert.throws(() => requireIndependentAudit(0, 'audit passed', quality), /independent Anatomy audit/);
  assert.throws(() => requireIndependentAudit(0, output + '\naudit failed: 1 problem', quality), /independent Anatomy audit/);
  assert.throws(() => requireIndependentAudit(0, output, { ...quality, world_space_audit: { ran: true, problems: 1, passed: false } }), /audit did not pass/);
});
