// The arithmetic of scripts/plate-room-stats.mjs on synthetic pictures (the shooting side needs a browser and is not tested here).
import test from 'node:test';
import assert from 'node:assert/strict';
import {LIMITS, MASK_GROUPS, luminance, isMagenta, maskOf, erode, dilate, largestBlob, lumsUnder, summary, groupStats, tailBlueOverRed, differOutside} from './plate-room-stats.mjs';
import {MAT} from '../src/studies/toji/plate/mat.js';

/** A w×h RGB picture from a function (x, y) => [r, g, b]. */
const picture = (width, height, at) => { const data = new Uint8Array(width * height * 3); for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set(at(x, y), (y * width + x) * 3); return {width, height, channels: 3, data}; };
const MAGENTA = [255, 0, 255], BLACK = [0, 0, 0];
const count = mask => mask.on.reduce((a, v) => a + v, 0);

test('room stats: the groups name materials that exist', () => {
  for (const {names} of Object.values(MASK_GROUPS)) for (const name of names ?? []) assert.ok(name in MAT, name);
});

test('room stats: luminance and the magenta test', () => {
  assert.ok(Math.abs(luminance(255, 255, 255) - 255) < 1e-9);
  assert.ok(Math.abs(luminance(255, 0, 0) - 54.213) < 1e-9);
  assert.ok(isMagenta(255, 0, 255) && isMagenta(160, 40, 170));
  assert.ok(!isMagenta(220, 170, 60) && !isMagenta(200, 200, 200) && !isMagenta(0, 0, 0), 'gold, silver and black are not masks');
});

test('room stats: erode and dilate move the edge by one pixel a step', () => {
  const mask = maskOf(picture(9, 9, (x, y) => x >= 2 && x <= 6 && y >= 2 && y <= 6 ? MAGENTA : BLACK));
  assert.equal(count(mask), 25);
  assert.equal(count(erode(mask)), 9);
  assert.equal(count(erode(mask, 2)), 1);
  assert.equal(count(dilate(mask)), 49);
  assert.equal(count(dilate(mask, 2)), 81);
  assert.equal(count(erode(maskOf(picture(4, 4, () => MAGENTA)))), 4, 'the picture\'s border counts as outside');
});

test('room stats: the largest blob is 4-connected', () => {
  const on = Uint8Array.from([1, 1, 0, 0, 0,
                              0, 1, 0, 1, 0,
                              0, 0, 1, 1, 0,
                              1, 0, 0, 0, 0]);
  assert.equal(largestBlob({width: 5, height: 4, on}), 3, 'diagonal neighbours are not joined; rows do not wrap');
  assert.equal(largestBlob({width: 5, height: 4, on: new Uint8Array(20)}), 0);
});

test('room stats: summary gives mean, sigma and the shares past the limits', () => {
  const s = summary([0, 100, 200, 255]);
  assert.equal(s.pixels, 4); assert.equal(s.mean, 138.75);
  assert.equal(s.sigma, Math.round(Math.sqrt(((138.75) ** 2 + 38.75 ** 2 + 61.25 ** 2 + 116.25 ** 2) / 4) * 100) / 100);
  assert.equal(s.white, 25); assert.equal(s.black, 25);
  assert.deepEqual(summary([]), {pixels: 0, mean: 0, sigma: 0, white: 0, black: 0});
  assert.equal(summary([LIMITS.white, LIMITS.black]).white + summary([LIMITS.white, LIMITS.black]).black, 0, 'the limits themselves are inside');
});

test('room stats: a group is measured inside its eroded mask', () => {
  // A 7×7 block; its rim is white (it would be the lid's glint bleeding in), its 5×5 inside is grey with one white pixel.
  const inside = (x, y) => x >= 2 && x <= 6 && y >= 2 && y <= 6, block = (x, y) => x >= 1 && x <= 7 && y >= 1 && y <= 7;
  const shot = picture(9, 9, (x, y) => inside(x, y) ? (x === 4 && y === 4 ? [255, 255, 255] : [100, 100, 100]) : [255, 255, 255]);
  const s = groupStats(shot, maskOf(picture(9, 9, (x, y) => block(x, y) ? MAGENTA : BLACK)));
  assert.equal(s.pixels, 25); assert.equal(s.white, 4); assert.equal(s.blob, 4);
  assert.equal(lumsUnder(shot, maskOf(picture(9, 9, () => BLACK))).length, 0);
});

test('room stats: blue over red is taken over the brightest pixels only', () => {
  // Ten masked pixels (after erosion): one bright and blue, nine dim and red.
  const mask = maskOf(picture(12, 3, () => MAGENTA));
  const shot = picture(12, 3, (x, y) => y === 1 && x === 1 ? [100, 200, 200] : [60, 10, 10]);
  assert.equal(tailBlueOverRed(shot, mask, .1), 2);
  assert.ok(tailBlueOverRed(shot, mask, 1) < .5);
  assert.equal(tailBlueOverRed(shot, maskOf(picture(12, 3, () => BLACK))), 0);
});

test('room stats: differences count only outside the mask', () => {
  const a = picture(4, 1, () => [10, 10, 10]), b = picture(4, 1, x => x === 1 ? [10, 12, 10] : x === 3 ? [40, 10, 10] : [10, 10, 10]);
  const mask = {width: 4, height: 1, on: Uint8Array.from([0, 0, 0, 1])};
  assert.deepEqual(differOutside(a, b, mask), {differ: 1, max: 2});
  assert.deepEqual(differOutside(a, a, mask), {differ: 0, max: 0});
});
