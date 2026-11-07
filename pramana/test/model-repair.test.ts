import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWithRepair } from '../lib/model-draft.ts';

test('validation failure is repaired once in the same job and independently validated again', async () => {
  const calls: string[] = [];
  const failure = new Error('The independent Anatomy audit did not pass.');
  const artifact = { svg: '<svg/>', manifest: 'validated' };
  const result = await validateWithRepair(async attempt => { calls.push(`validate ${attempt}`); if (attempt === 1) throw failure; return artifact; }, async error => { assert.equal(error, failure); calls.push('repair'); }, () => true);
  assert.equal(result, artifact);
  assert.deepEqual(calls, ['validate 1', 'repair', 'validate 2']);
});

test('a valid model needs no repair; repeated failures or exhausted time never produce success', async () => {
  const fail = new Error('Still invalid');
  let validations = 0, repairs = 0;
  assert.equal(await validateWithRepair(async () => 'valid', async () => { repairs++; }, () => true), 'valid');
  assert.equal(repairs, 0);
  await assert.rejects(validateWithRepair(async () => { validations++; throw fail; }, async () => { repairs++; }, () => true), error => error === fail);
  assert.equal(validations, 2); assert.equal(repairs, 1);
  await assert.rejects(validateWithRepair(async () => { throw fail; }, async () => { repairs++; }, () => false), error => error === fail);
  assert.equal(repairs, 1);
});
