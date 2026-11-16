// Six modest roofs descend in a goose-flight staircase, each with its own clear interval; there is no keep.
// The cusped gate anchors the open left court, while the masonry and moat underline the entire procession.
// The ground is suhama (doha.js): tongues of gold and silver, laid one beside and over another, each hall on its own. Every
// outline is written here, point by point, round the piece (x, z from its centre `at`). Four clusters: the staircase of halls,
// the forecourt of the gate, the east pine, the west pine. A few rocks, each against something: see ROCKS.
import {MAT, hall, karamon, moatWall, branchPine as pine, bird, rock, suyari} from './vocab.js';
import {tongues} from './doha.js';

// Tongues, far to near. kiri: [from, to], a string of cut gold along the outline between those fractions of its length.
const STAIRS = [
  // a long gold tongue under the first hall, a bay in its lower edge
  {at: [-256, -134], sc: 1.3, p: [[-70, 2], [-50, -12], [-30, -8], [-12, -16], [8, -10], [28, -18], [42, -22], [54, -8], [72, 4], [56, 12], [40, 10], [30, 2], [18, -2], [6, 4], [2, 14], [-18, 16], [-44, 14]], tone: 'gold', seed: 11, kiri: [.55, .8]},
  // silver, a crescent: both tips lifted
  {at: [-176, -76], sc: 1.3, p: [[-60, -16], [-46, -18], [-28, -8], [-14, -2], [-6, -6], [8, 0], [18, -2], [40, -8], [56, -20], [66, -18], [60, -4], [44, 12], [20, 20], [-6, 22], [-30, 18], [-50, 6]], tone: 'silver', seed: 12},
  // gold, a comma: the round head on the right, the thin tail to the left
  {at: [-64, -10], sc: 1.3, p: [[-84, 4], [-60, 0], [-38, -4], [-16, -10], [8, -22], [34, -26], [56, -18], [64, -4], [56, 12], [34, 22], [10, 24], [-14, 14], [-38, 10], [-62, 8]], tone: 'gold', seed: 13, kiri: [.3, .5]},
  // silver, two lobes joined at the waist
  {at: [34, 52], sc: 1.3, p: [[-56, 0], [-46, -14], [-28, -18], [-12, -10], [-4, -6], [10, -12], [28, -20], [48, -14], [54, 0], [46, 14], [28, 20], [10, 14], [-2, 10], [-14, 16], [-32, 20], [-48, 14]], tone: 'silver', seed: 14},
  // gold, a spit: broad at the left, pointing right
  {at: [122, 116], sc: 1.3, p: [[-44, -18], [-24, -24], [-6, -20], [10, -14], [28, -16], [44, -6], [56, -6], [78, 2], [54, 6], [26, 12], [2, 20], [-24, 26], [-46, 20], [-54, 2]], tone: 'gold', seed: 15, kiri: [.05, .3]},
  // silver, a bean with two bays in its lower edge, beside the last hall
  {at: [214, 172], sc: 1.3, p: [[-60, -4], [-46, -16], [-24, -18], [-4, -12], [16, -18], [40, -14], [58, -2], [62, 12], [44, 14], [34, 6], [20, 10], [10, 20], [-6, 22], [-14, 12], [-30, 16], [-48, 10]], tone: 'silver', seed: 16},
];
const FORECOURT = [
  // a round gold islet at the far left of the court of the gate
  {at: [-298, 132], sc: 1.3, p: [[-34, -8], [-18, -18], [2, -20], [22, -14], [34, -2], [30, 12], [14, 20], [-6, 20], [-24, 14], [-36, 4]], tone: 'gold', seed: 21},
  // silver, a boomerang
  {at: [-222, 160], sc: 1.3, p: [[-58, -14], [-40, -20], [-18, -12], [0, -2], [16, 8], [38, 12], [62, 10], [74, 20], [60, 26], [34, 24], [18, 26], [2, 14], [-14, 16], [-30, 4], [-46, 6], [-58, -4]], tone: 'silver', seed: 22},
  // gold, an S: the left end lifted, the right end pulled up
  {at: [-112, 160], sc: 1.3, p: [[-52, -14], [-30, -22], [-6, -18], [14, -8], [34, -6], [56, -14], [60, -2], [40, 8], [16, 6], [-6, 12], [-30, 18], [-48, 10]], tone: 'gold', seed: 23, kiri: [.05, .4]},
  // a small silver bean to the right of the gate
  {at: [-56, 180], sc: 1.3, p: [[-26, 0], [-14, -10], [4, -12], [18, -6], [28, 4], [14, 10], [-2, 8], [-16, 12]], tone: 'silver', seed: 24},
];
const EAST = [
  // silver, a bean with a notch on its upper edge
  {at: [198, -138], sc: 1.25, p: [[-56, 2], [-40, -10], [-22, -12], [-12, -4], [-4, -2], [8, -12], [28, -14], [50, -8], [60, 6], [44, 14], [22, 12], [8, 20], [-6, 14], [-24, 18], [-46, 12]], tone: 'silver', seed: 31},
  // gold, long and thin with a hook at the right end
  {at: [262, -106], sc: 1.25, p: [[-64, -8], [-44, -14], [-20, -10], [4, -14], [30, -12], [52, -18], [68, -10], [62, 0], [46, -2], [26, 2], [4, 4], [-18, 10], [-42, 12], [-60, 6]], tone: 'gold', seed: 32},
  // gold, a lemon on a slant, under the east pine
  {at: [272, -36], sc: 1.25, p: [[-60, 10], [-46, -4], [-24, -16], [2, -22], [28, -16], [50, -4], [62, 10], [48, 18], [26, 22], [0, 22], [-26, 20], [-46, 18]], tone: 'gold', seed: 33, kiri: [.1, .35]},
  // a small silver comma
  {at: [282, 44], sc: 1.25, p: [[-30, -4], [-18, -14], [-2, -14], [10, -6], [26, -4], [42, 0], [30, 6], [14, 8], [4, 16], [-12, 18], [-26, 10]], tone: 'silver', seed: 34},
];
const WEST = [
  // gold, a long curved sausage
  {at: [-286, -52], sc: 1.3, p: [[-62, 6], [-48, 2], [-40, -8], [-22, -12], [-4, -10], [16, -18], [32, -12], [48, -10], [64, 0], [56, 6], [30, 0], [12, 8], [-6, 2], [-22, 12], [-44, 16]], tone: 'gold', seed: 41},
  // silver, a small peanut
  {at: [-292, 8], sc: 1.3, p: [[-42, 2], [-34, -10], [-18, -12], [-6, -4], [8, -8], [26, -12], [42, -4], [44, 8], [26, 14], [8, 8], [-6, 12], [-24, 16], [-38, 12]], tone: 'silver', seed: 42},
  // gold, a wedge pointing left, under the west pine
  {at: [-266, 58], sc: 1.3, p: [[-72, 4], [-60, -8], [-46, -6], [-34, -16], [-22, -14], [8, -22], [22, -18], [40, -24], [62, -8], [66, 8], [44, 18], [28, 24], [16, 18], [-2, 24], [-16, 20], [-46, 14]], tone: 'gold', seed: 43, kiri: [.2, .45]},
  // a small round silver islet
  {at: [-318, 102], sc: 1.3, p: [[-38, -6], [-20, -12], [0, -8], [18, -2], [38, 2], [40, 10], [20, 10], [2, 6], [-16, 12], [-34, 8]], tone: 'silver', seed: 44},
];

// Rocks: each against something. Outline and peaks are relative to (x, z); w, h its half extents.
// on: what it stands against; why: the reason it is there.
export const ROCKS = [
  // at the roots of the east pine: three summits, the middle one the highest
  {id: 'east-pine', x: 258, z: -52, w: 22, h: 10, seed: 4, height: 14, foil: .8,
    outline: [[-22, 4], [-18, -4], [-10, -3], [-6, -10], [2, -6], [8, -11], [14, -5], [22, -1], [20, 5], [6, 9], [-12, 8]],
    peaks: [{x: -12, z: -2, rx: 9, rz: 7, h: .7}, {x: 2, z: -5, rx: 9, rz: 8, h: 1}, {x: 15, z: -3, rx: 8, rz: 6, h: .6}],
    on: 'the roots of the east pine', why: 'the pine grips a stone; the stone is what holds its foot'},
  {id: 'east-pine-s', x: 210, z: -44, w: 9, h: 7, seed: 3, height: 5,
    outline: [[-8, 5], [-9, -1], [-4, -6], [0, -3], [4, -7], [8, -2], [7, 5], [0, 7]],
    peaks: [{x: -3, z: 0, rx: 8, rz: 6, h: 1}, {x: 6, z: -2, rx: 5, rz: 5, h: .5}],
    on: 'beside the large one', why: 'the small one of the pair'},
  // at the west pine: tall and thin
  {id: 'west-pine', x: -286, z: 91, w: 15, h: 9, seed: 6, height: 15,
    outline: [[-9, 3], [-8, -4], [-3, -12], [2, -15], [7, -8], [10, 0], [8, 6], [0, 9], [-6, 8]],
    peaks: [{x: 1, z: -6, rx: 8, rz: 10, h: 1}],
    on: 'the roots of the west pine', why: 'a tall thin stone leaning at the pine, as a lantern stone stands by an old tree'},
  // at the foot of the gate: split into two
  {id: 'karamon-foot', x: -76, z: 179, w: 14, h: 8, seed: 9, height: 10,
    outline: [[-13, 2], [-9, -6], [-3, -8], [0, -2], [3, -2], [7, -9], [13, -5], [14, 2], [8, 7], [0, 6], [-8, 8]],
    peaks: [{x: -6, z: -3, rx: 7, rz: 6, h: .85}, {x: 8, z: -4, rx: 6, rz: 6, h: 1}],
    on: 'the footing of the cusped gate, at its east side', why: 'the gate foot is steadied by a stone, the way a garden gate has one'},
  // at the corner of the last hall: a long flat slab, low on the left
  {id: 'hall-foot', x: 277, z: 158, w: 19, h: 8, seed: 3, height: 9, foil: .85,
    outline: [[-19, 5], [-15, -2], [-3, -4], [10, -8], [18, -3], [19, 4], [6, 8], [-10, 8]],
    peaks: [{x: 5, z: -3, rx: 14, rz: 6, h: 1}, {x: -10, z: 0, rx: 8, rz: 5, h: .4}],
    on: 'the base of the last hall, on its east', why: 'a stone at the corner of the plinth of the last hall, where the staircase ends'},
  // on the shore of the moat: a low wide stone with a small peak on its right
  {id: 'moat-shore', x: -30, z: 177, w: 14, h: 8, seed: 2, height: 7,
    outline: [[-13, 4], [-8, -3], [0, -5], [9, -3], [14, 3], [6, 7], [-6, 8]],
    peaks: [{x: -2, z: -1, rx: 13, rz: 6, h: .7}, {x: 8, z: -1, rx: 6, rz: 5, h: 1}],
    on: 'the shore of the moat in front of the wall', why: 'water-edge stone: the moat has its bank of stones'},
];
/** The clusters, for the measuring and checking scripts. */
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
    ...ROCKS.flatMap(({id, x, z, w, h, seed, outline, peaks, height, lines, foil, silver}) =>
      rock(`rock-${id}`, x, z, w, h, seed, {outline, peaks, height, lines, foil, ...(silver ? {mat: MAT.kirigin} : {})})),
    ...rooms.flatMap(([x, z, w], i) => hall(`ninomaru-${i}`, x, z, w, 22, {wallH: 22, bays: 5})),
    ...karamon('karamon', -172, 184, 69),
    ...pine('west-pine', -305, 62, 99, 12, 2, {clusters: 3}),
    ...pine('east-pine', 282, -79, 112, -12, 6, {clusters: 3}),
    ...bird('uguisu', [[-284.56, 21.72, 1, 'west-pine', 10], [261.10, -125.00, -1, 'east-pine', 10]]),
  ];
}
