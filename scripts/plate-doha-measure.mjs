// How a ward's pieces (docs/plans/2026-11-16-doha.md §4.3, §6): clusters, pieces per cluster, rocks, the largest piece, the share
// of the lid the pieces and rocks take, the share left as bare nashiji (and whether it is one connected band), the share of
// silver pieces, and the longest straight run in any outline. Pure node (no canvas): polygons are filled on a 1-unit grid.
// Usage: node scripts/plate-doha-measure.mjs [W_NAKAGYO W_FUSHIMI ...]    (default: the two pilot wards)
import {PLATES, preparePlate} from '../src/studies/toji/plate/parts.js';
import {MAT} from '../src/studies/toji/plate/mat.js';
import {KIND, PLATE} from '../src/studies/toji/plate/vocab.js';

const W = PLATE.halfW * 2, H = PLATE.halfH * 2, LID = W * H;
const PIECE_MATS = new Set([MAT.bankGold, MAT.bankSilver, MAT.sandGold, MAT.sandSilver, MAT.toyamaGold, MAT.toyamaBlue]);
/** What of a bank can be seen: the crest and the wedge down to where its height is 15% (0.62 of its depth); below that it is ground. */
export const visible = f => {
  // A shore that runs in under the water is measured by its outline as written (f.drawn): the stretch under the water is not seen.
  if (!f.wedge) return f.drawn ?? f.d;
  // A far head is measured as the band its powder shows in: 0.62 of its depth below the ridge, and no lower than its dome's closing
  // line (the chord of the ridge's two ends, set down by wedge.drop), below which it has no powder at all.
  if (f.wedge.far) {
    const {ridge, depth, drop = 0} = f.wedge, a = ridge[0], b = ridge[ridge.length - 1];
    const chord = x => a[1] + (b[1] - a[1]) * (b[0] === a[0] ? 0 : (x - a[0]) / (b[0] - a[0])) + drop;
    return [...ridge.map(p => [p[0], p[1]]), ...ridge.map(p => [p[0], Math.max(p[1], Math.min(p[1] + depth * .62, chord(p[0])))]).reverse()];
  }
  const {ridge, depth, rear = 0} = f.wedge;
  return [...ridge.map(p => [p[0], p[1] - rear * Math.min(1, p[2] * 3)]), ...ridge.map(p => [p[0], p[1] + depth * (p[5] ?? 1) * .62]).reverse()];
};
const area = d => Math.abs(d.reduce((s, [x, z], i) => { const [x2, z2] = d[(i + 1) % d.length]; return s + x * z2 - x2 * z; }, 0)) / 2;

/** Fills a polygon into a Uint8Array grid (1 unit per cell) by scanlines at cell centres. */
function fill(grid, d, value = 1) {
  let z0 = Infinity, z1 = -Infinity;
  for (const [, z] of d) { z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  for (let j = Math.max(0, Math.floor(z0 + PLATE.halfH)); j <= Math.min(H - 1, Math.ceil(z1 + PLATE.halfH)); j++) {
    const z = j - PLATE.halfH + .5, xs = [];
    for (let i = 0; i < d.length; i++) {
      const [ax, az] = d[i], [bx, bz] = d[(i + 1) % d.length];
      if ((az <= z && bz > z) || (bz <= z && az > z)) xs.push(ax + (z - az) / (bz - az) * (bx - ax));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let i = Math.max(0, Math.round(xs[k] + PLATE.halfW)); i < Math.min(W, Math.round(xs[k + 1] + PLATE.halfW)); i++) grid[j * W + i] = value;
  }
}

/** The longest run of a closed or open polyline that stays straight (every turn under `tol` degrees), in plate units. */
export function longestStraight(d, closed = true, tol = 4) {
  const n = d.length, seg = [];
  for (let i = 0; i < (closed ? n : n - 1); i++) { const a = d[i], b = d[(i + 1) % n]; seg.push({len: Math.hypot(b[0] - a[0], b[1] - a[1]), ang: Math.atan2(b[1] - a[1], b[0] - a[0])}); }
  let best = 0;
  for (let s = 0; s < seg.length; s++) {
    let len = seg[s].len;
    for (let k = s + 1; k < seg.length + (closed ? seg.length : 0) && k - s < seg.length; k++) {
      const t = seg[k % seg.length];
      let da = Math.abs(t.ang - seg[s].ang) % (2 * Math.PI); if (da > Math.PI) da = 2 * Math.PI - da;
      if (da * 180 / Math.PI > tol) break;
      len += t.len;
    }
    best = Math.max(best, len);
  }
  return best;
}

export function measureDoha(ward) {
  const {parts, errors} = preparePlate(PLATES[ward]());
  if (errors.length) throw new Error(errors.join('; '));
  const pieces = [], rocks = [];
  for (const p of parts) {
    if (PIECE_MATS.has(p.mat)) for (const f of p.fills) pieces.push({cluster: p.group, silver: p.mat === MAT.bankSilver || p.mat === MAT.sandSilver, area: area(visible(f)), d: visible(f), outline: f.d, ridge: f.wedge?.ridge, hasKiri: Boolean(f.kiri), far: Boolean(f.wedge?.far)});
    else if (p.kind === KIND.rock && p.mesh && /^rock-/.test(p.id)) rocks.push({id: p.id, area: p.fills.reduce((s, f) => s + area(f.d), 0), d: p.fills[0].d, centre: p.centre});
  }
  const clusters = [...new Set(pieces.map(p => p.cluster))];
  const taken = new Uint8Array(W * H), blankGrid = new Uint8Array(W * H);
  for (const q of pieces) fill(taken, q.d);
  for (const p of parts) if (p.kind === KIND.rock && p.mesh && /^rock-/.test(p.id)) for (const f of p.fills) fill(taken, f.d);
  // Everything else on the lid (halls, trees by their bounds, mist, water, inlay): not bare nashiji either.
  for (const p of parts) {
    if (PIECE_MATS.has(p.mat)) continue;
    if (p.fills.length) for (const f of p.fills) fill(blankGrid, f.d);
    else { const [x0, z0, x1, z1] = p.bounds; fill(blankGrid, [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]); }
  }
  let takenCells = 0, bare = 0;
  for (let i = 0; i < W * H; i++) { if (taken[i]) takenCells++; if (!taken[i] && !blankGrid[i]) bare++; }
  // Connectivity of the bare ground at 4-unit cells: the share held by its largest connected region.
  const S = 4, gw = W / S, gh = H / S, free = new Uint8Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    let n = 0; for (let b = 0; b < S; b++) for (let a = 0; a < S; a++) { const k = (j * S + b) * W + i * S + a; if (!taken[k] && !blankGrid[k]) n++; }
    free[j * gw + i] = n > S * S / 2 ? 1 : 0;
  }
  const seen = new Uint8Array(gw * gh); let biggest = 0, total = 0;
  for (let s0 = 0; s0 < free.length; s0++) {
    if (!free[s0]) continue;
    total++;
    if (seen[s0]) continue;
    const stack = [s0]; seen[s0] = 1; let n = 0;
    while (stack.length) {
      const c = stack.pop(); n++;
      const x = c % gw, z = (c - x) / gw;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, nz = z + dz; if (nx < 0 || nz < 0 || nx >= gw || nz >= gh) continue; const k = nz * gw + nx; if (free[k] && !seen[k]) { seen[k] = 1; stack.push(k); } }
    }
    biggest = Math.max(biggest, n);
  }
  const straightPieces = Math.max(0, ...pieces.map(q => q.far ? 0 : q.ridge ? longestStraight(q.ridge, false) : longestStraight(q.d)));
  const straight = Math.max(straightPieces, ...parts.filter(p => p.kind === KIND.rock && /^rock-/.test(p.id)).flatMap(p => p.fills.map(f => longestStraight(f.d))));
  return {
    ward, clusters: clusters.length,
    piecesPerCluster: Object.fromEntries(clusters.map(c => [c, pieces.filter(q => q.cluster === c).length])),
    pieces: pieces.length, rocks: rocks.length,
    // A rock belongs to the cluster whose outline its centre is nearest to.
    rocksPerCluster: Object.fromEntries(clusters.map(c => [c, rocks.filter(r => {
      const near = cl => Math.min(...pieces.filter(q => q.cluster === cl).flatMap(q => q.d.map(v => Math.hypot(v[0] - r.centre[0], v[1] - r.centre[1]))));
      return clusters.every(o => near(c) <= near(o));
    }).length])),
    largestPiece: +(Math.max(...pieces.map(q => q.area)) / LID * 100).toFixed(2),
    piecesAndRocksShare: +(takenCells / LID * 100).toFixed(1),
    bareShare: +(bare / LID * 100).toFixed(1),
    bareConnectedShare: +(biggest / Math.max(total, 1) * 100).toFixed(1),
    // Far mountains (toyama) are gold or blue-gold, never silver (docs/plans/2026-11-16-doha.md §10.7): the silver share is over the rest.
    silverPieces: +(pieces.filter(q => q.silver).length / Math.max(1, pieces.filter(q => !q.far).length) * 100).toFixed(1),
    farHeads: pieces.filter(q => q.far).length,
    // A far mountain's ridge is one smooth arc through few points, never ruled: it is not a straight run.
    longestStraight: +straight.toFixed(1),
    // The same over the pieces alone (the rocks are the old crags, kept as they were in the nine-wards run).
    longestStraightPieces: +straightPieces.toFixed(1),
    kiriPieces: pieces.filter(q => q.hasKiri).length,
  };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  for (const ward of process.argv.length > 2 ? process.argv.slice(2) : ['W_NAKAGYO', 'W_FUSHIMI']) console.log(JSON.stringify(measureDoha(ward), null, 1));
}
