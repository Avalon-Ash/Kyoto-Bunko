// The box of a makie plate: lid top (a shallow dome), chamfer, sides, silver rim, body, interior with its tray and scrolls,
// ring fittings and the ground shadow underlay, as one vertex list (10 floats per vertex: position, normal, uv, material, part).
// three-renderer.js slices it by material id (three-pack.js sliceBox). Plate units; see docs/MAKIE_THREE_PLAN.md.
import {normalize} from '../geometry.js';

const STRIDE = 10;

/** Where each cord leaves its ring: on the two sides of the body that face the viewer. `out` points away from the wall. */
export const FITTINGS = [{anchor: [40, -72, 239], out: [0, 1]}, {anchor: [369, -72, -30], out: [1, 0]}];

/** The box: lid top (a shallow dome), chamfer, sides, silver rim, body, interior with its tray and scrolls, ring fittings, and its ground shadow. */
export function buildBox() {
  const out = [];
  const v = (p, n, uv, mat, part) => out.push(p[0], p[1], p[2], n[0], n[1], n[2], uv[0], uv[1], mat, part);
  const dome = (x, z) => 3.2 * (1 - (x / 370) ** 2) * (1 - (z / 240) ** 2);
  const NX = 120, NZ = 78;
  const top = (i, j) => {
    const x = -370 + 740 * i / NX, z = -240 + 480 * j / NZ;
    const n = normalize([3.2 * 2 * x / 370 ** 2 * (1 - (z / 240) ** 2), 1, 3.2 * 2 * z / 240 ** 2 * (1 - (x / 370) ** 2)]);
    return [[x, dome(x, z), z], n, [x, z]];
  };
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) for (const [a, b] of [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]]) { const t = top(i + a, j + b); v(t[0], t[1], t[2], 0, 0); }
  const lidTop = out.length / STRIDE;
  // Four trapezoids between an upper and a lower rectangular ring. ka/kb: 0 = normal up, 1 = normal outward.
  const band = (a, b, mat, part, ka, kb, sign = 1, ox = 0) => {
    const corners = r => [[ox - r.hx, r.y, -r.hz], [ox + r.hx, r.y, -r.hz], [ox + r.hx, r.y, r.hz], [ox - r.hx, r.y, r.hz]];
    const A = corners(a), B = corners(b), dirs = [[0, 0, -1], [1, 0, 0], [0, 0, 1], [-1, 0, 0]];
    let run = 0;
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4, d = dirs[i].map(x => x * sign), length = Math.hypot(A[j][0] - A[i][0], A[j][2] - A[i][2]);
      const na = normalize([d[0] * ka, 1 - ka, d[2] * ka]), nb = normalize([d[0] * kb, 1 - kb, d[2] * kb]);
      const quad = [[A[i], na, [run, a.y]], [A[j], na, [run + length, a.y]], [B[j], nb, [run + length, b.y]], [B[i], nb, [run, b.y]]];
      for (const k of [0, 1, 2, 0, 2, 3]) v(quad[k][0], quad[k][1], quad[k][2], mat, part);
      run += length;
    }
  };
  band({hx: 370, hz: 240, y: 0}, {hx: 372.6, hz: 242.6, y: -3}, 26, 0, .12, .88);
  band({hx: 372.6, hz: 242.6, y: -3}, {hx: 372.6, hz: 242.6, y: -33}, 20, 0, 1, 1);
  band({hx: 373.5, hz: 243.5, y: -33}, {hx: 373.5, hz: 243.5, y: -37.5}, 21, 0, 1, 1);
  band({hx: 372.6, hz: 242.6, y: -33}, {hx: 373.5, hz: 243.5, y: -33}, 21, 0, 0, 0);
  band({hx: 373.5, hz: 243.5, y: -37.5}, {hx: 365, hz: 235, y: -37.5}, 21, 0, 0, 0);
  band({hx: 365, hz: 235, y: -37.5}, {hx: 365, hz: 235, y: -94}, 20, 1, 1, 1);
  band({hx: 365, hz: 235, y: -40}, {hx: 357, hz: 227, y: -40}, 21, 1, 0, 0);
  band({hx: 357, hz: 227, y: -40}, {hx: 357, hz: 227, y: -88}, 22, 2, 1, 1, -1);
  const flat = (hx, hz, y, mat, part, ox = 0) => { const q = [[ox - hx, y, -hz], [ox + hx, y, -hz], [ox + hx, y, hz], [ox - hx, y, hz]]; for (const k of [0, 1, 2, 0, 2, 3]) v(q[k], [0, 1, 0], [q[k][0], q[k][2]], mat, part); };
  flat(357, 227, -88, 22, 2);
  // Kakego: a shallow tray resting in the left of the box, with its own silver rim.
  const TX = -236;
  band({hx: 118, hz: 224, y: -42}, {hx: 118, hz: 224, y: -62}, 22, 2, 1, 1, 1, TX);
  band({hx: 118, hz: 224, y: -42}, {hx: 113, hz: 219, y: -42}, 21, 2, 0, 0, 1, TX);
  band({hx: 113, hz: 219, y: -42}, {hx: 113, hz: 219, y: -57}, 28, 2, 1, 1, -1, TX);
  flat(113, 219, -57, 28, 2, TX);
  // Two small packets of ryoshi rest on the tray floor, below its rim.
  const packet = (x0, x1, z0, z1, y0, y1, mat) => {
    const p = [[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],
      [x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]];
    const faces = [[[4,7,6,5],[0,1,0]],[[0,1,2,3],[0,-1,0]],
      [[0,4,5,1],[0,0,-1]],[[3,2,6,7],[0,0,1]],
      [[0,3,7,4],[-1,0,0]],[[1,5,6,2],[1,0,0]]];
    for (const [ids,n] of faces) for (const k of [0,1,2,0,2,3]) {
      const q = p[ids[k]]; v(q,n,[q[0],q[2]],mat,2);
    }
  };
  for (const z of [-116,84]) {
    for (let i = 0; i < 3; i++) {
      const dx = (i - 1) * 2, dz = i * 1.5, y = -57 + i * 2.4;
      packet(TX-82+dx,TX+82+dx,z-56+dz,z+56+dz,y,y+2.4,23);
    }
    // A narrow gold paper band wraps each packet, leaving the paper legible.
    packet(TX-3,TX+3,z-56,z+59,-49.8,-49.1,24);
    packet(TX-3,TX+3,z-56.5,z-56,-57,-49.1,24);
    packet(TX-3,TX+3,z+59,z+59.5,-57,-49.1,24);
  }
  const cylinder = (x0, x1, y, z, r, mat, sides = 20) => {
    const at = (x, t) => [[x, y + Math.cos(t) * r, z + Math.sin(t) * r], [0, Math.cos(t), Math.sin(t)], [x, t * r]];
    for (let i = 0; i < sides; i++) {
      const t = i / sides * 6.2832, s = (i + 1) / sides * 6.2832, q = [at(x0, t), at(x1, t), at(x1, s), at(x0, s)];
      for (const k of [0, 1, 2, 0, 2, 3]) v(q[k][0], q[k][1], q[k][2], mat, 2);
      for (const [x, nx] of [[x0, -1], [x1, 1]]) { v([x, y, z], [nx, 0, 0], [0, 0], mat, 2); v(at(x, t)[0], [nx, 0, 0], [0, 0], mat, 2); v(at(x, s)[0], [nx, 0, 0], [0, 0], mat, 2); }
    }
  };
  for (const z of [-135, 0, 135]) {
    cylinder(-88, 300, -70, z, 17, 23); cylinder(-104, 318, -70, z, 4.5, 24, 12);
    // Each roll is dressed as a handscroll is: a band of gold at either end of the paper, and a red cord tied round its middle.
    cylinder(-88, -68, -70, z, 17.5, 24); cylinder(280, 300, -70, z, 17.5, 24);
    cylinder(102, 107, -70, z, 17.9, 27);
  }
  // Himo-kanagu: a domed seat and a ring on each side that faces the viewer. Local axes: u along the wall, w outward.
  for (const {anchor: [ax, , az], out: [ox, oz]} of FITTINGS) {
    const at = (u, vy, w) => [ax - oz * u + ox * (w - 4), vy, az + ox * u + oz * (w - 4)], dir = (u, vy, w) => normalize([-oz * u + ox * w, vy, ox * u + oz * w]);
    const cy = -58, rings = [[0, 4.5], [5, 4], [9, 2.4], [13, .4]], S = 20;
    for (let i = 0; i < S; i++) for (let k = 0; k < rings.length - 1; k++) {
      const a0 = i / S * 6.2832, a1 = (i + 1) / S * 6.2832, [r0, w0] = rings[k], [r1, w1] = rings[k + 1];
      const pt = (a, r, w) => [at(Math.cos(a) * r, cy + Math.sin(a) * r, w), dir(Math.cos(a) * (w0 - w1), Math.sin(a) * (w0 - w1), r1 - r0), [Math.cos(a) * r, Math.sin(a) * r]];
      const q = [pt(a0, r0, w0), pt(a1, r0, w0), pt(a1, r1, w1), pt(a0, r1, w1)];
      for (const j of [0, 1, 2, 0, 2, 3]) v(q[j][0], q[j][1], q[j][2], 24, 1);
    }
    // The ring: a small torus hanging from the seat.
    const R = 7, T = 1.5, M = 18, N = 8;
    for (let i = 0; i < M; i++) for (let k = 0; k < N; k++) {
      const pt = (ai, ak) => { const a = ai / M * 6.2832, b = ak / N * 6.2832, c = Math.cos(b), s = Math.sin(b); return [at(Math.cos(a) * (R + c * T), cy - R + Math.sin(a) * (R + c * T), 5 + s * T), dir(Math.cos(a) * c, Math.sin(a) * c, s), [a * R, b * T]]; };
      const q = [pt(i, k), pt(i + 1, k), pt(i + 1, k + 1), pt(i, k + 1)];
      for (const j of [0, 1, 2, 0, 2, 3]) v(q[j][0], q[j][1], q[j][2], 24, 1);
    }
  }
  const opaque = out.length / STRIDE;
  flat(640, 470, -94.5, 25, 1);
  return {data: new Float32Array(out), lidTop, opaque, total: out.length / STRIDE};
}
