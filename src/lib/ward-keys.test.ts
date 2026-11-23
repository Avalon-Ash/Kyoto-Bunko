import test from 'node:test';
import assert from 'node:assert/strict';
import { WARD_KEYS } from '../data/wards';
import type { WardKey } from '../types';
import { WARD_KEY_LIST, isWardKey } from './ward-keys';
import { WARD_ART, wardSeed } from '../studies/toji/ward-art.js';

// Every WardKey once: the compiler rejects a missing or unknown key, so this record is the union written out.
const EVERY_WARD: Record<WardKey, true> = {
  W_KITA: true, W_KAMIGYO: true, W_SAKYO: true, W_NAKAGYO: true, W_HIGASHIYAMA: true,
  W_SHIMOGYO: true, W_MINAMI: true, W_UKYO: true, W_NISHIKYO: true, W_YAMASHINA: true, W_FUSHIMI: true,
};

test('WARD_KEYS holds every WardKey exactly once, so narrowing it in ward-keys.ts is safe', () => {
  assert.equal(new Set(WARD_KEYS).size, WARD_KEYS.length, 'no ward repeats');
  assert.deepEqual([...WARD_KEYS].sort(), Object.keys(EVERY_WARD).sort());
  assert.deepEqual([...WARD_KEY_LIST], WARD_KEYS);
  assert.ok(isWardKey('W_KITA'));
  assert.ok(!isWardKey('W_NOWHERE'));
});

// wardSeed reads the key order of WARD_ART: the backdrop of each ward depends on it. Locked to WARD_KEYS and to the seeds
// it gave at 60c25e7 (chain-2 F3), so reordering either table is caught here instead of in the pictures.
test('WARD_ART lists the wards in WARD_KEYS order, and each ward keeps its backdrop seed', () => {
  assert.deepEqual(Object.keys(WARD_ART), WARD_KEYS);
  assert.deepEqual(WARD_KEYS.map(wardSeed), WARD_KEYS.map((_, i) => 7 + i * 101));
});
