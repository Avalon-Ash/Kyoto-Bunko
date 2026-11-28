import assert from 'node:assert/strict';
import test from 'node:test';
import {PLATES, preparePlate} from '../src/studies/toji/plate/parts.js';
import {VERTEX_FLOATS, TRIANGLE_FLOATS, VERTEX_OFFSET} from '../src/studies/toji/plate/mesh-geometry.js';

const {parts} = preparePlate(PLATES.W_MINAMI());
const hallWall = parts.find(part => part.id === 'kondo-wall');
const pagodaWalls = parts.filter(part => /^pagoda-wall-\d+$/.test(part.id));

function topTriangles({vertices}) {
  const keys = [];
  const {x, z, ny} = VERTEX_OFFSET;
  for (let i = 0; i < vertices.length; i += TRIANGLE_FLOATS) {
    const corners = [i, i + VERTEX_FLOATS, i + 2 * VERTEX_FLOATS];
    if (corners.every(j => vertices[j + ny] === 1)) {
      keys.push(corners.map(j => `${Math.fround(vertices[j + x])},${Math.fround(vertices[j + z])}`).sort().join('|'));
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
    const [body, ...trim] = wall.mesh;
    const wallTriangles = new Set(topTriangles(body));
    const wallDepth = axisBounds(body, 1)[1];
    const postDepth = Math.max(...trim.map(chunk => axisBounds(chunk, 1)[1]));
    for (const [i, window] of windows.mesh.entries()) {
      const windowDepth = axisBounds(window, 1)[1];
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
    const [body, ...trim] = wall.mesh;
    const [left, right] = axisBounds(body, 0);
    const foot = axisBounds(body, 2)[1];
    const spanningTrim = trim.filter(chunk => {
      const [x0, x1] = axisBounds(chunk, 0);
      return x0 < left && x1 > right;
    });
    const beam = spanningTrim.reduce((front, chunk) => axisBounds(chunk, 2)[1] > axisBounds(front, 2)[1] ? chunk : front);
    const [back, front] = axisBounds(beam, 2);
    assert.ok(back < foot && foot < front, `${wall.id} ends at ${foot}, foot beam spans ${back} to ${front}`);
  }
});
