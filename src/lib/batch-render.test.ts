import { test } from 'node:test';
import assert from 'node:assert/strict';
import { firstBatchSize, renderCount, nextUnlocked, RENDER_ALL_BELOW, BATCH_SIZE } from './batch-render';

test('firstBatchSize covers two screens and doubles on two columns', () => {
  assert.equal(firstBatchSize(375, 812), 12);
  assert.equal(firstBatchSize(1440, 900), 2 * Math.ceil(1800 / 180));
  assert.ok(firstBatchSize(375, 2000) >= 12);
});

test('small lists render whole', () => {
  assert.equal(renderCount(RENDER_ALL_BELOW, 0, 12), RENDER_ALL_BELOW);
  assert.equal(renderCount(5, 0, 12), 5);
});

test('long lists start at the first batch and never exceed the total', () => {
  assert.equal(renderCount(104, 0, 12), 12);
  assert.equal(renderCount(104, 50, 12), 50);
  assert.equal(renderCount(104, 500, 12), 104);
});

test('nextUnlocked steps by a batch and stops at the total', () => {
  assert.equal(nextUnlocked(104, 12), 12 + BATCH_SIZE);
  assert.equal(nextUnlocked(104, 100), 104);
});
