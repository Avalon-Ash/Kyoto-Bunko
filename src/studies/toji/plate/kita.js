// A horizontal mirror: three gold storeys rise from the north bank, their broken image lies in still water.
// The island pine balances the pavilion; the entire lower-left quarter stays bare lacquer and nashiji.
// The ground (doha.js) is drawn piece by piece, every outline written here as control points:
//   Kinugasa-yama  one low, wide body of three round heads behind the pavilion, with the pavilion standing in the saddle
//                  between the two left heads so that its roofs and phoenix are read against the lacquer, not against powder.
//   the suhama     the pond's shore: thick on the north (the pavilion stands on it) and the west, a thin silver ribbon along the
//                  north waterline, a thin gold tongue from the south-east that carries the island pine.
import {MAT, blob, pond, phoenix, storey, roof, branchPine as pine, bird, suyari, grassTufts} from './vocab.js';
import {mountain, tongues} from './doha.js';
import {crags} from './crag-mesh.js';

// The outline pond() draws for 'kyoko' (same arguments): the reeds are set on its north-west bank.
const POND = [-5, 68, 244, 82, 3];
const shore = blob(...POND, .055, 80);
/**
 * A reed clump on the shore at index i, rooted a little inland, leaning out over the water.
 * @returns {[number, number, number, number, number]}
 */
function reed(i, h, n) {
  const [x, z] = shore[i];
  return [x, z - 1.2, h, n, .08];
}

// Kinugasa, far to near. Why: it is the green hill behind the Golden Pavilion; low, so it answers the pavilion instead of competing.
const KINUGASA = [
  // 1 (blue-gold, the farthest) at the far left: a full arc, its peak a little left of the middle
  {ridge: [[-340, -118], [-316, -152], [-276, -176], [-232, -182], [-190, -170], [-160, -146], [-142, -118]], depth: 70, tone: 'blue'},
  // 2 (gold) the broadest, right of the pavilion: climbs slowly and drops at the right
  {ridge: [[-60, -110], [-34, -142], [10, -168], [72, -182], [134, -176], [186, -152], [214, -122]], depth: 78},
  // 3 (gold) in front on the right: a low shoulder with its peak toward the right
  {ridge: [[120, -100], [148, -112], [182, -128], [218, -146], [252, -150], [286, -138], [324, -118], [352, -100]], depth: 66},
];
// The pond's shore, listed far to near (a later piece lies over an earlier one).
const SHORE = [
  // north: the thick gold bank the pavilion stands on; its upper edge behind the pavilion in low waves, its lower edge a little over the water
  {p: [[-326, -30], [-312, -42], [-292, -48], [-270, -44], [-250, -52], [-226, -56], [-202, -50], [-178, -57], [-150, -60], [-122, -54], [-96, -58], [-68, -56], [-40, -50], [-28, -55], [-14, -49], [0, -54], [12, -47], [26, -52], [38, -44], [64, -48], [76, -43], [88, -49], [98, -39], [112, -30], [124, -16],
    [118, -4], [96, -6], [76, -12], [50, -16], [26, -14], [4, -18], [-12, -10], [-30, -16], [-46, -9], [-62, -15], [-78, -6], [-96, -13], [-110, -9], [-132, -6], [-158, 8], [-170, 15], [-184, 11], [-196, 22], [-210, 20], [-222, 31], [-236, 28], [-250, 34], [-272, 26], [-296, 20], [-318, 6], [-328, -12]], tone: 'gold', seed: 71, kiri: [.5, .58]},
  // west: a thick crescent along the pond's west end, over the end of the north bank
  {p: [[-272, 28], [-252, 34], [-238, 48], [-226, 60], [-232, 72], [-224, 86], [-234, 98], [-244, 112], [-258, 126],
    [-282, 126], [-296, 112], [-304, 94], [-312, 76], [-316, 56], [-306, 40], [-290, 32]], tone: 'gold', seed: 72},
  // north waterline: the silver ribbon laid over the gold bank's lower edge, only a hand's breadth wide
  {p: [[-186, 10], [-160, 2], [-136, -6], [-110, -10], [-84, -12], [-58, -8], [-44, -13], [-30, -9], [-16, -13], [-4, -10], [22, -6], [52, -4], [74, 0],
    [66, 8], [44, 6], [18, 10], [-8, 6], [-34, 8], [-60, 4], [-86, 8], [-112, 3], [-140, 10], [-164, 16]], tone: 'silver', seed: 73},
  // south-east: a thin tongue from the shore out under the island pine, ending at the stone
  {p: [[150, 92], [164, 86], [182, 90], [200, 100], [218, 112], [234, 124], [244, 140], [236, 150], [220, 146], [204, 136], [188, 126], [172, 116], [158, 106]], tone: 'gold', seed: 74},
];
// Rocks (docs/plans/2026-11-16-doha.md §15.1, §18.1): the crag, the same upright sharp cluster as Fushimi and Nakagyo. A cluster is one large
// crag of three or four blocks (a ridge each: [dx, dz, height, radius]; a block listed later lies in front of the one before), one small crag
// beside it, fine grain lines, flat pebbles at the foot, and on a few of them a small group of cut-gold squares. Everything is relative to
// (x, z). on: what it stands against; why: the reason it is there.
export const ROCKS = [
  // the north bank's west end, where it turns down into the west crescent: two crowns of unequal height with a deep notch, silver at the water side
  {id: 'shore-west', x: -246, z: 18, scale: 1.1,
    crags: [
      {seed: 5, blocks: [
        {mat: 'olive', ridge: [[-13, -3, 14, 6.5], [-7, -7, 20, 6.5], [-2, -4, 13, 5]], strata: {ang: .9, period: 4.2, amp: .6, w: 1.1}},
        {mat: 'gold', ridge: [[7, -5, 16, 6], [13, -1, 11, 5.5]], strata: {ang: -.4, period: 3.8, amp: .5, w: 1}},
        {mat: 'silver', ridge: [[-14, 4, 8, 5.5], [-6, 6, 9, 5]], q: .85},
        {mat: 'olive', ridge: [[2, 4, 8, 5], [9, 5, 7, 4.5]]},
      ], grooves: [{p: [[0, -11], [1, -4], [0, 2]], w: 3, depth: 3.6}]},
      {at: [-30, 6], blocks: [{mat: 'silver', ridge: [[0, 0, 6, 4], [4, 1, 4.5, 3.2]]}]},
    ],
    lines: [[[-7, -8], [-8, -3], [-10, 2], [-12, 6]], [[-2, -6], [-1, -1], [0, 4]], [[8, -6], [10, -1], [12, 3]], [[14, -2], [15, 2]], [[-4, 5], [0, 7], [5, 7]]],
    kiri: [{at: [10, -3], cols: 2, rows: 2, turn: .25}],
    pebbles: [[-21, 10, 3, 1.8, .8, .2, 'silver'], [6, 12, 3.4, 2, .9, -.2, 'olive'], [20, 8, 2.2, 1.5, .6, .3, 'silver'], [-34, 0, 2, 1.4, .6, 0, 'olive']],
    on: 'the west end of the north bank, at the corner where it turns into the west crescent', why: 'a stone at a corner of the shore: where the bank turns, the water is held by a stone'},
  // the island: a pale silver stone, a low spine from the left with one tall thin crown at its right end, a gold step in front
  {id: 'island', x: 204, z: 134, scale: 1.1,
    crags: [
      {seed: 8, blocks: [
        {mat: 'silver', ridge: [[-16, -1, 9, 7], [-9, -4, 13, 6.5], [-2, -3, 10, 6]], q: .9},
        {mat: 'olive', ridge: [[6, -6, 15, 5], [9, -9, 21, 4.8], [12, -5, 13, 4.6]], strata: {ang: 1.35, period: 4, amp: .55, w: 1}},
        {mat: 'gold', ridge: [[-6, 4, 7, 5.5], [2, 5, 9, 5], [8, 3, 6, 4]], strata: {ang: .1, period: 3.4, amp: .45, w: 1}},
      ], grooves: [{p: [[4, -9], [3, -3], [4, 2]], w: 2.2, depth: 2.6}]},
    ],
    lines: [[[9, -9], [8, -4], [7, 1], [6, 5]], [[-9, -4], [-11, 0], [-13, 4]], [[-3, -3], [-4, 2], [-5, 6]], [[12, -5], [14, 0]], [[-1, 5], [4, 7], [9, 6]]],
    pebbles: [[-21, 7, 3.2, 1.9, .8, .1, 'silver'], [-4, 12, 2.4, 1.6, .7, -.3, 'olive'], [16, 9, 3, 1.8, .8, .2, 'silver'], [22, 1, 2, 1.4, .6, 0, 'silver']],
    on: 'the front edge of the thin gold tongue that carries the island pine, below the pine, at the lid (the tongue ends just behind it)', why: 'the island pine roots in a stone; this is the stone at the near end of its tongue'},
];

/** The clusters, for the measuring and checking scripts. */
const PIECES = {KINUGASA, SHORE};
export {PIECES};

export function kita() {
  const pavilion = [];
  for (let i = 0; i < 3; i++) {
    const eave = -45 - i * 48, w = 94 - i * 17;
    pavilion.push(...storey(`kinkaku-wall-${i}`, -85, eave + 1, eave + 26, w * .73,
      {group: 'kinkaku', order: i * 2, mat: i ? MAT.gold : MAT.lacquer, windowMat: i ? MAT.lacquer : MAT.lamp}));
    pavilion.push(...roof(`kinkaku-roof-${i}`, -85, eave, w, 27,
      {group: 'kinkaku', order: i * 2 + 1, ridgeHalf: w * .48, motionWith: `kinkaku-wall-${i}`}));
  }
  return [
    ...mountain('kinugasa', KINUGASA),
    ...tongues('suhama', SHORE, {toward: [[-150, 68], [-5, 68], [140, 68]]}),
    ...pond('kyoko', -5, 68, 244, 82, 3, {reflection: {x: -85, z: 9, width: 78, height: 90}}),
    // Reeds in bright silver sheet on the north-west bank, from the pavilion's west foot toward the shore stone. Why sheet: silver powder
    // blades tarnish to the colour of the ground and were lost; the reeds are what say the pavilion stands at a water's edge.
    ...grassTufts('kyoko-reeds', [reed(45, 30, 6), reed(47, 40, 7), reed(49, 46, 7), reed(51, 32, 6)], {on: 'kyoko', mat: MAT.hyomonSilver, seed: 5, w: 1.3, spread: .13}),
    ...suyari('mist-west', -350, -196, -98, 10, 2),
    ...suyari('mist-east', 232, 352, -84, 10, 7),
    ...crags(ROCKS),
    ...pavilion,
    ...phoenix('ho-o', -85, -168, 1.25, {group: 'kinkaku', order: 6}).map(p => ({...p, motionWith: 'kinkaku-wall-2'})),
    ...pine('island-pine', 171, 97, 124, -15, 6),
    ...pine('west-pine', -291, -28, 114, 12, 2),
    ...bird('uguisu', [[148.36, 45.72, -1, 'island-pine', 10], [-270.03, -74.88, 1, 'west-pine', 10]]),
  ];
}
