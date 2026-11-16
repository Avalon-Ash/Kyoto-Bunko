// Six modest roofs descend in a goose-flight staircase, each with its own clear interval; there is no keep.
// The cusped gate anchors the open left court, while the masonry and moat underline the entire procession.
// The ground is suhama (doha.js): flat tongues of gold and silver, laid one beside and over another, each hall on its own,
// with a few rocks at their tips. Four clusters: the staircase of halls, the forecourt of the gate, the east pine, the west pine.
import {MAT, hall, karamon, moatWall, branchPine as pine, bird, rock, suyari} from './vocab.js';
import {tongues, tonguePoint} from './doha.js';

// Tongues, far to near. x, z: the middle; len along it; wid across; tone gold or silver; kiri: a string of cut gold along the edge facing the open ground.
const STAIRS = [
  {x: -256, z: -134, len: 140, wid: 66, turn: .05, tone: 'gold', seed: 11, kiri: ['bottom', .15, .7]},
  {x: -176, z: -76, len: 134, wid: 64, turn: -.04, tone: 'silver', seed: 12},
  {x: -70, z: -12, len: 142, wid: 66, turn: .05, tone: 'gold', seed: 13, kiri: ['bottom', .3, .85]},
  {x: 22, z: 50, len: 134, wid: 64, turn: -.04, tone: 'silver', seed: 14},
  {x: 86, z: 112, len: 142, wid: 66, turn: .05, tone: 'gold', seed: 15, kiri: ['bottom', .1, .6]},
  {x: 196, z: 174, len: 136, wid: 62, turn: -.04, tone: 'silver', seed: 16},
  {x: 268, z: 184, len: 100, wid: 44, turn: .06, tone: 'gold', seed: 17},
];
const FORECOURT = [
  {x: -302, z: 130, len: 104, wid: 46, turn: -.06, tone: 'gold', seed: 21},
  {x: -226, z: 158, len: 124, wid: 50, turn: .03, tone: 'silver', seed: 22},
  {x: -128, z: 156, len: 120, wid: 48, turn: -.03, tone: 'gold', seed: 23, kiri: ['top', .2, .8]},
  {x: -62, z: 176, len: 108, wid: 40, turn: .06, tone: 'silver', seed: 24},
  {x: -172, z: 196, len: 112, wid: 30, turn: .02, tone: 'gold', seed: 25},
];
const EAST = [
  {x: 196, z: -140, len: 124, wid: 44, turn: .05, tone: 'silver', seed: 31},
  {x: 290, z: -108, len: 124, wid: 46, turn: -.03, tone: 'gold', seed: 32},
  {x: 280, z: -50, len: 130, wid: 48, turn: .04, tone: 'gold', seed: 33},
  {x: 294, z: 12, len: 114, wid: 42, turn: -.04, tone: 'silver', seed: 34},
  {x: 284, z: 92, len: 116, wid: 46, turn: .03, tone: 'gold', seed: 35},
];
const WEST = [
  {x: -298, z: -52, len: 118, wid: 42, turn: .04, tone: 'gold', seed: 41},
  {x: -300, z: 8, len: 112, wid: 40, turn: -.04, tone: 'silver', seed: 45},
  {x: -294, z: 44, len: 126, wid: 48, turn: -.03, tone: 'silver', seed: 42},
  {x: -250, z: 96, len: 104, wid: 40, turn: .05, tone: 'gold', seed: 43},
  {x: -322, z: 102, len: 80, wid: 32, turn: -.05, tone: 'gold', seed: 44},
];
/** [cluster, piece, edge, f along it, dz, w, h, seed, mat]: a rock at a tongue's tip or edge; its foot is on the tongue. */
export const ROCKS_SPEC = [
  ['STAIRS', 6, 'top', .9, 3, 22, 14, 5, 'MAT.kirigin'], ['STAIRS', 2, 'bottom', .44, -2, 14, 10, 8], ['STAIRS', 4, 'bottom', .3, 2, 14, 10, 3],
  ['FORECOURT', 1, 'top', .06, 3, 15, 10, 6], ['FORECOURT', 3, 'top', .94, -2, 14, 10, 7, 'MAT.kirigin'],
  ['EAST', 4, 'top', .2, 3, 25, 18, 4, 'MAT.kirigin'], ['EAST', 3, 'top', .5, -2, 14, 10, 7],
  ['WEST', 3, 'bottom', .3, -2, 14, 9, 9, 'MAT.kirigin'], ['WEST', 4, 'top', .4, 2, 14, 10, 1],
];
/** The clusters, for the measuring and placing scripts. */
const PIECES = {STAIRS, FORECOURT, EAST, WEST};
export {PIECES};

export function nakagyo() {
  const rooms = [[-248, -172, 62], [-161, -110, 64], [-74, -48, 66], [13, 14, 62], [100, 76, 58], [187, 138, 58]];
  return [
    ...tongues('stairs', STAIRS),
    ...tongues('forecourt', FORECOURT),
    ...tongues('east', EAST),
    ...tongues('west', WEST),
    ...suyari('mist-court', -205, 15, -212, 11, 8),
    ...suyari('mist-east', 140, 337, 10, 12, 5),
    ...suyari('mist-gate', -344, -234, 125, 11, 2),
    ...moatWall('ishigaki', -333, 333, 201, 218, 232),
    ...ROCKS_SPEC.flatMap(([set, i, side, f, dz, w, h, seed, mat], k) => {
      const [x, z] = tonguePoint(PIECES[set][i], side, f);
      return rock(`rock-${k}`, x, z + dz, w, h, seed, mat ? {mat: MAT.kirigin} : {});
    }),
    ...rooms.flatMap(([x, z, w], i) => hall(`ninomaru-${i}`, x, z, w, 22, {wallH: 22, bays: 5})),
    ...karamon('karamon', -172, 184, 69),
    ...pine('west-pine', -305, 62, 99, 12, 2, {clusters: 3}),
    ...pine('east-pine', 282, -79, 112, -12, 6, {clusters: 3}),
    ...bird('uguisu', [[-284.56, 21.72, 1, 'west-pine', 10], [261.10, -125.00, -1, 'east-pine', 10]]),
  ];
}

