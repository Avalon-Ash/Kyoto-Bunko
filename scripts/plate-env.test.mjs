// The ward order and the signed cabinet steps the shooting scripts share (scripts/lib/plate-env.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stepsTo, wardAfter, wardId, cabinetOrder} from './lib/plate-env.mjs';

// The page's order is WARD_KEYS (src/data/wards.ts); read it from the source so this test holds no second copy.
const WARD_KEYS = [...readFileSync(new URL('../src/data/wards.ts', import.meta.url), 'utf8').match(/WARD_KEYS = \[([^\]]*)\]/)[1].matchAll(/'(W_[A-Z]+)'/g)].map(m => m[1]);

// docs/HANDOFF.md §4.5: signed steps from W_MINAMI.
const FROM_MINAMI = {W_MINAMI: 0, W_UKYO: 1, W_NISHIKYO: 2, W_YAMASHINA: 3, W_FUSHIMI: 4, W_KITA: 5, W_KAMIGYO: 6, W_SHIMOGYO: -1, W_HIGASHIYAMA: -2, W_NAKAGYO: -3, W_SAKYO: -4};

test('stepsTo gives the HANDOFF step table for all eleven wards from W_MINAMI', () => {
  assert.equal(WARD_KEYS.length, 11);
  for (const [ward, steps] of Object.entries(FROM_MINAMI)) assert.equal(stepsTo(WARD_KEYS, 'W_MINAMI', ward), steps, ward);
});

test('stepsTo takes a ward name in any spelling, and wardAfter walks the steps back to the ward', () => {
  assert.equal(stepsTo(WARD_KEYS, 'W_MINAMI', 'kita'), 5);
  assert.equal(stepsTo(WARD_KEYS, 'W_MINAMI', 'KITA'), 5);
  assert.equal(wardId('kita'), 'W_KITA');
  for (const start of WARD_KEYS) for (const target of WARD_KEYS) assert.equal(wardAfter(WARD_KEYS, start, stepsTo(WARD_KEYS, start, target)), target);
});

test('stepsTo on an even ring takes the forward way at the tie', () => {
  const ring = ['W_A', 'W_B', 'W_C', 'W_D'];
  assert.equal(stepsTo(ring, 'W_A', 'W_C'), 2);
});

test('stepsTo throws on an unknown ward or start', () => {
  assert.throws(() => stepsTo(WARD_KEYS, 'W_MINAMI', 'nowhere'), /unknown ward/);
  assert.throws(() => stepsTo(WARD_KEYS, 'W_NOWHERE', 'kita'), /unknown start ward/);
});

test('cabinetOrder throws when the page has no order or the start ward is not in it', async () => {
  const page = (order, start) => async expr => expr.includes('__kyotoCabinetIds') ? order : start;
  assert.deepEqual(await cabinetOrder(page(['W_A', 'W_B'], 'W_B')), {order: ['W_A', 'W_B'], startWard: 'W_B'});
  await assert.rejects(cabinetOrder(page(undefined, 'W_A')), /missing cabinet order/);
  await assert.rejects(cabinetOrder(page(['W_A'], 'W_B')), /missing cabinet order/);
});
