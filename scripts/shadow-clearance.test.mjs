import assert from 'node:assert/strict';
import test from 'node:test';
import {PLATES, preparePlate} from '../src/studies/toji/plate/parts.js';
import {VERTEX_FLOATS, TRIANGLE_FLOATS, VERTEX_OFFSET} from '../src/studies/toji/plate/mesh-geometry.js';

const {x: X, y: Y, z: Z, ny: NY} = VERTEX_OFFSET;
const {parts} = preparePlate(PLATES.W_MINAMI());
const hallWall = parts.find(part => part.id === 'kondo-wall');
const pagodaWalls = parts.filter(part => /^pagoda-wall-\d+$/.test(part.id));
// meshStorey (architecture-mesh.js) puts the wall shell first in wall.mesh and the posts and beams after it.
const shellAndTrim = wall => { const [body, ...trim] = wall.mesh; return {body, trim}; };
/** Every storey wall on every plate: a wall is the part a `-lamp` part (its windows) moves with. */
const storeyWalls = Object.entries(PLATES).flatMap(([ward, plate]) => {
  const all = preparePlate(plate()).parts;
  return all.filter(wall => all.some(p => p.motionWith === wall.id && p.id.endsWith('-lamp'))).map(wall => ({ward, wall}));
});

test('the storey fixtures exist, so the checks below cannot pass on an empty list', () => {
  assert.ok(hallWall, 'kondo-wall');
  assert.ok(pagodaWalls.length > 0, 'pagoda walls');
  assert.ok(storeyWalls.length > pagodaWalls.length, 'storey walls on more than one building');
});

function topTriangles({vertices}) {
  const keys = [];
  for (let i = 0; i < vertices.length; i += TRIANGLE_FLOATS) {
    const corners = [i, i + VERTEX_FLOATS, i + 2 * VERTEX_FLOATS];
    if (corners.every(j => vertices[j + NY] === 1)) {
      keys.push(corners.map(j => `${Math.fround(vertices[j + X])},${Math.fround(vertices[j + Z])}`).sort().join('|'));
    }
  }
  return keys;
}

const axisBounds = ({vertices}, axis) => {
  const values = vertices.filter((_, i) => i % VERTEX_FLOATS === axis);
  return [Math.min(...values), Math.max(...values)];
};

test('storey windows stay above wall triangles as both sample the ground', () => {
  for (const wall of [hallWall, ...pagodaWalls]) {
    const windows = parts.find(part => part.motionWith === wall.id && part.id.endsWith('-lamp'));
    assert.deepEqual([windows.foot, windows.hinge, windows.anchor, windows.bias], [wall.foot, wall.hinge, wall.anchor, wall.bias]);
    const {body, trim} = shellAndTrim(wall);
    const wallTriangles = new Set(topTriangles(body));
    const wallDepth = axisBounds(body, Y)[1];
    const postDepth = Math.max(...trim.map(chunk => axisBounds(chunk, Y)[1]));
    for (const [i, window] of windows.mesh.entries()) {
      const windowDepth = axisBounds(window, Y)[1];
      assert.ok(wallDepth < windowDepth && windowDepth < postDepth, `${wall.id} window ${i + 1} sits between wall and posts`);
      const triangles = topTriangles(window);
      assert.ok(triangles.length > 0);
      for (const key of triangles) {
        assert.ok(wallTriangles.has(key), `${wall.id} window ${i + 1} and its backing must interpolate the same ground samples`);
      }
    }
  }
});

test('storey wall ends inside the foot beam so their front faces cannot share a depth plane', () => {
  for (const wall of [hallWall, ...pagodaWalls]) {
    const {body, trim} = shellAndTrim(wall);
    const [left, right] = axisBounds(body, X);
    const foot = axisBounds(body, Z)[1];
    const spanningTrim = trim.filter(chunk => {
      const [x0, x1] = axisBounds(chunk, X);
      return x0 < left && x1 > right;
    });
    const beam = spanningTrim.reduce((front, chunk) => axisBounds(chunk, Z)[1] > axisBounds(front, Z)[1] ? chunk : front);
    const [back, front] = axisBounds(beam, Z);
    assert.ok(back < foot && foot < front, `${wall.id} ends at ${foot}, foot beam spans ${back} to ${front}`);
  }
});

// The shell is stitched from each window's cap triangles and a chamfered border whose left and right edges are picked by
// index (LEFT_EDGE / RIGHT_EDGE in architecture-mesh.js, which rely on chamferConvex's point order). A wrong index leaves
// a hole or a doubled face at a bay seam: every directed edge must then appear once, with its reverse.
test('every storey wall shell is closed: each directed edge appears once and its reverse once', () => {
  const point = (v, j) => [X, Y, Z].map(a => Math.fround(v[j + a])).join(',');
  for (const {ward, wall} of storeyWalls) {
    const v = shellAndTrim(wall).body.vertices, edges = new Map();
    for (let i = 0; i < v.length; i += TRIANGLE_FLOATS) {
      const p = [0, 1, 2].map(k => point(v, i + k * VERTEX_FLOATS));
      for (let k = 0; k < 3; k++) {
        const key = `${p[k]}>${p[(k + 1) % 3]}`;
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    for (const [key, count] of edges) {
      const [a, b] = key.split('>');
      assert.equal(count, 1, `${ward} ${wall.id}: edge ${key} used ${count} times`);
      assert.equal(edges.get(`${b}>${a}`), 1, `${ward} ${wall.id}: edge ${key} has no reverse (a hole)`);
    }
  }
});
