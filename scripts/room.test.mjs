// The room is written once (src/studies/toji/plate/room.js, docs/adr/0028): the lid's shader, the environment map the pieces
// mirror and the renderer's lights all read it.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ROOM} from '../src/studies/toji/plate/room.js';

const read = name => readFileSync(new URL(`../src/studies/toji/plate/${name}`, import.meta.url), 'utf8');
/** A number as a regular expression that matches any way GLSL or JS may spell it: .5, 0.5, 0.50, 1., 1.0. */
const spelt = v => { const [whole, frac = ''] = String(Math.abs(v)).split('.'); return `${v < 0 ? '-' : ''}(?<![\\d.])${whole === '0' ? '0?' : whole}${frac ? `\\.${frac}0*` : '\\.?0*'}(?![\\d])`; };
const triple = c => new RegExp(c.map(spelt).join('\\s*,\\s*'));

// Fence: these files held the room's values before K1. They may name them (ROOM_*, ROOM.*), never spell them.
test('room: the shader pack, the renderer and the environment hold no second copy of the room', () => {
  const pack = read('three-pack.js'), renderer = read('three-renderer.js'), env = read('room-env.js');
  for (const [name, src] of [['three-pack.js', pack], ['three-renderer.js', renderer], ['room-env.js', env]]) {
    assert.doesNotMatch(src, triple(ROOM.keyDir), `${name}: key direction`);
    for (const set of ['key', 'amb']) assert.doesNotMatch(src, triple(ROOM[set].night), `${name}: ${set}.night`);
    assert.doesNotMatch(src, triple(ROOM.amb.day), `${name}: amb.day`);
    for (const light of Object.values(ROOM.direct)) for (const at of Object.values(light)) assert.ok(!src.includes(at.color), `${name}: direct colour ${at.color}`);
  }
  for (const [name, src] of [['three-pack.js', pack], ['three-renderer.js', renderer]]) assert.doesNotMatch(src, /\bRoomEnvironment\b|PMREMGenerator/, `${name}: the environment is built in room-env.js`);
  assert.doesNotMatch(env, /\bRoomEnvironment\b/, 'the environment is the room of room.js, not three\'s stock room');
  assert.doesNotMatch(pack, new RegExp(`mix\\(${spelt(ROOM.window.edge.sharp)},`), 'the window\'s edge is ROOM_WIN_EDGE_*');
  assert.doesNotMatch(pack, new RegExp(`smoothstep\\(${spelt(ROOM.sky.horizon)},`), 'the horizon is ROOM_SKY_HORIZON');
  assert.doesNotMatch(renderer, /environmentIntensity\s*=\s*\(/, 'the environment gain is ROOM_ENV.gain');
});

test('room: ROOM_GLSL holds the table exactly, as floats', async () => {
  const {ROOM_GLSL, MAKIE_GROUND_PARS_GLSL} = await import('../src/studies/toji/plate/three-pack.js');
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
  assert.equal(value('ROOM_SKY_HORIZON'), ROOM.sky.horizon);
  assert.doesNotMatch(ROOM_GLSL, /=-?\d+[,;]/, 'every float is written as a float');
  assert.ok(MAKIE_GROUND_PARS_GLSL.includes(ROOM_GLSL), 'the lid is given the constants');
});

test('room: the lid and the environment map draw the same room', async () => {
  const {roomLightGlsl, ROOM_GLSL, MAKIE_GROUND_PARS_GLSL} = await import('../src/studies/toji/plate/three-pack.js');
  const {ROOM_ENV_FRAG_GLSL} = await import('../src/studies/toji/plate/room-env.js');
  const lid = roomLightGlsl({r: 'r', rough: 'rough', key: 'uKey', keyC: 'mKeyC', ambC: 'mAmbC'});
  const env = roomLightGlsl({r: 'r', rough: '0.', key: 'uKey', keyC: 'ROOM_KEY_DAY', ambC: 'ROOM_AMB_DAY'});
  for (const piece of Object.values(lid)) assert.ok(MAKIE_GROUND_PARS_GLSL.includes(piece), `the lid spells out ${piece.slice(0, 30)}…`);
  for (const piece of Object.values(env)) assert.ok(ROOM_ENV_FRAG_GLSL.includes(piece), `the environment spells out ${piece.slice(0, 30)}…`);
  assert.ok(ROOM_ENV_FRAG_GLSL.includes(ROOM_GLSL), 'with the same constants');
  // Outside the shared text the environment's shader holds no number of its own but 1 (the alpha).
  let rest = ROOM_ENV_FRAG_GLSL.replace(ROOM_GLSL, '');
  for (const piece of Object.values(env)) rest = rest.replace(piece, '');
  assert.deepEqual(rest.match(/(?<![\w.])\d*\.\d+|(?<![\w.])\d+\.(?!\w)/g) ?? [], ['1.']);
});

test('room: the window is in one place for the pieces, the environment map', () => {
  const pack = read('three-pack.js'), renderer = read('three-renderer.js');
  assert.doesNotMatch(renderer, /kyotoWin\b/, 'the pieces add no window of their own');
  assert.doesNotMatch(pack + renderer, /K_WIN\b|K_WIN_SOFT|K_LACQ_WIN|K_LACQ_ROOM|ROOM_PART_WIN|ROOM_LACQ_WIN/, 'nor does the lacquer');
  assert.ok(!('partWindow' in ROOM) && !('lacquerWindow' in ROOM));
});

test('room: the environment keeps the day\'s colours by day and turns the window\'s way by night', async () => {
  const {roomTint, ROOM_ENV, roomEnvScale} = await import('../src/studies/toji/plate/room-env.js');
  assert.deepEqual(roomTint(false), [1, 1, 1]);
  const [r, , b] = roomTint(true), day = ROOM.key.day, night = ROOM.key.night;
  assert.ok(Math.abs(b / r - (night[2] / night[0]) / (day[2] / day[0])) < 1e-12, 'blue over red moves by exactly what the lid\'s window does');
  assert.ok(b / r > 1.2);
  assert.ok(ROOM_ENV.gain.day > ROOM_ENV.gain.night && ROOM_ENV.gain.night > 0);
  assert.equal(roomEnvScale() * ROOM.window.gain.sharp, ROOM_ENV.window, 'the middle of the window comes out at ROOM_ENV.window');
});

test('room: every material lit by three.js goes through the tint seam, with its own gain', async () => {
  const {patchRoomTint} = await import('../src/studies/toji/plate/room-env.js');
  const shader = {uniforms: {}, fragmentShader: '#include <common>\nvoid main(){\n#include <lights_fragment_maps>\n}'};
  const tint = {value: [1, 1, 1]}, gain = {value: 1.4};
  patchRoomTint(shader, tint, gain);
  assert.equal(shader.uniforms.uRoomTint, tint); assert.equal(shader.uniforms.uRoomGain, gain);
  assert.match(shader.fragmentShader, /radiance \*= uRoomTint \* uRoomGain/);
  assert.match(shader.fragmentShader, /iblIrradiance \*= uRoomTint \* uRoomGain/);
  assert.throws(() => patchRoomTint({uniforms: {}, fragmentShader: 'void main(){}'}, tint, gain), /lights_fragment_maps/);
  const renderer = read('three-renderer.js');
  assert.equal((renderer.match(/patchRoomTint\(/g) ?? []).length, 2, 'bindGlow (pieces, limbs, stamps, box) and the cords');
  assert.doesNotMatch(renderer, /\.envMapIntensity\b/, 'three ignores material.envMapIntensity without a material envMap: the table\'s roomGain goes through the seam');
});
