import test from 'node:test';
import assert from 'node:assert/strict';
import {FEEL} from '../src/studies/toji/feel.js';
import {TAP_MAX_MS, SWIPE_MAX_MS, SWIPE_MIN_PX, SWIPE_MAX_RISE_PX} from '../src/studies/toji/interaction.js';

// chain-2 F2: the relations FEEL only stated in comments are now derived or checked here; the values are the ones study.js
// used before the move (60c25e7), so the feel did not change.
test('FEEL: derived values equal the literals they replaced', () => {
  assert.equal(FEEL.liftEmbedded, .88);
  assert.equal(FEEL.idleLiftAmp, .12);
  assert.equal(FEEL.liftEmbedded + FEEL.idleLiftAmp, 1, 'the idle breathing crests at full lift');
  assert.equal(FEEL.demoAgeMs, 6500);
  assert.equal(FEEL.demoDurationSec, 7);
  assert.ok(FEEL.demoDurationSec * 1000 > FEEL.demoAgeMs, 'the demo sweep outlasts the ageing');
  assert.equal(FEEL.armedScale, .985);
});
test('FEEL: neighbours are snapshotted only after the longest slide has ended', () => {
  assert.ok(FEEL.settleMs < FEEL.slideBaseMs + FEEL.slideExtraMs);
});
test('tap and swipe limits keep their values', () => {
  assert.deepEqual([TAP_MAX_MS, SWIPE_MAX_MS, SWIPE_MIN_PX, SWIPE_MAX_RISE_PX], [700, 700, 50, 30]);
});
