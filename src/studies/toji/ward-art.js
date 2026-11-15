// What makes each ward's backdrop its own: a ground pattern woven into the paper and one line of verse.
// Pure data and geometry; backdrop.js bakes the pattern, study.js writes the verse.
// The pairings are design associations with each cabinet's relief (landmarks.js), not historical claims.

const H = Math.sqrt(3);
const TAU = Math.PI * 2;
const wave = (at, steps = 16) => Array.from({length: steps + 1}, (_, i) => at(i / steps));
/** Triangles of a unit-side triangular lattice covering one 1 × √3 period (and a margin, clipped when baked). */
function triangles() {
  const out = [];
  for (let row = -1; row < 3; row++) for (let col = -2; col < 3; col++) {
    const x = col + (row % 2 ? .5 : 0), y = row * H / 2;
    out.push([[x, y], [x + 1, y], [x + .5, y + H / 2]], [[x + 1, y], [x + 1.5, y + H / 2], [x + .5, y + H / 2]]);
  }
  return out;
}
const closed = points => [...points, points[0]];
function hexagons(spokes) {
  const a = 1 / H, lines = [];
  for (const [cx, cy] of [[0, 0], [1, 0], [.5, H / 2], [0, H], [1, H]]) {
    const v = Array.from({length: 6}, (_, k) => [cx + a * Math.cos(TAU * (k / 6 + 1 / 12)), cy + a * Math.sin(TAU * (k / 6 + 1 / 12))]);
    lines.push(closed(v));
    if (spokes) for (const k of [0, 2, 4]) lines.push([[cx, cy], v[k]]);
  }
  return lines;
}

/**
 * One repeating tile per pattern, in unit coordinates: `w` × `h`, stroked polylines, filled polygons, stroked circles.
 * `cell` scales the tile against the common cell size.
 * @type {Record<string, () => {w:number, h:number, cell:number, lines?:number[][][], fills?:number[][][], circles?:number[][]}>}
 */
export const MOTIFS = {
  /** 七宝: circles that quarter one another. */
  shippo: () => ({w: 1, h: 1, cell: 1, circles: [[0, 0, .5], [1, 0, .5], [0, 1, .5], [1, 1, .5], [.5, .5, .5]]}),
  /** 亀甲: honeycomb. */
  kikko: () => ({w: 1, h: H, cell: 1.15, lines: hexagons(false)}),
  /** 毘沙門亀甲 (simplified): honeycomb with the inner Y. */
  bishamon: () => ({w: 1, h: H, cell: 1.25, lines: hexagons(true)}),
  /** 波: rows of ripples, each row half a wave out of step. */
  nami: () => ({w: 1, h: .5, cell: 1.5, lines: [
    wave(t => [t, .125 + .06 * Math.sin(TAU * t)]), wave(t => [t, .375 - .06 * Math.sin(TAU * t)]),
  ]}),
  /** 格子: the close vertical bars of a machiya front, tied by one rail. */
  koshi: () => ({w: 1, h: 1.4, cell: 1.1, lines: [[[0, .7], [1, .7]], ...[.125, .375, .625, .875].map(x => [[x, 0], [x, 1.4]])]}),
  /** 麻の葉: every lattice triangle with spokes from its centre. */
  asanoha: () => ({w: 1, h: H, cell: 1.35, lines: triangles().flatMap(t => {
    const c = [(t[0][0] + t[1][0] + t[2][0]) / 3, (t[0][1] + t[1][1] + t[2][1]) / 3];
    return [closed(t), ...t.map(v => [c, v])];
  })}),
  /** 菱: diamonds with a smaller diamond at each crossing's heart. */
  hishi: () => ({w: 1, h: .6, cell: 1.5, lines: [[[0, 0], [1, .6]], [[1, 0], [0, .6]], closed([[.5, .17], [.72, .3], [.5, .43], [.28, .3]])]}),
  /** 鱗: every other lattice triangle filled. */
  uroko: () => ({w: 1, h: H, cell: 1, fills: triangles().filter((_, i) => i % 2 === 0)}),
  /** 籠目: three sets of bamboo strips, the level ones passing between the crossings. */
  kagome: () => ({w: 1, h: H, cell: 1.2, lines: [
    [[0, H / 4], [1, H / 4]], [[0, H * 3 / 4], [1, H * 3 / 4]],
    ...[-2, -1, 0, 1, 2].flatMap(k => [[[k, 0], [k + 1, H]], [[k + 1, 0], [k, H]]]),
  ]}),
  /** 市松: checks. */
  ichimatsu: () => ({w: 1, h: 1, cell: 1.2, fills: [[[0, 0], [.5, 0], [.5, .5], [0, .5]], [[.5, .5], [1, .5], [1, 1], [.5, 1]]]}),
  /** 立涌: rising lines that swell apart and draw together. */
  tatewaku: () => ({w: 1, h: 1.6, cell: 1.3, lines: [
    wave(t => [.25 + .12 * Math.sin(TAU * t), t * 1.6]), wave(t => [.75 - .12 * Math.sin(TAU * t), t * 1.6]),
  ]}),
};

/** @type {Record<string, {motif: keyof typeof MOTIFS, verse: {zh: string, ja: string}}>} */
export const WARD_ART = {
  // Each verse names the landmark on the lid, then what else the ward is known for (the taglines in data/wards.ts).
  W_KITA: {motif: 'shippo', verse: {zh: '金閣映池，賀茂水清。', ja: '金閣うつる池、賀茂の流れ。'}},
  W_KAMIGYO: {motif: 'kikko', verse: {zh: '御所白砂，西陣機聲。', ja: '御所の白砂、西陣の機音。'}},
  W_SAKYO: {motif: 'nami', verse: {zh: '銀閣待月，哲學道櫻。', ja: '銀閣月を待ち、哲学の道。'}},
  W_NAKAGYO: {motif: 'koshi', verse: {zh: '二條城下，町家燈宵。', ja: '二条の城、町家に灯る宵。'}},
  W_HIGASHIYAMA: {motif: 'asanoha', verse: {zh: '清水舞台，坂道陶香。', ja: '清水の舞台、坂に陶の音。'}},
  W_SHIMOGYO: {motif: 'hishi', verse: {zh: '堂前銀杏，驛前市聲。', ja: '堂前の銀杏、駅前の賑わい。'}},
  W_MINAMI: {motif: 'uroko', verse: {zh: '五重塔影，弘法市晨。', ja: '五重の塔影、弘法さんの市。'}},
  W_UKYO: {motif: 'kagome', verse: {zh: '嵐山渡月，禪庭借景。', ja: '嵐山渡月橋、禅の借景。'}},
  W_NISHIKYO: {motif: 'ichimatsu', verse: {zh: '桂宮待月，苔深竹幽。', ja: '桂の月、苔と竹の奥。'}},
  W_YAMASHINA: {motif: 'bishamon', verse: {zh: '毘沙門楓，疏水櫻雲。', ja: '毘沙門の楓、疏水の桜。'}},
  W_FUSHIMI: {motif: 'tatewaku', verse: {zh: '千本鳥居，酒藏水香。', ja: '千本鳥居、酒蔵の水の香。'}},
};

/** Mist layout seed, so each ward's bands sit differently. Stable per ward. */
export function wardSeed(wardId) { return 7 + Math.max(0, Object.keys(WARD_ART).indexOf(wardId)) * 101; }
