// 伏見区・稲荷. A diagonal, not a centre: the great torii in the near corner, the two-storey gate behind it, and
// a line of gates climbing the mountain to the far corner. The fox keeps the other near corner.
// The sky above the gate and the ground between the fox and the climb stay empty nashiji.
// The ground (doha.js) is drawn piece by piece, every outline written here as control points:
//   the mountain  Inari-yama, ONE body of five rounded heads that overlap, in the far-mountain (toyama) manner; its foot is
//                 dissolved by the mist that cuts across its flank. No rocks on it.
//   the far range three low heads at the far left, the same way.
//   the near land quiet tongues of sand under the great torii, the two-storey gate and the fox: the shore is a soft curve.
//   the rocks     only in the near land, each against something: see ROCKS.
import {MAT, suyari, rock, branchPine as pine, bird, shell, torii, romon, fox, pawPrints, steppingStones, lantern} from './vocab.js';
import {mountain, tongues} from './doha.js';

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

// Rocks: only in the near land, each against something. Outline and peaks are relative to (x, z); w, h its half extents.
// on: what it stands on or leans against; why: the reason it is there. No rock on the mountain.
export const ROCKS = [
  // at the east post of the great torii: a broad low stone, two summits, grooves running down off the higher
  {id: 'torii-foot', x: -147, z: 212, w: 11, h: 8, seed: 6, height: 10,
    outline: [[-11,4],[-9,-2],[-6,-6],[-2,-5],[1,-8],[6,-7],[10,-1],[11,5],[4,7],[-5,8]],
    peaks: [{x: -3, z: -2, rx: 9, rz: 7, h: .85}, {x: 6, z: -3, rx: 5, rz: 5, h: .55}],
    lines: [[[-3,-4],[-5,0],[-8,5]], [[6,-5],[8,0],[9,4]], [[1,-3],[1,2],[0,6]]],
    on: 'the east post of the great torii, on the big gold ground', why: 'a stone at the foot of a post, where the torii is planted'},
  // at the foot of the two-storey gate: the large stone, craggy, a notch between two crowns
  {id: 'romon-step', x: -178, z: 52, w: 16, h: 10, seed: 7, height: 14,
    outline: [[-16,4],[-14,-3],[-9,-6],[-7,-11],[-2,-9],[0,-4],[3,-5],[6,-12],[11,-9],[13,-3],[16,2],[10,8],[1,7],[-8,9]],
    peaks: [{x: -8, z: -4, rx: 8, rz: 8, h: 1}, {x: 9, z: -5, rx: 6, rz: 7, h: .75}],
    lines: [[[-8,-6],[-9,0],[-12,6]], [[-6,-5],[-3,0],[-1,6]], [[9,-7],[11,-2],[13,3]], [[7,-6],[5,0],[6,5]]],
    on: 'the small gold ground east of the two-storey gate, at its foot', why: 'the stone the steps of the gate rest on'},
  // by the fox seat: the large stone, tall at the left and leaning
  {id: 'fox-seat', x: 206, z: 218, w: 19, h: 11, seed: 9, height: 13,
    outline: [[-19,6],[-17,-1],[-12,-5],[-8,-12],[-2,-9],[2,-13],[7,-8],[12,-6],[17,0],[20,5],[11,9],[-1,8],[-10,10]],
    peaks: [{x: -6, z: -6, rx: 10, rz: 9, h: 1}, {x: 12, z: -1, rx: 8, rz: 6, h: .5}],
    lines: [[[-6,-8],[-7,-1],[-10,6]], [[-2,-7],[1,0],[3,7]], [[12,-3],[14,1],[16,5]], [[-12,-4],[-15,1],[-17,5]]],
    on: 'the shore of the fox ground, east of its stone seat', why: 'a stone by the seat: the fox sits among stones'},
  // and a small flat pebble next to it
  {id: 'fox-seat-s', silver: true, x: 240, z: 224, w: 10, h: 7, seed: 8, height: 5,
    outline: [[-9,3],[-5,-5],[2,-6],[9,-1],[7,5],[-1,6]],
    peaks: [{x: 0, z: -1, rx: 9, rz: 6, h: 1}],
    lines: [[[-1,-3],[1,1],[2,4]]],
    on: 'beside the large stone, at the seat', why: 'the small one of the pair: a chip off the large'},
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
    ...ROCKS.flatMap(({id, x, z, w, h, seed, outline, peaks, height, lines, foil, silver}) =>
      rock(`rock-${id}`, x, z, w, h, seed, {outline, peaks, height, lines, foil, mat: silver ? MAT.rockSilver : MAT.rockGold})),
    // Slot 2: the gates, the fox and the trunks. These stand up from the lid.
    ...torii('torii', -232, 204, 1.22, {cap: true}),
    // A stone lantern at the great torii's west foot, outside the post: the way in. Only this side has room: between the
    // torii (to x -161) and the pine's crown (from x -135) there are 26 units, and a lantern at this scale is 56 wide.
    ...lantern('torii-lantern', -334, 212, .8).map(p => ({...p, on: 'torii'})),
    ...romon('romon', -250, 40, 62),
    ...climb(),
    ...fox('kitsune', 176, 200, -1, 1.5),
    ...pine('pine-a', -100, 214, 100, 16, 3, {clusters: 3}),
    ...pine('pine-b', 288, 206, 112, -14, 6, {clusters: 3}),
    // The bird sits on the crown pad of either pine: on the pad, not above its edge, or it hangs in the air.
    ...bird('uguisu', [[-77.76, 173.28, 1, 'pine-a', 10], [266.22, 160.00, -1, 'pine-b', 10]]),
  ];
}
