// The still pictures the cabinet shows where three.js cannot run (src/studies/toji/plate/static-plate.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {pictureLayout} from '../src/studies/toji/plate/static-layout.js';
import {LANDMARK_STUDIES} from '../src/studies/toji/landmarks.js';
import {viewBox} from '../src/studies/toji/view.js';
import {multiply, lookAt, ortho, project} from '../src/studies/toji/geometry.js';

const DIR = new URL('../src/studies/toji/plate/static/', import.meta.url);

test('a picture of the reference frame fills a canvas of that shape exactly', () => {
  const l = pictureLayout(950, 680);
  assert.deepEqual([l.width, l.height, l.left, l.top].map(v => Math.round(v * 1e6) / 1e6), [950, 680, 0, 0]);
  // Twice as large on screen: twice the pixels, still filling it.
  const big = pictureLayout(1900, 1360);
  assert.deepEqual([big.width, big.height].map(Math.round), [1900, 1360]);
});

test('the picture lands where the camera puts the plate, at any canvas shape, zoom and pan', () => {
  // The three.js canvas shows view-box (zoom, pan) of the camera plane; the picture covers the 950 x 680 box centred on the origin.
  // A point of the plate must therefore sit at the same CSS pixel in the picture's layout and in the camera's own projection.
  const view = lookAt([430, 720, 920], [0, 40, 0]);
  for (const [w, h, zoom, cx, cy] of [[375, 300, 1, 0, 0], [375, 700, 1, 0, 0], [1440, 820, 1, 0, 0], [800, 800, 2, 60, -30], [320, 420, 3, -90, 40]]) {
    const v = viewBox(w / h, zoom, cx, cy), matrix = multiply(ortho(v.left, v.right, v.bottom, v.top, 1, 2200), view), l = pictureLayout(w, h, zoom, cx, cy);
    for (const point of [[0, 0, 0], [-370, 0, 240], [370, -94, -240], [72, 241, 25]]) {
      const [nx, ny] = project(matrix, point), screen = [(nx + 1) / 2 * w, (1 - ny) / 2 * h];
      // (The matrices are float32, hence the tolerance.) The reference picture holds the same point at a pixel of its own: the camera plane box of the reference frame.
      const ref = project(multiply(ortho(-475, 475, -340, 340, 1, 2200), view), point), pixel = [(ref[0] + 1) / 2 * 950, (1 - ref[1]) / 2 * 680];
      const placed = [l.left + pixel[0] * l.width / 950, l.top + pixel[1] * l.height / 680];
      assert.ok(Math.hypot(placed[0] - screen[0], placed[1] - screen[1]) < .01, `${w}x${h} zoom ${zoom}: ${point}`);
    }
  }
});

test('every ward has a day and a night picture: transparent webp, each within 150 KB, all within 2.5 MB', () => {
  const files = readdirSync(DIR).filter(name => name.endsWith('.webp')).sort();
  assert.deepEqual(files, Object.keys(LANDMARK_STUDIES).flatMap(ward => ['day', 'night'].map(light => `${ward}.${light}.webp`)).sort());
  let total = 0;
  for (const name of files) {
    const size = statSync(new URL(name, DIR)).size, head = readFileSync(new URL(name, DIR)).subarray(0, 32);
    total += size;
    assert.ok(size <= 150 * 1024, `${name}: ${size} bytes`);
    assert.equal(head.subarray(0, 4).toString(), 'RIFF');assert.equal(head.subarray(8, 12).toString(), 'WEBP');
    assert.equal(head.subarray(12, 16).toString(), 'VP8X', `${name}: extended webp`);
    assert.ok(head[20] & 0x10, `${name}: has an alpha channel`);
    // Canvas size minus one, 24 bits each: the reference frame.
    assert.equal((head[24] | head[25] << 8 | head[26] << 16) + 1, 950);assert.equal((head[27] | head[28] << 8 | head[29] << 16) + 1, 680);
  }
  assert.ok(total <= 2.5 * 1024 * 1024, `total ${total} bytes`);
});
