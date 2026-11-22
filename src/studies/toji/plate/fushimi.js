// 伏見区・稲荷. A diagonal, not a centre: the great torii in the near corner, the two-storey gate behind it, and
// a line of gates climbing the mountain to the far corner. The fox keeps the other near corner.
// The sky above the gate and the ground between the fox and the climb stay empty nashiji.
// The ground (doha.js) is drawn piece by piece, every outline written here as control points:
//   the mountain  Inari-yama, ONE body of five rounded heads that overlap, in the far-mountain (toyama) manner; its foot is
//                 dissolved by the mist that cuts across its flank. No rocks on it.
//   the far range three low heads at the far left, the same way.
//   the near land quiet tongues of sand under the great torii, the two-storey gate and the fox: the shore is a soft curve.
//   the rocks     only in the near land, each against something: see ROCKS.
import {suyari, branchPine as pine, bird, shell, torii, romon, fox, pawPrints, steppingStones, lantern} from './vocab.js';
import {mountain, tongues} from './doha.js';
import {meshCrag} from './crag-mesh.js';

/** Five gates up the slope, each smaller than the one before and clear of its neighbours. */
function climb() {
  // The z intervals clear the full height of the preceding gate, so their x spans can overlap safely.
  const steps = [[14, 144], [76, 62], [132, -12], [181, -78], [224, -136]];
  return steps.flatMap(([x, z], i) => torii(`gate-${i}`, x, z, .74 - i * .075));
}

// Toyama maki-e (far mountain): each head is one smooth ridge, [x, z] from its left foot to its right: a main peak and a shoulder or
// two, never the same either side. Flat fine powder, brightest on the ridge and thinning down to the ground; a nearer head's ridge
// lies bright over the faded foot of the one behind. Gold, or a paler cooler blue-gold. Far to near.
const MOUNTAIN = [
  // 1 (blue-gold, pale and cool: the one in another metal) the farthest, back left: a full arc, its peak a little left of the middle
  {ridge: [[-10, -118], [14, -166], [60, -204], [112, -214], [172, -196], [218, -168], [248, -126]], depth: 80, tone: 'blue'},
  // 2 (gold) behind on the right and the largest: the arc climbs slowly and drops steeply at the right
  {ridge: [[150, -112], [190, -170], [250, -210], [310, -218], [352, -184], [360, -140]], depth: 84},
  // 3 (gold) in front on the left: a broad head, falling away to the right
  {ridge: [[0, -90], [42, -128], [104, -150], [164, -144], [206, -116], [234, -82]], depth: 80},
  // 4 (gold) in front on the right: a small round head with its peak toward the right
  {ridge: [[198, -78], [216, -120], [246, -142], [292, -140], [330, -114], [354, -96]], depth: 72},
];
const FAR = [
  {ridge: [[-358, -96], [-330, -134], [-284, -160], [-238, -182], [-206, -170], [-190, -138]], depth: 70, tone: 'blue'},
  {ridge: [[-254, -92], [-228, -140], [-190, -170], [-150, -152], [-118, -108]], depth: 66},
  {ridge: [[-358, -80], [-336, -112], [-306, -124], [-280, -108], [-262, -86]], depth: 52},
];
// The near land. Each outline is written round the piece, one point per bend of the shore.
const COURT = [
  // under the two-storey gate: a small silver islet on the left, the wide gold ground the gate stands on, a small gold crescent on the right
  {at: [-318, 26], p: [[-26, -4], [-12, -12], [8, -10], [22, 0], [26, 10], [8, 14], [-10, 12], [-24, 8]], tone: 'silver', seed: 31},
  {at: [-250, 46], p: [[-96, 6], [-78, -8], [-52, -12], [-30, -22], [-4, -16], [22, -24], [50, -14], [76, -10], [98, 4], [82, 16], [56, 14], [34, 24], [8, 20], [-20, 26], [-48, 18], [-70, 22]], tone: 'gold', seed: 32, kiri: [.52, .74]},
  {at: [-160, 48], p: [[-30, -10], [-16, -12], [0, -4], [16, -2], [32, -10], [40, -4], [28, 8], [10, 12], [-8, 10], [-24, 6], [-36, 0]], tone: 'gold', seed: 33},
  // under the great torii: a small silver spit, a medium gold boomerang, and the big gold ground
  {at: [-296, 166], p: [[-34, 0], [-14, -10], [10, -12], [34, -6], [46, 2], [28, 8], [6, 10], [-14, 14], [-30, 10]], tone: 'silver', seed: 34},
  {at: [-150, 166], p: [[-52, -8], [-34, -12], [-14, -4], [4, 4], [26, 6], [44, 2], [56, 10], [46, 18], [24, 16], [2, 14], [-20, 10], [-42, 6]], tone: 'gold', seed: 35},
  {at: [-222, 198], p: [[-128, 8], [-112, -8], [-92, -13], [-74, -24], [-50, -20], [-30, -14], [-6, -26], [22, -22], [44, -12], [70, -17], [98, -8], [124, 4], [104, 16], [78, 19], [56, 27], [30, 22], [2, 26], [-28, 19], [-58, 24], [-90, 18], [-112, 19]], tone: 'gold', seed: 36, kiri: [.1, .3]},
];
const FOX = [
  {at: [104, 186], p: [[-36, 2], [-20, -6], [-4, -12], [14, -10], [30, -2], [22, 6], [6, 8], [-12, 14], [-28, 10]], tone: 'silver', seed: 41},
  {at: [176, 208], p: [[-80, 2], [-62, -10], [-40, -12], [-24, -6], [-8, -14], [14, -22], [40, -16], [64, -8], [80, 2], [62, 12], [40, 10], [22, 18], [-4, 22], [-30, 18], [-56, 16]], tone: 'gold', seed: 42},
  {at: [250, 184], p: [[-16, 0], [-8, -8], [6, -8], [16, 0], [10, 8], [-4, 10], [-14, 6]], tone: 'silver', seed: 43},
];

// Rocks (docs/plans/2026-11-16-doha.md §15.1): only in the near land, each cluster against something. A cluster is one large crag of
// three or four blocks (a ridge each: [dx, dz, height, radius]; a block listed later lies in front of the one before), one or two small
// crags beside it, fine grain lines, flat pebbles at the foot, and on a few of them a small group of cut-gold squares. Everything is
// relative to (x, z). on: what it stands against; why: the reason it is there. No rock on the mountain.
export const ROCKS = [
  // between the east post of the great torii and the root of the pine: a broad stone, a high spine at the back, a lower crown in front
  {id: 'torii-foot', x: -139, z: 211, scale: 1.15,
    crags: [
      {seed: 3, blocks: [
        {mat: 'olive', ridge: [[-8, -6, 16, 8], [0, -8, 20, 8], [10, -5, 14, 6]], strata: {ang: -.9, period: 4.4, amp: 0.65, w: 1.1}},
        {mat: 'silver', ridge: [[-17, -2, 11, 6], [-13, -7, 14, 5]], q: .85},
        {mat: 'olive', ridge: [[-5, 2, 10, 6], [4, 3, 12, 6]], strata: {ang: .6, period: 3.6, amp: 0.5, w: 1}},
        {mat: 'gold', ridge: [[10, 4, 8, 4.5], [13, 0, 10, 4]]},
        {mat: 'silver', ridge: [[-9, 8, 5, 4], [0, 9, 6, 4.5]], q: .8},
      ], grooves: [{p: [[-10, 0], [-2, 1], [7, 0]], w: 2.4, depth: 2.2}]},
      {at: [-24, -6], blocks: [{mat: 'silver', ridge: [[0, 0, 5, 4], [4, 1, 6, 3.4]]}]},
    ],
    lines: [[[1, -8], [0, -3], [-2, 2], [-4, 6]], [[5, -7], [6, -2], [8, 2], [10, 5]], [[-4, -6], [-8, -2], [-10, 3]], [[-13, -6], [-15, -1], [-17, 4]], [[-1, 4], [2, 6], [6, 7]], [[16, 0], [17, 4], [17, 7]]],
    pebbles: [[-13, 11, 3.4, 2, .9, .2, 'silver'], [4, 13, 2.4, 1.6, .7, -.3, 'olive'], [14, 10, 3, 1.9, .8, .1, 'silver'], [-30, 1, 2.2, 1.5, .6, 0, 'olive']],
    on: 'the east post of the great torii and the root of the pine, on the big gold ground', why: 'a stone where the torii post and the pine both plant their feet, the stone that holds the ground between them'},
  // at the foot of the two-storey gate: two crowns with a deep notch between, a small stone at its side
  {id: 'romon-step', x: -166, z: 47, scale: 1.2,
    crags: [
      {seed: 7, blocks: [
        {mat: 'olive', ridge: [[-12, -4, 15, 7], [-6, -8, 20, 7], [-1, -5, 14, 6]], strata: {ang: 1.2, period: 4, amp: 0.6, w: 1}},
        {mat: 'gold', ridge: [[8, -6, 15, 6], [14, -2, 11, 6]], strata: {ang: -.5, period: 3.8, amp: 0.5, w: 1}},
        {mat: 'silver', ridge: [[-12, 3, 8, 6], [-3, 6, 7, 6]], q: .85},
        {mat: 'olive', ridge: [[3, 3, 9, 5], [11, 3, 10, 5]]},
      ], grooves: [{p: [[2, -12], [2, -4], [3, 2]], w: 3, depth: 4}]},
      {at: [30, 5], blocks: [{mat: 'olive', ridge: [[0, 0, 8, 5], [4, 2, 6, 4]]}, {mat: 'silver', ridge: [[-3, 4, 4, 3.5]]}]},
    ],
    lines: [[[-6, -9], [-8, -4], [-11, 1], [-13, 5]], [[-3, -8], [-2, -2], [-1, 4]], [[9, -7], [11, -2], [13, 2]], [[14, -3], [16, 1]], [[-9, 5], [-4, 8], [2, 8]], [[30, 0], [32, 3], [34, 6]]],
    kiri: [{at: [-9, -2], cols: 2, rows: 3, turn: .2}],
    pebbles: [[-21, 9, 3, 1.8, .8, .1, 'silver'], [15, 11, 3.6, 2, .9, -.2, 'olive'], [24, 0, 2.2, 1.5, .6, .4, 'silver'], [-20, -3, 2, 1.4, .6, 0, 'olive']],
    on: 'the small gold ground east of the two-storey gate, at its foot', why: 'the stone the steps of the gate rest on'},
  // by the fox seat: a long spine that rises from the left, one steep crown, and falls away to the right; a gold lobe in front, a silver shoulder at the left
  {id: 'fox-seat', x: 227, z: 212, scale: 1.1,
    crags: [
      {seed: 11, blocks: [
        {mat: 'olive', ridge: [[-20, 1, 10, 8], [-12, -4, 17, 8], [-5, -7, 21, 6.5], [2, -5, 15, 5.2], [8, -1, 10, 4.2], [12, 4, 6, 3]], strata: {ang: .2, period: 4.2, amp: .6, w: 1.1}},
        {mat: 'silver', ridge: [[-24, 5, 7, 5], [-16, 7, 8, 5]], q: .85},
        {mat: 'gold', ridge: [[-6, 5, 7, 5], [2, 6, 6, 4]], strata: {ang: -1, period: 3.4, amp: .45, w: 1}},
      ]},
    ],
    lines: [[[-6, -9], [-8, -4], [-10, 0], [-12, 4]], [[-2, -8], [0, -3], [1, 3]], [[5, -8], [8, -3], [10, 1]], [[-21, 3], [-22, 6]], [[7, 5], [10, 7], [13, 7]]],
    pebbles: [[-28, 9, 2.6, 1.7, .7, .2, 'silver'], [12, 10, 3.2, 1.9, .8, -.1, 'olive'], [-2, 11, 2.2, 1.4, .6, .3, 'silver']],
    on: 'the shore of the fox ground, east of its stone seat', why: 'a stone by the seat: the fox sits among stones'},
];

/** The clusters, for the measuring and checking scripts. */
const PIECES = {MOUNTAIN, FAR, COURT, FOX};
export {PIECES};

export function fushimi() {
  return [
    // Layer 0: Inari-yama, the far range, and the near land.
    ...mountain('inari', MOUNTAIN),
    ...mountain('range-far', FAR),
    ...tongues('court', COURT),
    ...tongues('fox-land', FOX),
    ...shell('shell', [[-128, 132, 5, 8], [58, 122, 4.2, 2], [176, 58, 4.6, 5], [268, -12, 4, 3]]),
    // The approach: stones of cut silver under the gates, so the eye climbs with them.
    ...steppingStones('sando', [[-47, 154, 7], [-17, 153, 7], [14, 153, 7], [45, 112, 6.5], [76, 71, 6.5], [104, 34, 6], [132, -3, 6], [158, -36, 5.5], [181, -69, 5.5], [204, -98, 5], [224, -127, 5]]),
    // The fox's own trail, in cut silver, from the gates to its stone.
    ...pawPrints('trail', [[34, 126], [56, 136], [80, 142], [104, 152], [128, 158], [146, 168]]),
    // Slot 1: mist, then the rocks. The mist across the mountain's flank dissolves its foot.
    ...suyari('mist-sky', -372, -128, -222, 15, 6),
    ...suyari('mist-gate', -372, -190, -40, 13, 12),
    ...suyari('mist-foot', 78, 336, 92, 14, 4),
    ...ROCKS.flatMap(({id, x, z, ...spec}) => meshCrag(`rock-${id}`, x, z, spec)),
    // Slot 2: the gates, the fox and the trunks. These stand up from the lid.
    ...torii('torii', -232, 204, 1.22, {cap: true}),
    // A stone lantern at the great torii's west foot, outside the post: the way in. Only this side has room: between the
    // torii (to x -161) and the pine's crown (from x -135) there are 26 units, and a lantern at this scale is 56 wide.
    ...lantern('torii-lantern', -334, 212, .8).map(p => ({...p, on: 'torii'})),
    ...romon('romon', -250, 40, 62),
    ...climb(),
    ...fox('kitsune', 176, 200, -1, 1.5),
    ...pine('pine-a', -100, 214, 100, 16, 3),
    ...pine('pine-b', 288, 206, 112, -14, 6),
    // The bird sits on the crown pad of either pine: on the pad, not above its edge, or it hangs in the air.
    ...bird('uguisu', [[-77.76, 173.28, 1, 'pine-a', 10], [266.22, 160.00, -1, 'pine-b', 10]]),
  ];
}
