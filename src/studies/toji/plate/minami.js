// 南区・東寺. A composition, not a survey: the pagoda on its bank, the hall half lost in mist,
// a stream between two banks, pines in the foreground. A third of the ground stays empty nashiji.
// The ground (doha.js) is drawn piece by piece, every outline written here as control points:
//   the range    three low heads at the far upper left, behind the hall (the hall's roof lies against the lacquer below the crest).
//   the shores   a scalloped tongue under the hall, one under each pine group on the west and one broad one under the pagoda
//                on the east, each reaching to the water; a thin silver ribbon lies along the waterline on each side.
import {stream, streamEdge, suyari, pagoda, hall, stampedPine as pine, bird, shell, grassTufts, silverPlum} from './vocab.js';
import {mountain, tongues} from './doha.js';
import {crags} from './crag-mesh.js';

// The stream's own points and widths, kept here so its banks can be found again for the grass.
const STREAM = [[[-8, -150], [22, -70], [-30, 20], [14, 110], [-26, 232]], [7, 11, 17, 25, 36]];
/**
 * A tuft on the bank of the stream at t (0 head, 1 foot), side -1 east or 1 west, set 2.5 units out from the water.
 * @returns {[number, number, number, number, number, boolean]}
 */
function bankTuft(t, side, h, n, flower = false) {
  const [x, z] = streamEdge(...STREAM, t, side);
  return [x - side * 2.5, z, h, n, -side * .2, flower];
}

// The far range at the upper left, far to near. Why: the temple stands in the south of the city under a low line of hills; the lowest
// reads as the far horizon, and the stream rises out of the foot of the near one.
const RANGE = [
  // 1 (blue-gold, the farthest) at the far left, beyond the hall's west end: a full arc with its peak toward the left
  {ridge: [[-372, -122], [-358, -160], [-332, -186], [-296, -194], [-250, -184], [-206, -160], [-170, -128]], depth: 66, tone: 'blue'},
  // 2 (gold) the tallest, right of the hall over the stream's head: the stream rises at its foot; the hall's roof lies in the saddle between 1 and 2
  {ridge: [[0, -130], [16, -164], [44, -192], [84, -206], [122, -196], [152, -168], [170, -132]], depth: 66},
  // 3 (gold) a small head in front of the first, at the lid's left edge
  {ridge: [[-372, -100], [-358, -124], [-338, -142], [-312, -146], [-286, -136], [-266, -118], [-250, -100]], depth: 44},
];
/// The shores, far to near. Each outline is written round the piece as a few broad lobes (a big lobe 40-70 wide, a small one 15-25) with bays of different depths between.
// The west is one group laid one over another (the hall's tongue; then the far pine's, the middle one, and the near arm that follows the water and holds the stone).
const SHORES = [
  // west, under the hall: a long low tongue, five lobes along its back and five along its front, ending at the water above the first bend
  {p: [[-290, -26], [-280, -44], [-258, -54], [-236, -53], [-224, -44], [-218, -50], [-208, -56], [-196, -47], [-186, -54], [-160, -62], [-130, -62], [-104, -56], [-90, -46], [-80, -52], [-60, -58], [-44, -50], [-36, -44], [-30, -48], [-24, -40], [-26, -30],
    [-30, -20], [-40, -9], [-62, -4], [-84, -8], [-92, -16], [-100, -12], [-112, -5], [-126, -7], [-134, -14], [-142, -10], [-164, -2], [-196, -1], [-214, -8], [-222, -16], [-230, -12], [-240, -6], [-250, -10], [-254, -17], [-262, -12], [-278, -14]], tone: 'gold', seed: 41},
  // west, 1: under the far pine, off the lid's left edge: the biggest lobe is the pine's own ground; two small ones and a broad one below
  {p: [[-358, 138], [-352, 122], [-332, 113], [-312, 112], [-302, 121], [-294, 117], [-286, 111], [-278, 118], [-270, 122], [-262, 114], [-244, 110], [-226, 114], [-214, 124], [-208, 146], [-210, 170], [-214, 186],
    [-226, 194], [-232, 188], [-248, 200], [-268, 204], [-286, 198], [-292, 190], [-300, 196], [-312, 200], [-320, 194], [-334, 204], [-350, 200], [-358, 184], [-359, 160]], tone: 'gold', seed: 42},
  // west, 2: the middle one, under the near pine: lies over the far pine's right end and runs in under the next
  {p: [[-256, 168], [-250, 150], [-236, 140], [-216, 137], [-200, 142], [-192, 146], [-182, 139], [-170, 141], [-150, 133], [-128, 139], [-110, 152], [-100, 172], [-104, 196], [-110, 208],
    [-128, 213], [-150, 207], [-166, 214], [-186, 208], [-198, 203], [-212, 213], [-232, 207], [-246, 200], [-256, 188]], tone: 'gold', seed: 43},
  // west, 3: the near arm: its left lobe over the middle one, then up the west side of the water as a narrow arm; three lobes of different size down the water's edge
  {p: [[-146, 118], [-142, 108], [-138, 104], [-120, 99], [-100, 99], [-86, 105], [-79, 95], [-77, 84], [-68, 77], [-61, 68], [-60, 58], [-54, 50], [-46, 45], [-40, 46], [-34, 54], [-28, 64], [-23, 80], [-17, 92], [-22, 100], [-13, 108], [-12, 122], [-18, 133], [-29, 140], [-30, 150], [-31, 160], [-36, 166], [-44, 171], [-43, 180], [-48, 192], [-56, 204], [-62, 211],
    [-72, 213], [-88, 207], [-102, 212], [-120, 214], [-136, 206], [-152, 196], [-162, 178], [-160, 156], [-153, 136]], toward: STREAM[0], tone: 'gold', seed: 44},
  // the silver waterline on the west arm, laid over the gold along the water's side: a hand's breadth between the gold and the water
  {p: [[-34, 62], [-28, 71], [-22, 83], [-19, 92], [-27, 99], [-19, 107], [-18, 120], [-21, 130], [-28, 128], [-26, 116], [-28, 107], [-33, 100], [-29, 90], [-33, 80], [-39, 70], [-42, 63]], tone: 'silver', seed: 45},
  // east, a lobed tongue on the water's side for the first stone: a broad lobe, a small one and a mid one along its back
  {p: [[14, 66], [20, 50], [36, 42], [54, 40], [64, 46], [70, 40], [80, 38], [90, 44], [98, 49], [104, 48], [112, 58], [111, 70],
    [104, 80], [90, 84], [82, 80], [74, 82], [66, 90], [54, 88], [42, 84], [34, 86], [26, 82], [18, 76]], toward: STREAM[0], tone: 'gold', seed: 46},
  // east, 1: the tower's far bank: its back edge in four lobes of very different size, from the water to the lid's right edge
  {p: [[38, 140], [38, 124], [46, 112], [66, 106], [90, 108], [100, 114], [106, 108], [116, 104], [126, 110], [134, 116], [140, 112], [160, 102], [188, 100], [214, 104], [228, 112], [236, 104], [250, 98], [266, 102], [276, 108], [284, 102], [294, 98], [304, 104], [312, 110], [322, 102], [342, 106], [356, 120], [357, 142], [354, 160], [346, 172],
    [330, 176], [300, 168], [270, 174], [240, 166], [210, 172], [180, 168], [150, 174], [120, 168], [90, 172], [60, 166], [44, 160]], tone: 'gold', seed: 47},
  // east, 2: the tower's near left bank: reaches the water at its west end; its back edge lies in front of the pagoda's base
  {p: [[32, 170], [38, 158], [56, 154], [82, 158], [100, 152], [116, 160], [140, 156], [164, 162], [190, 158], [214, 164], [206, 186], [192, 198], [176, 206], [150, 200], [136, 210], [108, 203], [92, 210], [66, 204], [52, 212], [36, 204], [28, 188]], tone: 'gold', seed: 48},
  // east, 3: the tower's near right bank, over the end of the first: the pine on the right stands on it
  {p: [[176, 170], [200, 160], [226, 166], [250, 158], [278, 164], [296, 156], [324, 162], [346, 170], [354, 188], [340, 202], [320, 196], [298, 208], [274, 200], [252, 211], [232, 204], [206, 210], [184, 200], [170, 184]], tone: 'gold', seed: 49},
  // the silver waterline on the east bank, laid over the gold along the water's side
  {p: [[46, 142], [45, 154], [41, 166], [38, 180], [37, 192], [44, 193], [48, 181], [51, 167], [54, 154], [55, 142]], tone: 'silver', seed: 50},
];
// Rocks (docs/plans/2026-11-16-doha.md §15.1, §18.1): the crag, the same upright sharp cluster as Fushimi and Nakagyo. A cluster is one large
// crag of three or four blocks (a ridge each: [dx, dz, height, radius]; a block listed later lies in front of the one before), one small crag
// beside it, fine grain lines, flat pebbles at the foot, and on a few of them a small group of cut-gold squares. Everything is relative to
// (x, z). on: what it stands against; why: the reason it is there.
export const ROCKS = [
  // the first east tongue: a pair that face each other across a gap: a big olive boulder with a silver shoulder, and a small gold one that stands off to its right
  {id: 'stream-east', x: 62, z: 62, scale: 1.25,
    crags: [
      {seed: 3, blocks: [
        {mat: 'olive', ridge: [[-6, -4, 19, 6.5], [0, -6, 24, 6], [5, -3, 18, 5.5]], top: .5, strata: {ang: .5, period: 4.2, amp: .6, w: 1.1}},
        {mat: 'silver', ridge: [[-12, 3, 9, 5], [-5, 5, 11, 4.5]], q: .85},
        {mat: 'olive', ridge: [[-2, 8, 5, 4], [5, 8, 6, 3.6]]},
      ], grooves: [{p: [[-2, -10], [-1, -3], [-2, 3]], w: 2.4, depth: 2.6}]},
      {at: [21, 3], blocks: [{mat: 'gold', ridge: [[0, 0, 11, 4.5], [3, 1, 8, 3.8]]}, {mat: 'silver', ridge: [[-2, 4, 4.5, 3.2]]}]},
    ],
    lines: [[[0, -6], [-1, -1], [-2, 4]], [[5, -3], [6, 1]], [[-9, 3], [-11, 6]], [[21, 0], [22, 4]]],
    kiri: [{at: [-2, -1], cols: 2, rows: 2, turn: .15}],
    pebbles: [[-17, 10, 3, 1.8, .8, .2, 'silver'], [8, 12, 3.4, 2, .9, -.2, 'olive'], [30, 8, 2.2, 1.5, .6, .3, 'silver'], [-22, -2, 2, 1.4, .6, 0, 'olive']],
    on: 'the first east tongue, on the water side of the stream', why: 'a stone the bank keeps for the water: the stream is held on this side by it'},
  // the west near arm along the stream: a thin tall silver needle with a twin back slab, a gold step at its left foot
  {id: 'stream-west', x: -44, z: 112, scale: 1.1,
    crags: [
      {seed: 8, blocks: [
        {mat: 'olive', ridge: [[-9, -8, 12, 5], [-6, -10, 17, 4.5]], strata: {ang: 1.1, period: 4, amp: .55, w: 1}},
        {mat: 'silver', ridge: [[0, -5, 15, 4.8], [2, -8, 28, 3.6], [3, -5, 18, 4]], q: .92},
        {mat: 'gold', ridge: [[-10, 2, 8, 4.5], [-5, 3, 10, 4]], strata: {ang: .3, period: 3.4, amp: .45, w: 1}},
        {mat: 'olive', ridge: [[5, 4, 4.5, 3.6], [9, 5, 4, 3.2]]},
      ], grooves: [{p: [[3, -9], [2, -3], [3, 2]], w: 1.6, depth: 2.4}]},
    ],
    lines: [[[2, -8], [1, -3], [0, 3]], [[-6, -10], [-7, -5]], [[-9, 3], [-11, 6]], [[3, -5], [4, -1]]],
    pebbles: [[-18, 9, 3.2, 1.9, .8, -.2, 'silver'], [4, 12, 2.6, 1.7, .7, .3, 'olive'], [14, 10, 3, 1.8, .8, .1, 'silver']],
    on: 'the west near arm, at the stream\'s edge', why: 'the stone the water turns against, where the arm of the shore meets it'},
  // the near left bank of the pagoda's shore: a low wide sprawl of two shallow humps with a saddle between, a gold lobe and a silver lobe in front
  {id: 'pagoda-bank', x: 48, z: 178, scale: 1.5,
    crags: [
      {seed: 6, blocks: [
        {mat: 'olive', ridge: [[-18, -2, 13, 7], [-10, -5, 19, 7], [-2, -3, 11, 6.5], [7, -5, 21, 7], [16, -2, 13, 6]], strata: {ang: -.2, period: 4.4, amp: .6, w: 1.1}},
        {mat: 'gold', ridge: [[-12, 5, 9, 6], [-4, 7, 10, 5.5]], strata: {ang: 1.2, period: 3.4, amp: .45, w: 1}},
        {mat: 'silver', ridge: [[8, 6, 8, 6], [16, 5, 6, 5]], q: .85},
        {mat: 'olive', ridge: [[-22, 3, 6, 4.5], [-18, 5, 5, 4]]},
      ], grooves: [{p: [[-2, -9], [-2, -3], [-3, 2]], w: 2.6, depth: 3}]},
    ],
    lines: [[[-10, -6], [-11, -1], [-13, 4]], [[7, -6], [8, -1], [9, 4]], [[-2, -4], [-1, 1]], [[16, -2], [17, 3]], [[-4, 7], [0, 9], [4, 8]]],
    kiri: [{at: [-9, -3], cols: 2, rows: 3, turn: .3}],
    pebbles: [[-27, 10, 2.8, 1.7, .7, .2, 'silver'], [4, 14, 3.4, 2, .8, -.2, 'olive'], [22, 11, 2.4, 1.6, .7, .3, 'silver'], [-9, 14, 2, 1.4, .6, 0, 'olive']],
    on: 'the near left bank of the pagoda\'s shore, a way west of the pagoda', why: 'the pagoda stands on a rise of the bank; this is the stone it came out of'},
];

/** The clusters, for the measuring and checking scripts. */
const PIECES = {RANGE, SHORES};
export {PIECES};

export function minami() {
  return [
    // Layer 0: the range, the shores and the water.
    ...mountain('range', RANGE),
    ...tongues('shore', SHORES),
    ...stream('stream', ...STREAM),
    ...shell('shell', [[14, -44, 4.2, 2], [-22, 34, 5, 5], [6, 96, 4.4, 8], [-12, 168, 5.6, 3]]),
    // Grass on both banks: gold line work, two tufts carrying a small silver flower.
    ...grassTufts('stream-grass', [bankTuft(.38, -1, 12, 4), bankTuft(.58, -1, 11, 4, true), bankTuft(.78, -1, 12, 4), bankTuft(.5, 1, 12, 4), bankTuft(.68, 1, 11, 4, true)], {on: 'stream', seed: 4}),
    // A silver plum by the hall's west roof corner.
    ...silverPlum('plum', -222, 4, 1.4, {on: 'kondo'}),
    // Slot 1: mist and stones.
    ...suyari('mist-hall', -360, -18, -34, 17, 5),
    ...suyari('mist-sky', 196, 372, -186, 15, 9),
    ...suyari('mist-far', -372, -250, -118, 13, 14),
    ...crags(ROCKS),
    // Slot 2: the hall, the pagoda and the trunks. These stand up from the lid.
    ...hall('kondo', -150, -72, 104, 44),
    ...pagoda('pagoda', 176, 128),
    ...pine('pine-a', -288, 172, 150, 26, 2),
    ...pine('pine-b', -134, 190, 104, -18, 7),
    ...pine('pine-c', 300, 150, 96, -14, 5),
    // Slot 3 holds the foliage pads (from pine). The bird's two perches ride on their pines but are painted in
    // slot 1, clear of the stones and the mist, so the pad under a sleeping bird stays whole.
    ...bird('uguisu', [[-259.61, 109.28, 1, 'pine-a', 10], [-157.26, 147.52, -1, 'pine-b', 10]]),
  ];
}
