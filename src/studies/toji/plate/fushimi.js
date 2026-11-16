// 伏見区・稲荷. A diagonal, not a centre: the great torii in the near corner, the two-storey gate behind it, and
// a line of gates climbing the mountain to the far corner. The fox keeps the other near corner.
// The sky above the gate and the ground between the fox and the climb stay empty nashiji.
// The ground is banks (doha.js): small pieces laid one on another, gold and silver, the nearer over the farther, with
// rocks on their crests. Four clusters: the mountain the gates climb, a far ridge, the bank under the great torii, and the
// bank under the two-storey gate.
import {MAT, suyari, rock, branchPine as pine, bird, shell, torii, romon, fox, pawPrints, steppingStones, lantern} from './vocab.js';
import {banks, bankPoint} from './doha.js';

/** Five gates up the slope, each smaller than the one before and clear of its neighbours. */
function climb() {
  // The z intervals clear the full height of the preceding gate, so their x spans can overlap safely.
  const steps = [[14, 144], [76, 62], [132, -12], [181, -78], [224, -136]];
  return steps.flatMap(([x, z], i) => torii(`gate-${i}`, x, z, .74 - i * .075));
}

// Banks, far to near (a later one lies over an earlier one). x, z: the middle of the ridge; len along it; depth: how far the wedge runs down.
const MOUNTAIN = [
  {x: 278, z: -196, len: 164, depth: 58, turn: .04, tone: 'gold', seed: 11, kiri: [.2, .8]},
  {x: 140, z: -172, len: 144, depth: 54, turn: -.05, tone: 'silver', seed: 12},
  {x: 250, z: -148, len: 172, depth: 64, turn: .03, tone: 'gold', seed: 13},
  {x: 102, z: -118, len: 134, depth: 58, turn: .08, tone: 'silver', seed: 14},
  {x: 286, z: -98, len: 144, depth: 60, turn: -.05, tone: 'silver', seed: 15},
  {x: 188, z: -80, len: 174, depth: 62, turn: .04, tone: 'gold', seed: 16},
  {x: 290, z: -40, len: 124, depth: 50, turn: 0, tone: 'gold', seed: 17},
];
const FAR = [
  {x: -276, z: -182, len: 172, depth: 50, turn: .04, tone: 'gold', seed: 21},
  {x: -150, z: -158, len: 144, depth: 46, turn: -.05, tone: 'silver', seed: 22},
  {x: -318, z: -140, len: 104, depth: 38, turn: .06, tone: 'silver', seed: 24},
  {x: -250, z: -126, len: 152, depth: 44, turn: .03, tone: 'gold', seed: 23, kiri: [.25, .75]},
  {x: -160, z: -106, len: 112, depth: 38, turn: -.04, tone: 'gold', seed: 25},
];
const TORII_BANK = [
  {x: -290, z: 146, len: 134, depth: 54, turn: -.04, tone: 'silver', seed: 31},
  {x: -170, z: 148, len: 134, depth: 54, turn: .05, tone: 'gold', seed: 32},
  {x: -232, z: 170, len: 184, depth: 54, turn: .02, tone: 'gold', seed: 33},
  {x: -6, z: 192, len: 140, depth: 36, turn: -.05, tone: 'silver', seed: 34},
];
const GATE_BANK = [
  {x: -290, z: 2, len: 124, depth: 48, turn: -.03, tone: 'gold', seed: 41},
  {x: -196, z: 10, len: 124, depth: 48, turn: .05, tone: 'silver', seed: 42},
  {x: -246, z: 30, len: 154, depth: 42, turn: .02, tone: 'gold', seed: 43},
  {x: -326, z: 36, len: 92, depth: 34, turn: .04, tone: 'silver', seed: 44},
];
/** [cluster, piece, f along the ridge, dz below it, w, h, seed, mat]: a rock on a crest; resolved to a point below. */
export const ROCKS_SPEC = [
  ['MOUNTAIN', 0, null, .86, 4, 24, 15, 5], ['MOUNTAIN', 2, null, .08, 4, 15, 10, 8, 'MAT.kirigin'], ['MOUNTAIN', 4, null, .88, 4, 14, 10, 6], ['MOUNTAIN', 5, null, .12, 4, 14, 10, 7, 'MAT.kirigin'],
  ['FAR', 0, null, .9, 4, 18, 12, 9, 'MAT.kirigin'], ['FAR', 3, null, .1, 4, 14, 10, 3],
  ['TORII_BANK', 3, null, .55, 4, 20, 13, 4, 'MAT.kirigin'], ['TORII_BANK', 0, null, .19, 4, 14, 10, 7], ['TORII_BANK', 3, null, .95, 4, 14, 10, 1, 'MAT.kirigin'],
  ['GATE_BANK', 0, null, .12, 4, 17, 11, 9], ['GATE_BANK', 1, null, .9, 4, 14, 10, 5, 'MAT.kirigin'],
];

/** The clusters, for the measuring and placing scripts. */
const PIECES = {MOUNTAIN, FAR, TORII_BANK, GATE_BANK};
export {PIECES};

export function fushimi() {
  return [
    // Layer 0: the mountain the gates climb, a far ridge, and the banks the great torii and the two-storey gate stand on.
    ...banks('inari', MOUNTAIN),
    ...banks('ridge-far', FAR),
    ...banks('bank-near', TORII_BANK),
    ...banks('bank-gate', GATE_BANK),
    ...shell('shell', [[-128, 132, 5, 8], [58, 122, 4.2, 2], [176, 58, 4.6, 5], [268, -12, 4, 3]]),
    // The approach: stones of cut silver under the gates, so the eye climbs with them.
    ...steppingStones('sando', [[-47, 154, 7], [-17, 153, 7], [14, 153, 7], [45, 112, 6.5], [76, 71, 6.5], [104, 34, 6], [132, -3, 6], [158, -36, 5.5], [181, -69, 5.5], [204, -98, 5], [224, -127, 5]]),
    // The fox's own trail, in cut silver, from the gates to its stone.
    ...pawPrints('trail', [[34, 126], [56, 136], [80, 142], [104, 152], [128, 158], [146, 168]]),
    // Slot 1: mist and rocks. A rock stands on a bank's crest: one large, the rest small.
    ...suyari('mist-sky', -372, -128, -196, 15, 6),
    ...suyari('mist-gate', -372, -214, -96, 13, 12),
    ...suyari('mist-foot', 78, 336, 92, 14, 4),
    ...ROCKS_SPEC.flatMap(([set, i, , f, dz, w, h, seed, mat], k) => {
      const [x, z] = bankPoint(PIECES[set][i], f);
      return rock(`rock-${k}`, x, z + dz, w, h, seed, mat ? {mat: MAT.kirigin} : {});
    }),
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

