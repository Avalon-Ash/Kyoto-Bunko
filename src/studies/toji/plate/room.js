// The room the box sits in: where the window is, how wide and bright it reads, the sky above, and the colours of its light by
// day and by night. The one place these are written (docs/adr/0028): the lid's shader, the pieces' shader and the environment
// map (room-env.js) all read this table. Imports nothing, so node:test and the shooting scripts can read it.
//
// The lid's colours (key, amb) are written as the lid's shader uses them: it does its own tone and colour-space handling, so
// they are not comparable with `direct`, which three.js treats as sRGB light colours under NeutralToneMapping.

export const ROOM = {
  /** Toward the window (the key light), in plate space; not normalised (normalize() it, as three-renderer.js does). */
  keyDir: [-.5, .78, .22],
  /** The window's light and the sky's, as the lid's shader mixes them by uNight. */
  key: {day: [1, .95, .86], night: [.64, .72, .90]},
  amb: {day: [1, .96, .90], night: [.50, .60, .84]},
  /**
   * The window as the lid mirrors it: a smoothstep on dot(reflected ray, keyDir) from `edge` to 1, times `gain`.
   * `sharp` is a mirror-smooth surface, `rough` a fully rough one; the shader mixes between them by roughness.
   */
  window: {edge: {sharp: .74, rough: .15}, gain: {sharp: 1.15, rough: .5}},
  /**
   * The sky above the box: amb × (floor + zenith × up²). up is a smoothstep of the ray's height from `horizon` (a little
   * below level: the room's light reaches under the horizon) to straight up.
   */
  sky: {floor: .04, zenith: .30, horizon: -.35},
  /**
   * The lights three.js shines on the pieces (the ambient and the key DirectionalLight), by day and by night. A second set
   * of "the room's light colours" beside key/amb above, with other values: kept as found, to be unified in a later round
   * (docs/plans/2026-11-28-room.md Q2, the user's answer of 2026-11-27).
   */
  direct: {
    ambient: {day: {color: '#fff4e0', intensity: .55}, night: {color: '#7f96d6', intensity: .5}},
    key: {day: {color: '#fff0d6', intensity: 3.4}, night: {color: '#c4c8e2', intensity: 3.1}},
  },
};

/** 'day' or 'night': the key of every {day, night} pair above. */
export const roomTime = night => night ? 'night' : 'day';
