// The cabinet's fixed home camera: one orthographic view from above and in front, the lid seen at an angle. The only place it is
// written (chain-3 P1). renderer.js builds the hit-testing matrix from it, plate/three-renderer.js the three.js camera; the
// backdrop's cabinet keepout reaches it through renderer.js's matrix; the tests import it. No imports: plain numbers in plate units.

/** Where the camera stands. */
export const EYE = Object.freeze([430, 720, 920]);
/** The point it looks at: the lid's centre, raised to the height of the parts standing on it. */
export const TARGET = Object.freeze([0, 40, 0]);
/** Near and far clip distances along the view: the whole box and the parts that rise from it lie between them. */
export const NEAR = 1, FAR = 2200;
