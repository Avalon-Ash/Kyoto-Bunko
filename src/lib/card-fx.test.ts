import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cardPose, wantsTilt, wantsPress, movedPastSlop, listMotion, createFrameGate,
  MAX_TILT_DEG, MAX_ANIMATED_CARDS, STAGGER_CARDS,
} from './card-fx.ts';

test('tilt never exceeds the cap, even for a pointer outside the card', () => {
  for (const [x, y] of [[-500, -500], [9999, 9999], [0, 0], [300, 200], [150, 100], [-1, 9999]]) {
    const p = cardPose({ x, y, width: 300, height: 200 });
    assert.ok(Math.abs(p.rotateX) <= MAX_TILT_DEG + 1e-9);
    assert.ok(Math.abs(p.rotateY) <= MAX_TILT_DEG + 1e-9);
    assert.ok(p.glowX >= 0 && p.glowX <= 100 && p.glowY >= 0 && p.glowY <= 100);
  }
});

test('centre is flat; corners lean opposite ways and the gloss follows the pointer', () => {
  const mid = cardPose({ x: 150, y: 100, width: 300, height: 200 });
  assert.equal(mid.rotateX, 0); assert.equal(mid.rotateY, 0);
  const tl = cardPose({ x: 0, y: 0, width: 300, height: 200 });
  const br = cardPose({ x: 300, y: 200, width: 300, height: 200 });
  assert.equal(tl.rotateX, -br.rotateX); assert.equal(tl.rotateY, -br.rotateY);
  assert.ok(tl.glowX < br.glowX && tl.glowY < br.glowY);
});

test('a zero-size card is left flat instead of dividing by zero', () => {
  const p = cardPose({ x: 5, y: 5, width: 0, height: 0 });
  assert.deepEqual(p, { rotateX: 0, rotateY: 0, glowX: 50, glowY: 50 });
});

test('reduced motion attaches neither tilt nor press; touch never tilts', () => {
  assert.equal(wantsTilt('mouse', true), false);
  assert.equal(wantsPress('touch', true), false);
  assert.equal(wantsTilt('touch', false), false);
  assert.equal(wantsTilt('mouse', false), true);
  assert.equal(wantsTilt('pen', false), true);
  assert.equal(wantsPress('touch', false), true);
  assert.equal(wantsPress('mouse', false), false);
});

test('a touch that travels past the slop is a scroll, not a press', () => {
  assert.equal(movedPastSlop(2, 3), false);
  assert.equal(movedPastSlop(0, 12), true);
});

test('long lists and reduced motion switch at once; short lists stagger a few cards', () => {
  assert.deepEqual(listMotion(MAX_ANIMATED_CARDS + 1, false), { animate: false, staggerCount: 0 });
  assert.deepEqual(listMotion(5, true), { animate: false, staggerCount: 0 });
  assert.deepEqual(listMotion(5, false), { animate: true, staggerCount: 5 });
  assert.equal(listMotion(MAX_ANIMATED_CARDS, false).staggerCount, STAGGER_CARDS);
});

test('frame gate runs only the latest job once per frame and can be cancelled', () => {
  const queue = new Map<number, () => void>(); let next = 1;
  const gate = createFrameGate(cb => { queue.set(next, cb); return next++; }, id => { queue.delete(id); });
  const seen: number[] = [];
  for (let i = 0; i < 50; i++) gate.push(() => seen.push(i));
  assert.equal(queue.size, 1);
  [...queue.values()][0](); queue.clear();
  assert.deepEqual(seen, [49]);
  assert.equal(gate.pending, false);
  gate.push(() => seen.push(100)); gate.cancel();
  assert.equal(queue.size, 0); assert.equal(gate.pending, false);
});
