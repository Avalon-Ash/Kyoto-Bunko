// Rasterises a plate's parts with Canvas 2D. The GPU side (blur, upload) lives in three-renderer.js.
// Channels of a painted layer:  R soft swell (blurred later)  G crisp relief  B line work  A coverage.
import {PLATE, KIND} from './vocab.js';
import {WEDGE_PROFILE, fadeHeight} from './doha.js';
import {lookOf, FINE} from './mat.js';

/** What a part's fine.g holds, and so how its fills are painted: its material's `fine` column (mat.js MAT_LOOK). */
const fineOf = p => lookOf(p.mat).fine;

const trace = (ctx, d, close) => {
  ctx.beginPath();
  ctx.moveTo(d[0][0], d[0][1]);
  for (let i = 1; i < d.length; i++) ctx.lineTo(d[i][0], d[i][1]);
  if (close) ctx.closePath();
};
const toUnits = (ctx, w, h) => ctx.setTransform(w / (PLATE.halfW * 2), 0, 0, h / (PLATE.halfH * 2), w / 2, h / 2);

/**
 * A bank's wedge (doha.js): its height falls from 1 at the ridge to 0 at `depth` straight down the plate (toward the viewer),
 * painted as linear-gradient strips one beside the next, kept by 'lighten' (the highest wins) and clipped to the bank's outline.
 * Straight down, not along the ridge's normal: strips that share their vertical edges leave no gap on a bend and no crease
 * where offsets would meet, so a rounded head stays one smooth body. Its sides slope because the crest's strength (env) falls
 * toward both ends. The G channel carries the height itself (the shader's relief and the colour's fade); R carries it times
 * f.wedge.amp (the soft swell the geometry is raised by).
 */
function paintWedge(ctx, f) {
  const {depth, amp, rear = 0, profile = WEDGE_PROFILE} = f.wedge, ridge = f.wedge.ridge;
  const stops = (g, k) => { for (const [t, h] of profile) g.addColorStop(t, 'rgb(' + Math.round(255 * Math.min(1, amp * h * k)) + ',' + Math.round(255 * h * k) + ',0)'); };
  ctx.save();
  trace(ctx, f.d, true); ctx.clip();
  ctx.globalCompositeOperation = 'lighten';
  const SUB = 3; // strips per ridge segment (a far mountain's head is paintFar's, not this)
  for (let i = 0; i < ridge.length - 1; i++) {
    const [ax, az, ae, , , ad = 1] = ridge[i], [bx, bz, be, , , bd = 1] = ridge[i + 1];
    if (Math.max(ae, be) < .015) continue;
    for (let s = 0; s < SUB; s++) {
      const t0 = s / SUB, t1 = (s + 1) / SUB, x0 = ax + (bx - ax) * t0, x1 = ax + (bx - ax) * t1, z0 = az + (bz - az) * t0, z1 = az + (bz - az) * t1;
      const k = ae + (be - ae) * (t0 + t1) / 2, d0 = depth * (ad + (bd - ad) * t0), d1 = depth * (ad + (bd - ad) * t1);
      if (k < .01) continue;
      const zt = (z0 + z1) / 2, dm = (d0 + d1) / 2, xm = (x0 + x1) / 2;
      const g = ctx.createLinearGradient(xm, zt, xm, zt + dm);
      stops(g, k); ctx.fillStyle = g;
      // A hair wider than the strip, so that antialiasing leaves no seam between neighbours.
      ctx.beginPath(); ctx.moveTo(x0 - .3, z0); ctx.lineTo(x1 + .3, z1); ctx.lineTo(x1 + .3, z1 + d1); ctx.lineTo(x0 - .3, z0 + d0); ctx.closePath(); ctx.fill();
      if (rear > 0) {
        // The back of a rounded crest: up from the ridge the height eases down to nothing over `rear` units.
        const rr = rear * Math.min(1, ((ae + be) / 2) * 3), gr = ctx.createLinearGradient(xm, zt - rr, xm, zt);
        for (const [u, h] of [[0, 0], [.3, .08], [.62, .42], [1, 1]]) gr.addColorStop(u, 'rgb(' + Math.round(255 * Math.min(1, amp * h * k)) + ',' + Math.round(255 * h * k) + ',0)');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.moveTo(x0 - .3, z0 - rr); ctx.lineTo(x1 + .3, z1 - rr); ctx.lineTo(x1 + .3, z1 + .5); ctx.lineTo(x0 - .3, z0 + .5); ctx.closePath(); ctx.fill();
      }
    }
  }
  ctx.restore();
}

/** A profile's height at t (0..1), between its stops. */
const profileAt = (profile, t) => {
  for (let i = 1; i < profile.length; i++) if (t <= profile[i][0]) { const [t0, h0] = profile[i - 1], [t1, h1] = profile[i]; return h0 + (h1 - h0) * (t - t0) / Math.max(t1 - t0, 1e-6); }
  return profile[profile.length - 1][1];
};
// Where a far head's ridge is stroked for its powder, as shares of its depth: close together by the ridge (its hard edge), wider apart below.
const FAR_STEPS = [.012, .025, .045, .07, .1, .135, .175, .22, .27, .32, .38, .44, .5, .57, .64, .71, .78, .85, .92, 1];
const grey = v => 'rgb(' + v + ',' + v + ',' + v + ')';

/**
 * A far mountain's head (doha.js mountain; niku-ai togidashi). Its dome is cleared first, so it hides whatever head lies behind it.
 * Then G is how thick its powder lies: 1 on the ridge and thinning with the distance from it, measured from the arc itself (so the
 * powder follows the ridge down both flanks) by stroking the ridge again and again, each time narrower and higher. Last it is
 * thinned to nothing toward the foot (the chord between the ridge's two ends) and toward either end, so the dome has no lower
 * edge and no side: the ridge itself fades out as it comes down to the ground.
 */
function paintFar(ctx, f) {
  const {ridge, depth, profile, drop} = f.wedge, a = ridge[0], b = ridge[ridge.length - 1];
  ctx.save();
  trace(ctx, f.d, true); ctx.clip();
  ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#000'; ctx.fill();
  // Each stroke is narrower and higher than the one before and the dome was cleared to black, so 'lighten' would only ever keep the newer one: plain source-over, the cheaper blend.
  ctx.globalCompositeOperation = 'source-over';
  for (let i = FAR_STEPS.length - 1; i >= 0; i--) {
    const h = profileAt(profile, FAR_STEPS[i]);
    if (h < .004) continue;
    ctx.strokeStyle = 'rgb(0,' + Math.round(255 * h) + ',0)'; ctx.lineWidth = 2 * depth * FAR_STEPS[i];
    ctx.beginPath();
    ridge.forEach(([x, z], k) => { if (k % 2 && k < ridge.length - 1) return; if (k) ctx.lineTo(x, z); else ctx.moveTo(x, z); });
    ctx.stroke();
  }
  // Toward the foot: nothing at the dome's closing line, whole at `rise` above it (measured square to the chord).
  const cx = b[0] - a[0], cz = b[1] - a[1], cl = Math.hypot(cx, cz) || 1;
  let nx = cz / cl, nz = -cx / cl; if (nz > 0) { nx = -nx; nz = -nz; }
  // (A low head would lose most of itself to that, so the fade takes no more than the lower half of the dome.)
  const arch = Math.max(...ridge.map(p => (p[0] - a[0]) * nx + (p[1] - a[1]) * nz)) + drop;
  const rise = Math.min(depth * .55, arch * .5), fx = a[0], fz = a[1] + drop;
  const x0 = Math.min(...f.d.map(p => p[0])) - 2, x1 = Math.max(...f.d.map(p => p[0])) + 2, z0 = Math.min(...f.d.map(p => p[1])) - 2, z1 = Math.max(...f.d.map(p => p[1])) + 2;
  ctx.globalCompositeOperation = 'multiply';
  const foot = ctx.createLinearGradient(fx, fz, fx + nx * rise, fz + nz * rise);
  for (const [t, v] of [[0, 0], [.2, 26], [.5, 128], [.8, 230], [1, 255]]) foot.addColorStop(t, grey(v));
  ctx.fillStyle = foot; ctx.fillRect(x0, z0, x1 - x0, z1 - z0);
  // Toward either end: nothing at the ridge's two ends, whole a seventh of the way in.
  const ends = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
  for (const [t, v] of [[0, 0], [.05, 40], [.14, 255], [.86, 255], [.95, 40], [1, 0]]) ends.addColorStop(t, grey(v));
  ctx.fillStyle = ends; ctx.fillRect(x0, z0, x1 - x0, z1 - z0);
  ctx.restore();
}

/**
 * A string of cut gold squares laid along a path (the suhama's edge, a bank's ridge): into the B channel at full strength,
 * where a rim line (amp .5) never reaches. Every so often one is left out, as a string is laid by hand.
 */
function paintKiriString(ctx, strings) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighten'; ctx.fillStyle = 'rgb(0,0,255)';
  for (const {path, pitch, half} of strings) {
    let at = 0, k = 0, carried = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const [ax, az] = path[i], [bx, bz] = path[i + 1], len = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bz - az, bx - ax);
      for (; at <= carried + len; at += pitch, k++) {
        if ((k * 7 + 3) % 11 === 0) continue;
        const t = (at - carried) / len;
        ctx.save(); ctx.translate(ax + (bx - ax) * t, az + (bz - az) * t); ctx.rotate(ang);
        ctx.fillRect(-half, -half, half * 2, half * 2); ctx.restore();
      }
      carried += len;
    }
  }
  ctx.restore();
}

/**
 * A suhama tongue's powder (doha.js tongueFade): G is how thick it lies, 1 along the drawn edge and thinning to 0 over `run`
 * units away from it. The drawn edge is stroked again and again, each time narrower and higher, kept by 'lighten' and clipped
 * to the tongue's outline, so the fade follows the edge round its bends. R carries the same times f.soft (a breath of swell).
 */
function paintTongue(ctx, f) {
  const {coarse: runs, run} = f.fade, N = 22;
  ctx.save();
  trace(ctx, f.d, true); ctx.clip();
  ctx.globalCompositeOperation = 'lighten';
  let last = '';
  for (let i = N; i >= 1; i--) {
    const h = fadeHeight((i - .5) / N);
    if (h < .004) continue;
    const colour = 'rgb(' + Math.round(255 * f.soft * h) + ',' + Math.round(255 * f.crisp * h) + ',0)';
    // Where the powder lies at full height the narrower strokes are the same colour inside the widest of them: skipped.
    if (colour === last) continue;
    last = colour;
    ctx.strokeStyle = colour; ctx.lineWidth = 2 * run * i / N;
    for (const r of runs) { trace(ctx, r, false); ctx.stroke(); }
  }
  ctx.restore();
}

/** Paint one layer of the plate into ctx (w × h pixels). Layer 0 is opaque: it is the ground itself. */
export function paintLayer(ctx, w, h, parts, layer) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, w, h);
  if (layer === 0) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); }
  toUnits(ctx, w, h);
  ctx.lineCap = ctx.lineJoin = 'round';
  // Far mountains are painted together, far to near, whichever part (gold or blue-gold) each head belongs to: a nearer head hides the one behind.
  const fars = layer === 0 ? parts.filter(p => p.layer === 0 && !p.limbs && !p.mesh && fineOf(p) === FINE.ridge).flatMap(p => p.fills) : [];
  const clusters = [...new Set(fars.map(f => f.wedge.cluster))];
  fars.sort((a, b) => clusters.indexOf(a.wedge.cluster) - clusters.indexOf(b.wedge.cluster) || a.wedge.seq - b.wedge.seq);
  let farDone = false;
  for (const p of parts) {
    if (p.layer !== layer || p.limbs || p.mesh) continue;
    ctx.globalCompositeOperation = 'source-over';
    const fine = layer === 0 ? fineOf(p) : FINE.mask; // the shaped powders are the ground's own (layer 0)
    // Fading tongues: clear what lies under the whole cluster first, then lay each one's powder; where two overlap the thicker shows.
    if (fine === FINE.powder && p.fills.some(f => f.fade)) { ctx.fillStyle = '#000'; for (const f of p.fills) if (f.fade) { trace(ctx, f.d, true); ctx.fill(); } }
    for (const f of p.fills) {
      if (fine === FINE.ridge) { if (!farDone) { for (const g of fars) paintFar(ctx, g); farDone = true; ctx.globalCompositeOperation = 'source-over'; } continue; }
      if (fine === FINE.wedge) { paintWedge(ctx, f); if (f.kiri) paintKiriString(ctx, f.kiri); continue; }
      if (fine === FINE.powder && f.fade) { paintTongue(ctx, f); ctx.globalCompositeOperation = 'source-over'; if (f.kiri) paintKiriString(ctx, f.kiri); continue; }
      // A standing part is a pillow: its whole silhouette feeds the blurred channel, which becomes its dome.
      ctx.fillStyle = `rgb(${layer > 0 ? 255 : Math.round(f.soft * 255)},${Math.round(f.crisp * 255)},0)`;
      trace(ctx, f.d, true); ctx.fill();
      if (f.kiri && layer === 0) paintKiriString(ctx, f.kiri);
    }
    // Lines add to the blue channel only, so they sit on whatever relief is already there.
    ctx.globalCompositeOperation = 'lighter';
    for (const l of p.lines) {
      ctx.strokeStyle = `rgb(0,0,${Math.round(l.amp * 255)})`; ctx.lineWidth = l.w;
      trace(ctx, l.d, false); ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * The soft swell's field (the same numbers as three-pack.js bakeSoftLayer, which stays as the reference the tests hold this to):
 * the red channel of layer 0 averaged down to a quarter of its size, then a 15-tap Gaussian blur along each axis. Same sums in the
 * same order, so the result is bit for bit the reference's; it is faster because the interior needs no clamping and the second
 * pass runs along rows instead of down columns.
 */
export function bakeSoftField(rgba, w, h) {
  const sw = Math.round(w / 4), sh = Math.round(h / 4);
  const src = new Float32Array(sw * sh), tmp = new Float32Array(sw * sh), dst = new Float32Array(sw * sh);
  const xs = new Int32Array(sw + 1), ys = new Int32Array(sh + 1);
  for (let i = 0; i <= sw; i++) xs[i] = Math.floor(i * w / sw);
  for (let i = 0; i <= sh; i++) ys[i] = Math.floor(i * h / sh);
  for (let sy = 0; sy < sh; sy++) {
    const y0 = ys[sy], y1 = Math.min(h, ys[sy + 1]);
    for (let sx = 0; sx < sw; sx++) {
      const x0 = xs[sx], x1 = Math.min(w, xs[sx + 1]);
      let sum = 0;
      for (let y = y0; y < y1; y++) for (let k = (y * w + x0) * 4, e = (y * w + x1) * 4; k < e; k += 4) sum += rgba[k];
      const count = x1 > x0 && y1 > y0 ? (x1 - x0) * (y1 - y0) : 0;
      src[sy * sw + sx] = count ? sum / (count * 255) : 0;
    }
  }
  const weights = new Float32Array(15);
  let norm = 0;
  for (let i = -7; i <= 7; i++) { const wt = Math.exp(-(i * i) / 14); weights[i + 7] = wt; norm += wt; }
  for (let i = 0; i < 15; i++) weights[i] /= norm;
  for (let y = 0; y < sh; y++) {
    const row = y * sw;
    for (let x = 0; x < sw; x++) {
      let sum = 0;
      if (x >= 7 && x < sw - 7) for (let i = 0; i < 15; i++) sum += weights[i] * src[row + x - 7 + i];
      else for (let i = -7; i <= 7; i++) sum += weights[i + 7] * src[row + Math.max(0, Math.min(sw - 1, x + i))];
      tmp[row + x] = sum;
    }
  }
  const acc = new Float64Array(sw);
  for (let y = 0; y < sh; y++) {
    acc.fill(0);
    for (let i = -7; i <= 7; i++) {
      const wt = weights[i + 7], r = Math.max(0, Math.min(sh - 1, y + i)) * sw;
      for (let x = 0; x < sw; x++) acc[x] += wt * tmp[r + x];
    }
    for (let x = 0; x < sw; x++) dst[y * sw + x] = acc[x];
  }
  return {data: dst, sw, sh};
}

const ALPHA_SHIFT = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1 ? 24 : 0; // where a texel's alpha byte sits in a 32-bit read

/**
 * Which part owns each texel, per layer, grown by the part's reach so a part that moves still finds itself
 * and a solid has room for the wall around its drawing.
 * Returns interleaved (index, material) bytes per layer, plus the bare index maps used for picking.
 */
export function identMaps(doc, parts, w, h, layers, groundMat) {
  const scratch = doc.createElement('canvas'); scratch.width = w; scratch.height = h;
  const ctx = scratch.getContext('2d', {willReadFrequently: true});
  const packed = Array.from({length: layers}, (_, i) => { const a = new Uint8Array(w * h * 2); if (i === 0) for (let k = 1; k < a.length; k += 2) a[k] = groundMat; return a; });
  const maps = Array.from({length: layers}, () => new Uint8Array(w * h));
  if (!ctx) return {packed, maps};
  const sx = w / (PLATE.halfW * 2), sz = h / (PLATE.halfH * 2);
  ctx.fillStyle = ctx.strokeStyle = '#fff'; ctx.lineCap = ctx.lineJoin = 'round';
  // Two passes: first every part with its margin, then every part's drawing alone, so a margin never eats into
  // a neighbour's own shape however wide it is.
  for (const exact of [false, true]) for (const p of parts) {
    const reach = exact ? 0 : p.reach;
    if (exact && !p.reach) continue;
    const pad = reach + 2;
    const x0 = Math.max(0, Math.floor((p.bounds[0] - pad + PLATE.halfW) * sx)), z0 = Math.max(0, Math.floor((p.bounds[1] - pad + PLATE.halfH) * sz));
    const x1 = Math.min(w, Math.ceil((p.bounds[2] + pad + PLATE.halfW) * sx)), z1 = Math.min(h, Math.ceil((p.bounds[3] + pad + PLATE.halfH) * sz));
    if (x1 <= x0 || z1 <= z0) continue;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(x0, z0, x1 - x0, z1 - z0); toUnits(ctx, w, h);
    for (const f of p.fills) {
      trace(ctx, f.d, true); ctx.fill(); if (reach > 0) { ctx.lineWidth = reach * 2; ctx.stroke(); }
      // A far head belongs to the nearer head of the other metal wherever that one lies over it.
      if (f.hiddenBy?.length) { ctx.globalCompositeOperation = 'destination-out'; for (const d of f.hiddenBy) { trace(ctx, d, true); ctx.fill(); } ctx.globalCompositeOperation = 'source-over'; }
    }
    for (const l of p.lines) { ctx.lineWidth = l.w + reach * 2; trace(ctx, l.d, false); ctx.stroke(); }
    // One 32-bit read per texel instead of four byte reads: the alpha is the top byte on a little-endian machine.
    const data = new Uint32Array(ctx.getImageData(x0, z0, x1 - x0, z1 - z0).data.buffer), map = maps[p.layer], pack = packed[p.layer], bw = x1 - x0;
    for (let z = z0, o = 0; z < z1; z++, o += bw) for (let x = 0, i = z * w + x0; x < bw; x++, i++) {
      if (((data[o + x] >>> ALPHA_SHIFT) & 255) < 128) continue;
      map[i] = p.index; pack[i * 2] = p.index; pack[i * 2 + 1] = p.mat;
    }
  }
  return {packed, maps};
}

/**
 * How strongly each kind of part gathers dense nashiji around it (the Hatsune lids are thick near the mist, banks,
 * rocks, buildings and water's edge, and thin in the open). Birds ride a pine and add nothing of their own.
 */
const DENSITY_WEIGHT = {[KIND.still]: .3, [KIND.tier]: 1, [KIND.pine]: .6, [KIND.rock]: 1, [KIND.hill]: .9, [KIND.water]: .8, [KIND.mist]: 1, [KIND.bird]: 0};

/**
 * One-channel density field of the powder (0..1): 1 on a part, falling away to 0 at `falloff` plate units from the
 * heaviest one, then softened, so the ground goes from dense to sparse without an edge (maki-bokashi).
 * Rasterised at w × h (small: it only needs to be smooth). Returns a Uint8Array of w × h.
 */
export function bakeDensityField(doc, parts, w, h, falloff) {
  const scratch = doc.createElement('canvas'); scratch.width = w; scratch.height = h;
  const ctx = scratch.getContext('2d', {willReadFrequently: true});
  if (!ctx) return new Uint8Array(w * h);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
  toUnits(ctx, w, h);
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'lighten'; // the strongest part wins where footprints overlap
  for (const p of parts) {
    const weight = DENSITY_WEIGHT[p.kind] ?? .3;
    if (weight <= 0) continue;
    const g = Math.round(weight * 255), grey = `rgb(${g},${g},${g})`;
    ctx.fillStyle = ctx.strokeStyle = grey;
    if (!p.fills.length && !p.lines.length) {
      // A tree is limbs and stamps, not polygons: its bounds stand in for it.
      const [x0, z0, x1, z1] = p.bounds;
      ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, (z0 + z1) / 2, Math.max((x1 - x0) / 2, 1), Math.max((z1 - z0) / 2, 1), 0, 0, 6.2832); ctx.fill();
      continue;
    }
    const fine = fineOf(p);
    for (const f of p.fills) {
      if (fine === FINE.wedge || fine === FINE.ridge) {
        // A bank or a far mountain gathers the sprinkle under its powder (a band below the ridge), not over its whole outline.
        ctx.save(); trace(ctx, f.d, true); ctx.clip(); ctx.lineWidth = f.wedge.depth * .7;
        ctx.beginPath(); f.wedge.ridge.forEach(([x, z], i) => i ? ctx.lineTo(x, z + f.wedge.depth * .3) : ctx.moveTo(x, z + f.wedge.depth * .3)); ctx.stroke();
        ctx.restore();
      } else if (fine === FINE.powder && f.fade) {
        // A fading tongue gathers the ground's sprinkle where its own powder lies (along its drawn edge), not over its whole outline.
        ctx.save(); trace(ctx, f.d, true); ctx.clip(); ctx.lineWidth = f.fade.run * 1.1;
        for (const r of f.fade.runs) { trace(ctx, r, false); ctx.stroke(); }
        ctx.restore();
      } else { trace(ctx, f.d, true); ctx.fill(); }
    }
    for (const l of p.lines) { ctx.lineWidth = l.w + (p.reach ?? 0) * 2; trace(ctx, l.d, false); ctx.stroke(); }
  }
  const rgba = ctx.getImageData(0, 0, w, h).data, mask = new Float32Array(w * h);
  for (let i = 0; i < mask.length; i++) mask[i] = rgba[i * 4] / 255;
  return densityFromMask(mask, w, h, falloff);
}

/**
 * Where raised things meet the lid (0..1): 1 along the foot, falling in a straight line to 0 at `falloff` plate units.
 * A part that stands up touches the lid only along its foot line, as wide as whatever of it reaches down there; a
 * mound (a rock) touches it all round its outline. Flat inlays, in-ground banks, water, mist and birds touch nothing:
 * the shader finds the banks' own edges in the relief. Dirt and the dark line of bare lacquer gather here with age.
 */
export function bakeContactField(doc, parts, w, h, falloff) {
  const scratch = doc.createElement('canvas'); scratch.width = w; scratch.height = h;
  const ctx = scratch.getContext('2d', {willReadFrequently: true});
  if (!ctx) return new Uint8Array(w * h);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
  toUnits(ctx, w, h);
  ctx.fillStyle = ctx.strokeStyle = '#fff'; ctx.lineCap = 'round'; ctx.lineWidth = 1.6;
  for (const p of parts) {
    if (p.hinge > 0 && p.kind !== KIND.bird && !p.attach) {
      // The span of everything that comes within two units of the foot line.
      let x0 = Infinity, x1 = -Infinity;
      for (const f of p.fills) for (const [x, z] of f.d) if (z > p.foot - 2) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
      if (x0 > x1) continue;
      ctx.beginPath(); ctx.moveTo(x0, p.foot); ctx.lineTo(x1, p.foot); ctx.stroke();
    } else if (p.kind === KIND.rock) {
      for (const f of p.fills) { trace(ctx, f.d, true); ctx.fill(); }
    } else if (p.kind === KIND.hill) {
      // Doha pieces: where one lies over another it shades the one under it. A tongue's whole edge; a bank's ridge, laid a little
      // back up the slope behind it (so it is the head behind that darkens, not the crest). Half strength: a crease, not a hole.
      ctx.save(); ctx.strokeStyle = 'rgb(150,150,150)'; ctx.lineWidth = 3.4; ctx.globalCompositeOperation = 'lighten';
      const fine = fineOf(p), far = fine === FINE.ridge;
      for (const f of p.fills) {
        // A mountain head's step: the head behind it lies in the step's shadow, so that near and far read without a drawn edge.
        ctx.strokeStyle = far ? 'rgb(235,235,235)' : 'rgb(150,150,150)'; ctx.lineWidth = far ? 6.5 : 3.4;
        // A suhama tongue is ground flush with the lid (togidashi): it has no step, so it shades nothing.
        if (fine === FINE.powder) continue;
        if (fine === FINE.wedge || far) {
          ctx.beginPath(); let pen = false;
          for (const [x, z, e] of f.wedge.ridge) {
            if (e < .3) { pen = false; continue; }
            const X = x, Z = z - (far ? 3.6 : 2.6);
            if (pen) ctx.lineTo(X, Z); else ctx.moveTo(X, Z);
            pen = true;
          }
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
  const rgba = ctx.getImageData(0, 0, w, h).data, mask = new Float32Array(w * h);
  for (let i = 0; i < mask.length; i++) mask[i] = rgba[i * 4] / 255;
  return densityFromMask(mask, w, h, falloff, false);
}

/** The canvas-free half of bakeDensityField: spreads weights (0..1 per texel) into the 0..255 field. Pure, so node can test it. */
export function densityFromMask(mask, w, h, falloff, soften = true) {
  const out = new Uint8Array(w * h), v = Float32Array.from(mask);
  // Grey-scale dilation with a linear fall per unit of distance: two chamfer sweeps (8 neighbours).
  const unit = PLATE.halfW * 2 / w, side = unit / falloff, diag = side * 1.4142;
  const relax = (i, j, cost) => { const c = v[j] - cost; if (c > v[i]) v[i] = c; };
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
    const i = z * w + x;
    if (x > 0) relax(i, i - 1, side);
    if (z > 0) { relax(i, i - w, side); if (x > 0) relax(i, i - w - 1, diag); if (x < w - 1) relax(i, i - w + 1, diag); }
  }
  for (let z = h - 1; z >= 0; z--) for (let x = w - 1; x >= 0; x--) {
    const i = z * w + x;
    if (x < w - 1) relax(i, i + 1, side);
    if (z < h - 1) { relax(i, i + w, side); if (x < w - 1) relax(i, i + w + 1, diag); if (x > 0) relax(i, i + w - 1, diag); }
  }
  if (!soften) { for (let i = 0; i < v.length; i++) out[i] = Math.round(Math.min(1, Math.max(0, v[i])) * 255); return out; }
  for (let i = 0; i < v.length; i++) { const t = Math.min(1, Math.max(0, v[i])); v[i] = t * t * (3 - 2 * t); }
  // Three box passes per axis stand in for a gaussian, so the cone's tip and foot lose their creases.
  const tmp = new Float32Array(w * h), R = 3;
  const blur = (src, dst, n, stride, lines, lineStride) => {
    for (let l = 0; l < lines; l++) {
      let acc = 0; const base = l * lineStride;
      for (let k = -R; k <= R; k++) acc += src[base + Math.min(n - 1, Math.max(0, k)) * stride];
      for (let k = 0; k < n; k++) {
        dst[base + k * stride] = acc / (2 * R + 1);
        acc += src[base + Math.min(n - 1, k + R + 1) * stride] - src[base + Math.max(0, k - R) * stride];
      }
    }
  };
  for (let pass = 0; pass < 3; pass++) { blur(v, tmp, w, 1, h, w); blur(tmp, v, h, w, w, 1); }
  for (let i = 0; i < v.length; i++) out[i] = Math.round(Math.min(1, Math.max(0, v[i])) * 255);
  return out;
}
