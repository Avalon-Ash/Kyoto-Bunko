// Three shoin step away from the water in a goose-flight line; a moon deck reaches out over the pond's north-west shore.
// The ground (doha.js) is drawn piece by piece, every outline written here as control points. There is no mountain in this ward:
// Katsura is a garden on flat land, and what the eye should climb is the line of the shoin and the shore below it.
//   the suhama  a chain of gold shores round the pond, far to near, each lying over the end of the one before:
//               north-west (under the old shoin and the moon deck, wrapping the pond's west tip), middle (under the middle shoin),
//               north-east (under the new shoin, round the pond's east end and out to the far pine), south-west (stepping stones and
//               the near pine), south-east (the lantern and the east stone). The pond's south edge between the two south pieces is open.
//   behind the shoin  bare lacquer and the mist: nothing is laid there.
import {pond, hall, moonDeck, moon, steppingStones, lantern, branchPine as pine, bird, suyari, bambooFence} from './vocab.js';
import {tongues} from './doha.js';
import {meshCrag} from './crag-mesh.js';

/// The shores, far to near (a later piece lies over an earlier one). Each outline is written as a few broad lobes (a big lobe 40-70 wide,
/// a small one 15-25) with bays of different depths between, the lobes toward the water.
const SHORES = [
  // north-west: under the old shoin's wall and the moon deck; a big lobe under the deck, a small one, a big one wrapping the pond's west tip; its left flank is one big lobe with a small one at each end
  {p: [[-300, -64], [-296, -84], [-276, -92], [-244, -90], [-226, -95], [-210, -93], [-190, -99], [-172, -93], [-152, -98], [-134, -91], [-108, -86], [-88, -74], [-80, -56], [-82, -38], [-90, -18], [-96, 2],
    [-108, 15], [-124, 23], [-142, 21], [-150, 13], [-157, 22], [-166, 35], [-176, 38], [-182, 32], [-190, 46], [-200, 60], [-214, 66], [-228, 70],
    [-238, 63], [-248, 66], [-258, 60], [-262, 48], [-274, 44], [-292, 32], [-306, 12], [-312, -12], [-306, -30], [-298, -40], [-304, -52]], tone: 'gold', seed: 61},
  // middle: under the middle shoin; its left end lies over the north-west piece's right shoulder; two big lobes, two small, between them bays of different depth
  {p: [[-118, -20], [-122, -34], [-112, -46], [-92, -56], [-80, -61], [-64, -58], [-52, -64], [-42, -62], [-20, -58], [0, -62], [22, -56], [40, -59], [56, -52], [70, -50], [84, -42], [94, -38], [102, -28], [112, -14], [108, -4],
    [104, 0], [92, 1], [78, 0], [64, -1], [54, -6], [48, -14], [40, -6], [30, 0], [20, -3], [10, -13], [-4, -4], [-20, 3], [-40, 6], [-58, 3], [-72, -4],
    [-82, 8], [-92, 12], [-102, 10], [-112, 6]], tone: 'gold', seed: 62},
  // north-east: under the new shoin, round the pond's east end; the far pine stands on its right tail; its left end lies over the middle piece
  {p: [[98, -28], [108, -32], [120, -37], [132, -33], [150, -37], [162, -32], [178, -35], [204, -44], [226, -60], [252, -70], [284, -76], [312, -72], [334, -60], [346, -42], [348, -20], [338, -2], [318, 8], [300, 14],
    [284, 22], [268, 34], [260, 52], [262, 72], [258, 92], [246, 104], [234, 112], [226, 104], [238, 92], [240, 76], [238, 60], [228, 50], [214, 40], [204, 44],
    [190, 38], [176, 29], [166, 26], [160, 16], [152, 10], [146, 16], [138, 13], [130, 9], [122, 0], [117, -7], [112, -10], [104, -16], [99, -24]], tone: 'gold', seed: 63},
  // south-west: a long tongue along the pond's south-west edge, thick under the near pine and thinning to the right under the last stepping stones; its top left lies over the north-west piece
  {p: [[-326, 104], [-306, 96], [-282, 98], [-262, 92], [-244, 84], [-236, 74], [-224, 86], [-208, 94], [-194, 102], [-178, 108], [-168, 118], [-158, 112], [-142, 116], [-126, 120],
    [-112, 134], [-102, 130], [-92, 127], [-84, 130], [-60, 134], [-46, 142], [-56, 158], [-74, 166], [-92, 170], [-104, 166], [-116, 174], [-140, 178], [-156, 174],
    [-168, 182], [-190, 188], [-212, 190], [-234, 190], [-250, 198], [-276, 202], [-300, 200], [-322, 190], [-334, 172], [-336, 150], [-330, 124]], tone: 'gold', seed: 64},
  // south-east: under the stone lantern and the east stone; its top lies over the north-east piece's lower end
  {p: [[186, 128], [198, 120], [206, 118], [214, 111], [222, 108], [228, 102], [236, 98], [252, 92], [268, 98], [284, 92], [300, 100], [314, 98], [324, 108], [340, 112], [350, 128], [352, 146],
    [346, 168], [350, 186], [338, 204], [316, 212], [290, 214], [262, 208], [240, 214], [216, 210], [196, 200], [186, 178], [181, 165], [187, 142]], tone: 'gold', seed: 65},
];
// Rocks (docs/plans/2026-11-16-doha.md §15.1, §18.1): the crag, the same upright sharp cluster as Fushimi and Nakagyo. A cluster is one large
// crag of three or four blocks (a ridge each: [dx, dz, height, radius]; a block listed later lies in front of the one before), one small crag
// beside it, fine grain lines, flat pebbles at the foot, and on a few of them a small group of cut-gold squares. Everything is relative to
// (x, z). on: what it stands against; why: the reason it is there.
export const ROCKS = [
  // east of the shore lantern, on the south-east shore: a high crown with a notch behind a second, shorter crown, a gold step at the right and a silver shoulder at the left
  {id: 'east-stone', x: 326, z: 182, scale: .95,
    crags: [
      {seed: 7, blocks: [
        {mat: 'olive', ridge: [[-12, -5, 14, 6.5], [-6, -8, 20, 6.5], [-1, -5, 13, 5]], strata: {ang: -.8, period: 4.2, amp: .6, w: 1.1}},
        {mat: 'gold', ridge: [[7, -6, 15, 5.5], [13, -3, 10, 5], [17, 1, 6, 4]], strata: {ang: .6, period: 3.6, amp: .5, w: 1}},
        {mat: 'silver', ridge: [[-17, 1, 8, 5.5], [-10, 3, 10, 5]], q: .85},
        {mat: 'olive', ridge: [[-2, 4, 8, 5], [5, 5, 7, 4.5]]},
      ], grooves: [{p: [[1, -11], [1, -4], [2, 2]], w: 2.8, depth: 3.4}]},
      {at: [-29, 6], blocks: [{mat: 'olive', ridge: [[0, 0, 6, 4.2], [4, 1, 4.5, 3.2]]}, {mat: 'silver', ridge: [[-2, 4, 3.5, 3]]}]},
    ],
    lines: [[[-6, -8], [-7, -3], [-9, 2], [-11, 6]], [[-1, -6], [0, -1], [1, 4]], [[8, -6], [10, -1], [12, 3]], [[15, -2], [17, 2]], [[-15, 1], [-17, 5]], [[-1, 5], [3, 7], [7, 6]]],
    kiri: [{at: [10, -3], cols: 2, rows: 3, turn: .25}],
    pebbles: [[-22, 10, 3, 1.8, .8, .2, 'silver'], [6, 12, 3.4, 2, .9, -.2, 'olive'], [21, 8, 2.2, 1.5, .6, .3, 'silver'], [-33, 0, 2, 1.4, .6, 0, 'olive']],
    on: 'the south-east shore, east of the stone lantern at the water\'s edge', why: 'the lantern has a stone to lean its light toward; the garden\'s east edge is closed by it'},
];

/** The clusters, for the measuring and checking scripts. */
const PIECES = {SHORES};
export {PIECES};

export function nishikyo() {
  return [
    ...tongues('shore', SHORES, {toward: [[-120, 69], [15, 69], [150, 69]]}),
    ...pond('garden-pond', 15, 69, 217, 71, 7),
    // Katsura fence: a run of bamboo along the south-west shore's lower edge: this is an enclosed garden.
    ...bambooFence('katsura-fence', [-205, 170], [-90, 159], {on: 'shore-gold'}),
    ...suyari('mist-sky', -300, -72, -201, 13, 9),
    // Behind the new shoin, between it and the far pine: the last roof of the line rises out of the mist.
    ...suyari('mist-bank', 96, 320, -86, 12, 3),
    ...ROCKS.flatMap(({id, x, z, ...spec}) => meshCrag(`rock-${id}`, x, z, spec)),
    ...hall('old-shoin', -205, -99, 80, 33, {wallH: 27, group: 'old-shoin'}),
    ...hall('middle-shoin', -18, -65, 75, 31, {wallH: 25}),
    ...hall('new-shoin', 144, -29, 62, 29, {wallH: 24}),
    ...moon('pond-moon', -52, 50, 15),
    ...moonDeck('tsukimi', -176, -100, -32, 20),
    ...steppingStones('approach', [[-210, 114, 11], [-178, 129, 12], [-145, 140, 11], [-110, 146, 12], [-74, 148, 11]]),
    ...lantern('shore-lantern', 246, 171, .9),
    ...pine('near-pine', -291, 183, 99, 12, 2),
    ...pine('far-pine', 286, -60, 112, -12, 6),
    ...bird('uguisu', [[-270.56, 142.72, 1, 'near-pine', 10], [265.10, -106.00, -1, 'far-pine', 10]]),
  ];
}
