// The room is written once (src/studies/toji/plate/room.js, docs/adr/0028): the shaders and the renderer read it.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ROOM} from '../src/studies/toji/plate/room.js';

const read = name => readFileSync(new URL(`../src/studies/toji/plate/${name}`, import.meta.url), 'utf8');
/** A number as a regular expression that matches any way GLSL or JS may spell it: .5, 0.5, 0.50, 1., 1.0. */
const spelt = v => { const [whole, frac = ''] = String(Math.abs(v)).split('.'); return `${v < 0 ? '-' : ''}(?<![\\d.])${whole === '0' ? '0?' : whole}${frac ? `\\.${frac}0*` : '\\.?0*'}(?![\\d])`; };
const triple = c => new RegExp(c.map(spelt).join('\\s*,\\s*'));

// Fence: these two files held the room's values before K1. They may name them (ROOM_*, ROOM.*), never spell them.
test('room: the shader pack and the renderer hold no second copy of the room', () => {
  const pack = read('three-pack.js'), renderer = read('three-renderer.js');
  for (const [name, src] of [['three-pack.js', pack], ['three-renderer.js', renderer]]) {
    assert.doesNotMatch(src, triple(ROOM.keyDir), `${name}: key direction`);
    for (const set of ['key', 'amb']) assert.doesNotMatch(src, triple(ROOM[set].night), `${name}: ${set}.night`);
    assert.doesNotMatch(src, triple(ROOM.amb.day), `${name}: amb.day`);
    for (const light of Object.values(ROOM.direct)) for (const at of Object.values(light)) assert.ok(!src.includes(at.color), `${name}: direct colour ${at.color}`);
    assert.doesNotMatch(src, /\bRoomEnvironment\b|PMREMGenerator/, `${name}: the environment is built in room-env.js`);
  }
  assert.doesNotMatch(pack, new RegExp(`mix\\(${spelt(ROOM.window.edge.sharp)},`), 'the lid window edge is ROOM_WIN_EDGE_*');
  assert.doesNotMatch(pack, /K_WIN(_SOFT)?\s*=|K_LACQ_WIN(_EXP)?\s*=/, 'the pieces\' window constants come from ROOM_GLSL');
  assert.doesNotMatch(renderer, /environmentIntensity\s*=\s*\(/, 'the environment gain is ROOM_ENV.gain');
});

test('room: ROOM_GLSL holds the table exactly, as floats', async () => {
  const {ROOM_GLSL, PART_LIGHT_GLSL, MAKIE_GROUND_PARS_GLSL} = await import('../src/studies/toji/plate/three-pack.js');
  const value = name => { const m = ROOM_GLSL.match(new RegExp(`\\b${name}=(vec3\\(([^)]*)\\)|[^,;]+)`)); assert.ok(m, name); return m[2] ? m[2].split(',').map(Number) : Number(m[1]); };
  assert.deepEqual(value('ROOM_KEY_DAY'), ROOM.key.day);
  assert.deepEqual(value('ROOM_KEY_NIGHT'), ROOM.key.night);
  assert.deepEqual(value('ROOM_AMB_DAY'), ROOM.amb.day);
  assert.deepEqual(value('ROOM_AMB_NIGHT'), ROOM.amb.night);
  assert.equal(value('ROOM_WIN_EDGE_SHARP'), ROOM.window.edge.sharp);
  assert.equal(value('ROOM_WIN_EDGE_ROUGH'), ROOM.window.edge.rough);
  assert.equal(value('ROOM_WIN_GAIN_SHARP'), ROOM.window.gain.sharp);
  assert.equal(value('ROOM_WIN_GAIN_ROUGH'), ROOM.window.gain.rough);
  assert.equal(value('ROOM_SKY_FLOOR'), ROOM.sky.floor);
  assert.equal(value('ROOM_SKY_ZENITH'), ROOM.sky.zenith);
  assert.equal(value('ROOM_PART_WIN_SOFT'), ROOM.partWindow.soft);
  assert.equal(value('ROOM_PART_WIN_GAIN'), ROOM.partWindow.gain);
  assert.equal(value('ROOM_PART_WIN_NIGHT'), ROOM.partWindow.night);
  assert.equal(value('ROOM_LACQ_WIN_GAIN'), ROOM.lacquerWindow.gain);
  assert.equal(value('ROOM_LACQ_WIN_EXP'), ROOM.lacquerWindow.exp);
  assert.doesNotMatch(ROOM_GLSL, /=\d+[,;]/, 'every float is written as a float');
  assert.ok(PART_LIGHT_GLSL.includes(ROOM_GLSL) && MAKIE_GROUND_PARS_GLSL.includes(ROOM_GLSL), 'the pieces and the lid are given the same constants');
});

test('room: the environment keeps the day\'s colours by day', async () => {
  const {roomTint, ROOM_ENV} = await import('../src/studies/toji/plate/room-env.js');
  assert.deepEqual(roomTint(false), [1, 1, 1]);
  assert.ok(ROOM_ENV.gain.day > ROOM_ENV.gain.night && ROOM_ENV.gain.night > 0);
});
