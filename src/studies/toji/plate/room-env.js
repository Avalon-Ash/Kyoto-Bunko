// The environment map the pieces mirror (scene.environment), and the seam that tints it by day and night. The only place an
// environment is built (docs/adr/0028); what it shows is derived from room.js.
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * gain: scene.environmentIntensity by day and by night (the brightness of the room in the pieces; colour is roomTint's job).
 * sigma: the blur PMREMGenerator.fromScene gives the scene, in radians.
 */
export const ROOM_ENV = {gain: {day: .55, night: .36}, sigma: .04};

/** Builds the environment map; the caller owns the returned render target (its .texture goes to scene.environment). */
export function buildRoomEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  try { return pmrem.fromScene(room, ROOM_ENV.sigma); } finally { pmrem.dispose(); room.dispose?.(); }
}

/** The colour the environment's light is multiplied by, [r, g, b]: the one map is baked in the day's colours. */
export const roomTint = _night => [1, 1, 1];

const TINT_UNIFORM = 'uRoomTint';
const IBL_CHUNK = '#include <lights_fragment_maps>';
/**
 * Multiplies what a MeshStandard/Physical material takes from the environment map by uRoomTint, right after three.js samples
 * it and before anything else is added: the ambient light and the lights are other lamps and are not tinted.
 * Depends on three's chunk and variable names (lights_fragment_maps: radiance, clearcoatRadiance, iblIrradiance; r186);
 * throws when the chunk is not there, so an upgrade of three fails loudly instead of losing the tint.
 */
export function patchRoomTint(shader, uniform) {
  if (!shader.fragmentShader.includes(IBL_CHUNK)) throw new Error('room-env: three.js fragment shader has no lights_fragment_maps chunk to tint');
  shader.uniforms[TINT_UNIFORM] = uniform;
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\nuniform vec3 ${TINT_UNIFORM};`)
    .replace(IBL_CHUNK, `${IBL_CHUNK}
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
  radiance *= ${TINT_UNIFORM}; clearcoatRadiance *= ${TINT_UNIFORM};
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectDiffuse )
  iblIrradiance *= ${TINT_UNIFORM};
#endif`);
}
