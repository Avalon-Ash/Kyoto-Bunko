// Measures what the pieces mirror: how much shape the reflections on gold and silver have, whether they blow out or go
// black, whether the lid moved, and whether the reflections change colour with day and night (docs/plans/2026-11-28-room.md §4).
// No dependencies. It reads pictures shot by scripts/plate-shot.mjs with PLATE_MASK set, which writes beside each <name>.png
// one <name>-mask-<group>.png per group: the group's materials painted magenta (the dev hook window.__kyotoPlateMask).
//
// Usage:
//   node scripts/plate-room-stats.mjs stats <dir>                 one JSON line per picture and group, then the pooled lines
//   node scripts/plate-room-stats.mjs lid-diff <dirA> <dirB>      pixels that differ outside everything that mirrors the room
//   node scripts/plate-room-stats.mjs daynight <dir>              blue/red of the brightest silver, night over day, per ward
//   node scripts/plate-room-stats.mjs check <baseDir> <dir>       V4, V5 and V7 of the plan against a baseline; exits 1 on a miss
// Shooting: PLATE_CLOCK=60000 PLATE_MASK=gold,silver,parts,room node scripts/plate-shot.mjs <dir> <job…>
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {decodePng} from './plate-diff.mjs';
import {MAT} from '../src/studies/toji/plate/mat.js';

/**
 * The groups a mask may name. `names` are keys of MAT (checked below, so a renamed material fails here and not silently);
 * `kinds` are what the renderer tags a material with (three-renderer.js: part, limb, stamp, box, cord).
 * gold and silver are the polished and powdered metals of the pieces; parts is everything standing on the lid;
 * room is everything lit by three.js and so by the environment map (the lid itself is not: it computes its own light).
 */
export const MASK_GROUPS = {
  gold: {names: ['gold', 'hyomonGold', 'kirikane', 'roofPowder'], kinds: ['part']},
  silver: {names: ['silver', 'kirigin', 'hyomonSilver'], kinds: ['part']},
  parts: {names: null, kinds: ['part', 'limb', 'stamp']},
  room: {names: null, kinds: ['part', 'limb', 'stamp', 'box', 'cord']},
};
for (const [group, {names}] of Object.entries(MASK_GROUPS)) for (const name of names ?? []) if (!(name in MAT)) throw new Error(`plate-room-stats: ${group} names ${name}, which is not in MAT`);

/** The thresholds of the plan's §4 (starting values; the plan says when they may be changed). 8-bit luminance unless noted. */
export const LIMITS = {
  white: 250, black: 20, // a blown-out pixel, a black one
  sigmaGain: 1.15, sigmaFloor: .9, // V4: pooled sigma against the baseline's, and any one ward's
  whiteShare: 1.0, whiteRise: .5, blobShare: .25, blackRise: 1.0, // V5, percent of the mask (rises are percentage points)
  tail: .05, dayNight: 1.2, // V7: the brightest share of the silver, and night's blue/red over day's
  lidDilate: 2, erode: 1, // pixels
};

/** Rec.709 luminance of an 8-bit sRGB pixel, 0..255 (on the encoded values, as the plan's thresholds are). */
export const luminance = (r, g, b) => .2126 * r + .7152 * g + .0722 * b;
/** A masked pixel is magenta: red and blue high, green well under both. */
export const isMagenta = (r, g, b) => r > 120 && b > 120 && g < Math.min(r, b) * .5;

/** {width, height, on: Uint8Array} from a decoded mask picture. */
export function maskOf(png) {
  const {width, height, channels, data} = png, on = new Uint8Array(width * height);
  for (let i = 0; i < on.length; i++) on[i] = isMagenta(data[i * channels], data[i * channels + 1], data[i * channels + 2]) ? 1 : 0;
  return {width, height, on};
}
const morph = (mask, grow) => {
  const {width, height, on} = mask, out = new Uint8Array(on.length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let hit = grow ? 0 : 1;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy, v = nx >= 0 && ny >= 0 && nx < width && ny < height ? on[ny * width + nx] : 0;
      if (grow) hit |= v; else hit &= v;
    }
    out[y * width + x] = hit;
  }
  return {width, height, on: out};
};
const times = (mask, n, grow) => { let m = mask; for (let i = 0; i < n; i++) m = morph(m, grow); return m; };
/** Shrinks the mask by n pixels (8-neighbourhood; the picture's border counts as outside). */
export const erode = (mask, n = 1) => times(mask, n, false);
/** Grows the mask by n pixels. */
export const dilate = (mask, n = 1) => times(mask, n, true);
export const union = (a, b) => ({width: a.width, height: a.height, on: a.on.map((v, i) => v | b.on[i])});

/** The size, in pixels, of the largest 4-connected blob of set pixels. */
export function largestBlob(mask) {
  const {width, on} = mask;
  const seen = new Uint8Array(on.length), stack = [];
  let best = 0;
  for (let start = 0; start < on.length; start++) {
    if (!on[start] || seen[start]) continue;
    let size = 0; seen[start] = 1; stack.push(start);
    while (stack.length) {
      const i = stack.pop(), x = i % width; size++;
      for (const j of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width]) if (j >= 0 && j < on.length && on[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
    }
    best = Math.max(best, size);
  }
  return best;
}

/** The luminances of a picture's pixels under a mask. */
export function lumsUnder(png, mask) {
  const out = [];
  for (let i = 0; i < mask.on.length; i++) if (mask.on[i]) out.push(luminance(png.data[i * png.channels], png.data[i * png.channels + 1], png.data[i * png.channels + 2]));
  return out;
}
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
/** mean, sigma (population), and the shares (percent) of blown-out and black pixels, of a list of luminances. */
export function summary(lums) {
  if (!lums.length) return {pixels: 0, mean: 0, sigma: 0, white: 0, black: 0};
  const mean = lums.reduce((a, v) => a + v, 0) / lums.length, sigma = Math.sqrt(lums.reduce((a, v) => a + (v - mean) ** 2, 0) / lums.length);
  const share = f => lums.filter(f).length / lums.length * 100;
  return {pixels: lums.length, mean: round(mean), sigma: round(sigma), white: round(share(v => v > LIMITS.white), 3), black: round(share(v => v < LIMITS.black), 3)};
}
/** summary() of one group in one picture, plus the largest blown-out blob as a percent of the mask. */
export function groupStats(png, rawMask) {
  const mask = erode(rawMask, LIMITS.erode), lums = lumsUnder(png, mask), s = summary(lums);
  const white = {width: mask.width, height: mask.height, on: mask.on.map((v, i) => v && luminance(png.data[i * png.channels], png.data[i * png.channels + 1], png.data[i * png.channels + 2]) > LIMITS.white ? 1 : 0)};
  return {...s, blob: s.pixels ? round(largestBlob(white) / s.pixels * 100, 3) : 0, lums};
}
/** Blue over red of the mean colour of the brightest `tail` share of the masked pixels (0 when the mask is empty). */
export function tailBlueOverRed(png, rawMask, tail = LIMITS.tail) {
  const mask = erode(rawMask, LIMITS.erode), px = [];
  for (let i = 0; i < mask.on.length; i++) if (mask.on[i]) { const k = i * png.channels; px.push([luminance(png.data[k], png.data[k + 1], png.data[k + 2]), png.data[k], png.data[k + 2]]); }
  if (!px.length) return 0;
  px.sort((a, b) => b[0] - a[0]);
  const top = px.slice(0, Math.max(1, Math.round(px.length * tail))), red = top.reduce((a, p) => a + p[1], 0), blue = top.reduce((a, p) => a + p[2], 0);
  return red ? round(blue / red, 4) : 0;
}
/** How many pixels of two pictures differ outside a mask. */
export function differOutside(a, b, mask) {
  let differ = 0, max = 0;
  for (let i = 0; i < mask.on.length; i++) {
    if (mask.on[i]) continue;
    for (let c = 0; c < 3; c++) { const d = Math.abs(a.data[i * a.channels + c] - b.data[i * b.channels + c]); if (d) { max = Math.max(max, d); } }
    if (a.data[i * a.channels] !== b.data[i * b.channels] || a.data[i * a.channels + 1] !== b.data[i * b.channels + 1] || a.data[i * a.channels + 2] !== b.data[i * b.channels + 2]) differ++;
  }
  return {differ, max};
}

const png = file => decodePng(readFileSync(file));
/** The pictures of a folder that have masks: [{name, file, masks: {group: file}}]. */
export function pictures(dir) {
  const files = readdirSync(dir).filter(f => f.endsWith('.png')), out = [];
  for (const f of files.filter(f => !/-mask-\w+\.png$/.test(f) && !f.endsWith('-after.png')).sort()) {
    const name = f.slice(0, -4), masks = {};
    for (const group of Object.keys(MASK_GROUPS)) if (existsSync(join(dir, `${name}-mask-${group}.png`))) masks[group] = join(dir, `${name}-mask-${group}.png`);
    out.push({name, file: join(dir, f), masks});
  }
  return out;
}
/** Per picture and group, and pooled over the pictures whose name matches `only` (a RegExp). */
export function folderStats(dir, groups = ['gold', 'silver', 'parts'], only = /./) {
  const rows = [], pooled = Object.fromEntries(groups.map(g => [g, []]));
  for (const p of pictures(dir)) {
    if (!only.test(p.name)) continue;
    const picture = png(p.file);
    for (const group of groups) {
      if (!p.masks[group]) continue;
      const {lums, ...s} = groupStats(picture, maskOf(png(p.masks[group])));
      rows.push({name: p.name, group, ...s});
      for (const v of lums) pooled[group].push(v);
    }
  }
  return {rows, pooled: Object.fromEntries(groups.map(g => [g, summary(pooled[g])]))};
}
export function folderDayNight(dir, group = 'silver') {
  const byWard = {};
  for (const p of pictures(dir)) {
    const m = p.name.match(/^(.*)-(day|night)$/); if (!m || !p.masks[group]) continue;
    (byWard[m[1]] ??= {})[m[2]] = tailBlueOverRed(png(p.file), maskOf(png(p.masks[group])));
  }
  return Object.entries(byWard).filter(([, v]) => v.day && v.night).map(([ward, v]) => ({ward, group, day: v.day, night: v.night, ratio: round(v.night / v.day, 3)}));
}
export function folderLidDiff(dirA, dirB) {
  const rows = [];
  for (const p of pictures(dirA)) {
    const other = join(dirB, `${p.name}.png`), maskB = join(dirB, `${p.name}-mask-room.png`);
    if (!existsSync(other) || !p.masks.room || !existsSync(maskB)) { rows.push({name: p.name, missing: true, differ: 0, max: 0, masked: 0}); continue; }
    const mask = dilate(union(maskOf(png(p.masks.room)), maskOf(png(maskB))), LIMITS.lidDilate);
    rows.push({name: p.name, missing: false, ...differOutside(png(p.file), png(other), mask), masked: mask.on.reduce((a, v) => a + v, 0)});
  }
  return rows;
}
/** V4, V5 and V7 against a baseline folder: [{check, name, ok, …}]. */
export function check(baseDir, dir) {
  const out = [], day = /-day$/, base = folderStats(baseDir), now = folderStats(dir), key = r => `${r.name}/${r.group}`;
  const baseRow = Object.fromEntries(base.rows.map(r => [key(r), r]));
  const baseDay = folderStats(baseDir, ['gold', 'silver'], day), nowDay = folderStats(dir, ['gold', 'silver'], day);
  for (const g of ['gold', 'silver']) out.push({check: 'V4 pooled sigma', name: g, base: baseDay.pooled[g].sigma, now: nowDay.pooled[g].sigma, ok: nowDay.pooled[g].sigma >= baseDay.pooled[g].sigma * LIMITS.sigmaGain});
  for (const r of now.rows) {
    const b = baseRow[key(r)]; if (!b || !r.pixels) continue;
    if (r.group !== 'parts' && day.test(r.name)) out.push({check: 'V4 ward sigma', name: key(r), base: b.sigma, now: r.sigma, ok: r.sigma >= b.sigma * LIMITS.sigmaFloor});
    out.push({check: 'V5 white', name: key(r), base: b.white, now: r.white, blob: r.blob, ok: r.white <= LIMITS.whiteShare && r.white <= b.white + LIMITS.whiteRise && r.blob <= LIMITS.blobShare});
    out.push({check: 'V5 black', name: key(r), base: b.black, now: r.black, ok: r.black <= b.black + LIMITS.blackRise});
  }
  for (const r of folderDayNight(dir)) out.push({check: 'V7 day and night', name: r.ward, day: r.day, night: r.night, ratio: r.ratio, ok: r.ratio >= LIMITS.dayNight});
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [mode, a, b] = process.argv.slice(2), print = rows => { for (const r of rows) console.log(JSON.stringify(r)); };
  if (mode === 'stats' && a) { const s = folderStats(a); print(s.rows); for (const [group, v] of Object.entries(s.pooled)) console.log(JSON.stringify({pooled: group, ...v})); const d = folderStats(a, ['gold', 'silver'], /-day$/); for (const [group, v] of Object.entries(d.pooled)) console.log(JSON.stringify({pooledDay: group, ...v})); }
  else if (mode === 'lid-diff' && a && b) { const rows = folderLidDiff(a, b); print(rows); const bad = rows.filter(r => r.missing || r.differ); console.log(JSON.stringify({pictures: rows.length, failing: bad.length, differingPixels: rows.reduce((s, r) => s + r.differ, 0)})); if (bad.length) process.exitCode = 1; }
  else if (mode === 'daynight' && a) print(folderDayNight(a));
  else if (mode === 'check' && a && b) { const rows = check(a, b); print(rows.filter(r => !r.ok)); const by = {}; for (const r of rows) { (by[r.check] ??= [0, 0])[r.ok ? 0 : 1]++; } console.log(JSON.stringify({checks: Object.fromEntries(Object.entries(by).map(([k, [ok, bad]]) => [k, {ok, failing: bad}]))})); if (rows.some(r => !r.ok)) process.exitCode = 1; }
  else { console.error('usage: node scripts/plate-room-stats.mjs stats <dir> | lid-diff <dirA> <dirB> | daynight <dir> | check <baseDir> <dir>'); process.exitCode = 2; }
}
