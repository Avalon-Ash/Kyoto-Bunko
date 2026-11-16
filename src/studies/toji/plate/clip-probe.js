// Dev only: how deep do the parts go into the ground and into each other? (docs/plans/2026-11-16-clip.md)
// Runs the renderer's vertex motion on the CPU (export-glb.js poseKit) for a lying plate and for each group standing,
// then measures in plate units. scripts/plate-clip.mjs drives it through window.__kyotoPlatePose in the dev server.
//   ground: a sample point of a part that is below the lid's surface, by how much
//   pairs:  a sample point of one part inside another part's closed body (a mesh), by how far from its nearest face
// Samples are every vertex of a mesh or limb and a 4x4 grid across each leaf stamp. Parts of one group (a tower's
// storeys, a tree and its leaves and bird) are meant to meet and are not compared with each other.
import {poseKit} from './export-glb.js';
import {meshesByMaterial, limbsByMaterial, stampsByMaterial} from './three-pack.js';
import {KIND} from './vocab.js';

const GRID = 4;
/** How far a group is up in the postures measured: its rise is full, and it stands this far (.14 is rest; 1 is the dwell). */
const STANDS = [.14, .4, .7, 1];

/** World triangles and sample points per part index: {index → {tris: number[][9], pts: number[][3]}}. */
function geometryOf(pose, kit) {
  const out = new Map();
  const slot = i => { if (!out.has(i)) out.set(i, {tris: [], pts: [], local: []}); return out.get(i); };
  const pack = (byMat, fn) => {
    for (const data of byMat.values()) {
      for (let i = 0; i + 48 <= data.length; i += 48) {
        const tri = [], id = Math.round(data[i + 8]), s = slot(id);
        for (let k = 0; k < 3; k++) {
          const v = data.subarray(i + k * 16, i + k * 16 + 16), r = fn(v);
          tri.push(...r.p); s.pts.push(r.p); s.local.push(r.h);
        }
        s.tris.push(tri);
      }
    }
  };
  pack(meshesByMaterial(pose.parts), v => ({p: kit.partVertex([v[0], v[1], v[2]], [v[3], v[4], v[5]], v.subarray(8, 12), v.subarray(12, 16)).p, h: v[1] + v[15]}));
  pack(limbsByMaterial(pose.parts), v => ({p: kit.treeVertex([v[0], v[2]], v[1], [v[3], v[4], v[5]], v.subarray(8, 12), v.subarray(12, 16)).p, h: v[1]}));
  for (const s of stampsByMaterial(pose.parts).values()) {
    for (let n = 0; n < s.count; n++) {
      const pl = s.placement.subarray(n * 4, n * 4 + 4), st = s.stamp.subarray(n * 4, n * 4 + 4), owner = s.owner.subarray(n * 4, n * 4 + 4), style = s.style.subarray(n * 4, n * 4 + 4);
      const c = Math.cos(pl[2]), sn = Math.sin(pl[2]), g = slot(Math.round(owner[0]));
      const at = (u, v) => { const k = [(u - .5) * st[0], (v - .5) * st[1]]; return kit.treeVertex([pl[0] + c * k[0] - sn * k[1], pl[1] + sn * k[0] + c * k[1]], pl[3], [0, 1, 0], owner, style).p; };
      // The quad is flat between its four corners (the ground under it is not): bilinear, not groundY, at the inner points.
      const c00 = at(0, 0), c10 = at(1, 0), c01 = at(0, 1), c11 = at(1, 1);
      for (let j = 0; j <= GRID; j++) for (let i = 0; i <= GRID; i++) {
        const u = i / GRID, v = j / GRID;
        g.pts.push([0, 1, 2].map(k => (c00[k] * (1 - u) + c10[k] * u) * (1 - v) + (c01[k] * (1 - u) + c11[k] * u) * v)); g.local.push(pl[3]);
      }
    }
  }
  return out;
}

/** Y of the triangle's plane at (x, z) when (x, z) is inside it from above, else null. */
function hitY(t, x, z) {
  const d = (t[2] - t[8]) * (t[3] - t[0]) + (t[6] - t[0]) * (t[8] - t[2]);
  // Barycentric on the xz projection: vertices (t0,t2), (t3,t5), (t6,t8).
  const den = (t[5] - t[8]) * (t[0] - t[6]) + (t[6] - t[3]) * (t[2] - t[8]);
  if (Math.abs(den) < 1e-9) return null;
  const a = ((t[5] - t[8]) * (x - t[6]) + (t[6] - t[3]) * (z - t[8])) / den;
  const b = ((t[8] - t[2]) * (x - t[6]) + (t[0] - t[6]) * (z - t[8])) / den;
  const c = 1 - a - b;
  if (a < 0 || b < 0 || c < 0) return null;
  void d;
  return a * t[1] + b * t[4] + c * t[7];
}

function bbox(tris) {
  const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const t of tris) for (let k = 0; k < 3; k++) for (let m = 0; m < 3; m++) { b[m] = Math.min(b[m], t[k * 3 + m]); b[m + 3] = Math.max(b[m + 3], t[k * 3 + m]); }
  return b;
}

/**
 * @param {{ward: string, parts: any[], soft: any, ident: Uint8Array, mw: number, mh: number, a: Float32Array, b: Float32Array}} pose a settled, lying plate
 * @param {{treeAtAnchor?: boolean, minDepth?: number}} [opts] treeAtAnchor measures the trees as they moved before the fix
 */
export function probeClip(pose, opts = {}) {
  const minDepth = opts.minDepth ?? .25;
  const groups = [...new Set(pose.parts.filter(p => !p.attach).map(p => p.group))];
  const postures = [{name: 'lying', group: null}, {name: 'lying-hand', group: null, risen: true}, ...groups.flatMap(g => STANDS.map(stand => ({name: `stand${stand}:${g}`, group: g, stand})))];
  const ground = [], pairs = [];
  for (const posture of postures) {
    const a = Float32Array.from(pose.a), b = Float32Array.from(pose.b);
    // lying-hand: the hand is over the lid, so every bank has risen to its full relief but nothing stands yet.
    if (posture.risen) for (let i = 0; i <= pose.parts.length; i++) a[i * 4 + 2] = Math.max(a[i * 4 + 2], 1);
    const mine = new Set(pose.parts.filter(p => posture.group && (p.group === posture.group || p.attach === posture.group)).map(p => p.index));
    for (const i of mine) { a[i * 4] = 0; a[i * 4 + 1] = posture.stand; a[i * 4 + 2] = 1; b[i * 4] = 0; b[i * 4 + 1] = 0; }
    const kit = poseKit({...pose, a, b, treeAtAnchor: opts.treeAtAnchor});
    const geo = geometryOf(pose, kit);
    const byIndex = new Map(pose.parts.map(p => [p.index, p]));
    const shown = i => posture.group === null || mine.has(i);
    for (const [i, g] of geo) {
      const part = byIndex.get(i);
      if (!part || part.kind === KIND.mist || !shown(i)) continue;
      let max = 0, n = 0, maxVis = 0;
      g.pts.forEach((p, k) => {
        const d = kit.groundY(p[0], p[2]) - p[1];
        if (d > max) max = d;
        // A point below the lid with material above it that is meant to be in the lacquer (a foundation) is not counted.
        if (g.local[k] >= -.01 && d > maxVis) maxVis = d;
        if (d > minDepth) n++;
      });
      if (max > minDepth) ground.push({posture: posture.name, id: part.id, kind: part.kind, group: part.group, max: +max.toFixed(2), maxAboveFoot: +maxVis.toFixed(2), n, of: g.pts.length});
    }
    // Part x part: points of one part inside the closed body of a mesh part of another group.
    const solids = [...geo].filter(([i]) => byIndex.get(i)?.mesh && byIndex.get(i).kind !== KIND.mist).map(([i, g]) => ({i, part: byIndex.get(i), tris: g.tris, box: bbox(g.tris)}));
    for (const [i, g] of geo) {
      const part = byIndex.get(i);
      if (!part || part.kind === KIND.mist || !shown(i) && !solids.some(s => s.i === i && mine.has(s.i))) continue;
      for (const s of solids) {
        const other = s.part;
        if (other.group === part.group || other.attach === part.group || part.attach === other.group) continue;
        if (posture.group !== null && !mine.has(i) && !mine.has(s.i)) continue;
        let max = 0, n = 0;
        for (const p of g.pts) {
          if (p[0] < s.box[0] || p[0] > s.box[3] || p[2] < s.box[2] || p[2] > s.box[5] || p[1] < s.box[1] || p[1] > s.box[4]) continue;
          const hits = [];
          for (const t of s.tris) { const y = hitY(t, p[0], p[2]); if (y !== null) hits.push(y); }
          const above = hits.filter(y => y > p[1]).sort((u, v) => u - v), below = hits.filter(y => y <= p[1]).sort((u, v) => v - u);
          if (above.length % 2 === 1) {
            const d = Math.min(above[0] - p[1], below.length ? p[1] - below[0] : Infinity);
            if (d > minDepth) n++;
            if (d > max) max = d;
          }
        }
        if (n) pairs.push({posture: posture.name, a: part.id, b: other.id, max: +max.toFixed(2), n});
      }
    }
  }
  return {ward: pose.ward, treeAtAnchor: Boolean(opts.treeAtAnchor), minDepth, ground, pairs};
}
