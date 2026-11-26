// Behaviour: a ward's composition gives the same parts whole or in steps (L3d P1, docs/plans/2026-11-26-boot.md).
import assert from 'node:assert/strict';
import test from 'node:test';
import {PLATES} from '../src/studies/toji/plate/parts.js';
import {composeInSteps, composition} from '../src/studies/toji/plate/compose.js';

const runAll = gen => { const yields = []; for (;;) { const s = gen.next(); if (s.done) return {parts: s.value, yields}; yields.push(s.value); } };

test('every ward composes the same parts in steps as whole', () => {
  for (const [ward, compose] of Object.entries(PLATES)) {
    assert.ok(Array.isArray(compose.steps) && compose.steps.length > 1, `${ward} has steps`);
    assert.deepEqual(runAll(composeInSteps(compose)).parts, compose(), ward);
  }
});

test('a composition without steps is called whole', () => {
  const parts = [{id: 'a'}, {id: 'b'}];
  assert.deepEqual(runAll(composeInSteps(() => parts)), {parts, yields: []});
});

test('composition keeps the steps in order and calls each once', () => {
  const calls = [];
  const compose = composition([() => { calls.push(1); return [{id: 'x'}]; }, () => { calls.push(2); return [{id: 'y'}, {id: 'z'}]; }]);
  assert.deepEqual(compose().map(p => p.id), ['x', 'y', 'z']);
  assert.deepEqual(calls, [1, 2]);
});
