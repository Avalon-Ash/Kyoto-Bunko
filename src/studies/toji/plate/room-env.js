// The environment map the pieces mirror (scene.environment), and the seam that tints it by day and night. The only place an
// environment is built (docs/adr/0028). It is the room of room.js: the same GLSL function the lid calls per pixel
// (three-pack.js roomLightGlsl), drawn on a sphere around the box and prefiltered by three's PMREMGenerator.
import * as THREE from 'three';
import {ROOM} from './room.js';
import {ROOM_GLSL, roomLightGlsl} from './three-pack.js';
import {normalize} from '../geometry.js';

/**
 * gain: scene.environmentIntensity by day and by night (the brightness of the room in the pieces; colour is roomTint's job).
 * sigma: the blur PMREMGenerator.fromScene gives the scene, in radians. The room's smallest feature must stay over 4 × sigma
 *   (the window's soft edge spans acos(window.edge.sharp) ≈ 42°; a lattice in the window would need this re-set).
 * window: the radiance of the middle of the window in the map. 1 = what the pieces' own window (ROOM.partWindow.gain .55)
 *   showed at its peak before the window moved into the map, over gain.day (.55).
 * fill: how much more of the sky the pieces are given than the lid's proportion of sky to window (1 = the lid's). The one
 *   knob that may part from the lid: a mirror-flat lid needs no light from the side, a standing wall has nothing else.
 * radius: of the sphere the room is drawn on (inside PMREM's near and far; the value itself shows nowhere).
 */
export const ROOM_ENV = {gain: {day: 1.1, night: .9}, sigma: .04, window: 1, fill: 2.5, radius: 10};

/** What multiplies the lid's own figures to give the map's radiance: the window's middle comes out at ROOM_ENV.window. */
export const roomEnvScale = () => ROOM_ENV.window / ROOM.window.gain.sharp;

const ROOM_ENV_VERT_GLSL = `
varying vec3 vRoomDir;
void main(){vRoomDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
/** The room by day, along every direction from the box: the lid's sky and window (roughness 0: PMREM does the blurring). */
const ENV_ROOM = roomLightGlsl({r: 'r', rough: '0.', key: 'uKey', keyC: 'ROOM_KEY_DAY', ambC: 'ROOM_AMB_DAY'});
export const ROOM_ENV_FRAG_GLSL = `
${ROOM_GLSL}
uniform vec3 uKey; uniform float uScale, uFill;
varying vec3 vRoomDir;
void main(){
  vec3 r=normalize(vRoomDir);
  ${ENV_ROOM.terms}
  gl_FragColor=vec4(uScale*(uFill*${ENV_ROOM.sky}+${ENV_ROOM.window}),1.);
}`;

/** Builds the environment map; the caller owns the returned render target (its .texture goes to scene.environment). */
export function buildRoomEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer), room = new THREE.Scene();
  const geometry = new THREE.SphereGeometry(ROOM_ENV.radius, 48, 24);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, vertexShader: ROOM_ENV_VERT_GLSL, fragmentShader: ROOM_ENV_FRAG_GLSL,
    uniforms: {uKey: {value: new THREE.Vector3(...normalize(ROOM.keyDir))}, uScale: {value: roomEnvScale()}, uFill: {value: ROOM_ENV.fill}},
  });
  room.add(new THREE.Mesh(geometry, material));
  try { return pmrem.fromScene(room, ROOM_ENV.sigma); } finally { pmrem.dispose(); geometry.dispose(); material.dispose(); }
}

const hue = c => c.map(v => v / Math.max(...c));
/**
 * The colour the environment's light is multiplied by, [r, g, b]. The one map is baked in the day's colours; by night it
 * takes the hue the window's light takes on the lid (key.night over key.day, brightness taken out: that is ROOM_ENV.gain's).
 * The sky's night hue differs a little from the window's; the map has one tint, the window's (docs/adr/0028).
 */
export const roomTint = night => night ? hue(ROOM.key.night).map((v, i) => v / hue(ROOM.key.day)[i]) : [1, 1, 1];

const TINT_UNIFORM = 'uRoomTint', GAIN_UNIFORM = 'uRoomGain';
const IBL_CHUNK = '#include <lights_fragment_maps>';
/**
 * Multiplies what a MeshStandard/Physical material takes from the environment map by uRoomTint, right after three.js samples
 * it and before anything else is added: the ambient light and the lights are other lamps and are not tinted.
 * Depends on three's chunk and variable names (lights_fragment_maps: radiance, clearcoatRadiance, iblIrradiance; r186);
 * throws when the chunk is not there, so an upgrade of three fails loudly instead of losing the tint.
 */
export function patchRoomTint(shader, uniform, gain) {
  if (!shader.fragmentShader.includes(IBL_CHUNK)) throw new Error('room-env: three.js fragment shader has no lights_fragment_maps chunk to tint');
  shader.uniforms[TINT_UNIFORM] = uniform; shader.uniforms[GAIN_UNIFORM] = gain;
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\nuniform vec3 ${TINT_UNIFORM}; uniform float ${GAIN_UNIFORM};`)
    .replace(IBL_CHUNK, `${IBL_CHUNK}
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
  radiance *= ${TINT_UNIFORM} * ${GAIN_UNIFORM}; clearcoatRadiance *= ${TINT_UNIFORM} * ${GAIN_UNIFORM};
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectDiffuse )
  iblIrradiance *= ${TINT_UNIFORM} * ${GAIN_UNIFORM};
#endif`);
}
