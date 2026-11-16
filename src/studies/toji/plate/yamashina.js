// An axial ascent: stone treads lead through an open gate to the hall, held between two large maple crests.
// The lower outer corners are empty ground; the mist cuts across the ridge rather than across the stair.
import {MAT, hall, sanmon, stoneSteps, lantern, branchMaple as maple, fallenLeaves, bird, rock, suyari, grassTufts} from './vocab.js';
import {mountain, tongues} from './doha.js';

// The ground (doha.js) is drawn piece by piece, every outline written here as control points:
//   the mountain   one body of three rounded heads behind the hall: a pale blue-gold one at the far left under the mist, the tallest with its peak to the
//                  hall roof's left (the roof's left end lies against its flank), and a lower gold one on the right, its peak beyond the roof's right end.
//   the banks      a narrow bank along each side of the stair, wider at the foot and narrowing as it climbs (the two are not alike), and a small tongue
//                  under each maple, where the leaves lie. The ground before the gate is bare.
// Heads, far to near. Why: the temple stands under its hill; the roof and the mountain show each other, neither one hides the other.
const MOUNTAIN = [
  // 1 (blue-gold, the farthest) at the far left, in the mist: a full arc, its peak toward the right
  {ridge: [[-352, -112], [-342, -142], [-322, -164], [-290, -176], [-252, -170], [-216, -148], [-184, -112]], depth: 84, tone: 'blue'},
  // 2 (gold) the tallest: its peak left of the roof; climbs fast from the left, falls slowly to the hall's roof at the right
  {ridge: [[-252, -118], [-230, -162], [-190, -198], [-136, -218], [-84, -208], [-34, -178], [6, -132]], depth: 118},
  // 3 (gold) in front on the right: climbs slowly from behind the roof, peaks past the roof's right end and falls steeply
  {ridge: [[26, -106], [48, -136], [90, -160], [138, -176], [178, -184], [218, -160], [238, -114]], depth: 96},
];
// The banks, far to near. Each outline is written round the piece as a few broad lobes and small ones, with bays of different depths.
const BANKS = [
  // the west bank of the stair: begins at the top as a point and widens at the foot; three lobes along its outer edge, the grass on the stair's edge grows on it
  {p: [[-14, 48], [-28, 50], [-40, 60], [-46, 76], [-45, 92], [-42, 103], [-49, 109], [-57, 118], [-55, 128], [-52, 134], [-64, 141], [-76, 158], [-79, 176], [-86, 190], [-84, 199], [-92, 201], [-98, 208], [-90, 214],
    [-74, 214], [-62, 212], [-51, 203], [-42, 192], [-35, 180], [-29, 167], [-24, 154], [-20, 140], [-18, 126], [-17, 112], [-18, 98], [-20, 84], [-22, 70], [-22, 58]], tone: 'gold', seed: 77},
  // the east bank of the stair: shorter, begins at the top as a blunt end, then one big lobe and a small one; its lower end is broader than the west one's
  {p: [[66, 66], [72, 72], [84, 84], [96, 98], [104, 110], [101, 121], [112, 126], [126, 142], [131, 162], [124, 180], [120, 190], [127, 196], [133, 204], [124, 213],
    [104, 214], [92, 208], [90, 186], [84, 160], [74, 134], [62, 110], [54, 92], [54, 76], [58, 68]], tone: 'gold', seed: 72},
  // under the west maple: its trunk stands on a round tongue with a small lobe in front, where the leaves gather
  {p: [[-304, 112], [-298, 98], [-280, 92], [-258, 96], [-240, 90], [-222, 98], [-206, 110], [-208, 126], [-222, 134], [-232, 142], [-248, 138], [-266, 144], [-286, 138], [-300, 128]], tone: 'gold', seed: 73},
  // under the east maple: a lower, longer tongue that runs back toward the stair's east bank
  {p: [[222, 104], [232, 90], [252, 84], [274, 88], [296, 80], [316, 90], [326, 104], [322, 118], [308, 128], [292, 126], [284, 134], [266, 124], [248, 130], [232, 124]], tone: 'gold', seed: 74},
];
/** The clusters, for the measuring and checking scripts. */
const PIECES = {MOUNTAIN, BANKS};
export {PIECES};

export function yamashina() {
  return [
    // Layer 0: the mountain, the banks beside the stair, and the stair.
    ...mountain('mountain', MOUNTAIN),
    ...tongues('bank', BANKS),
    ...stoneSteps('climb', 20, 42, 211, 36, 73, 12),
    // Gold grass where the slope meets the stair's two edges: the steps come up out of the earth.
    ...grassTufts('climb-grass-west', [[-30, 90, 10, 4], [-45, 150, 10, 4], [-56, 200, 10, 4]], {on: 'climb', seed: 4}),
    ...grassTufts('climb-grass-east', [[70, 90, 10, 4], [85, 150, 10, 4], [96, 200, 10, 4]], {on: 'climb', seed: 5}),
    ...fallenLeaves('west-leaves', -236, 150, 92, 52, 16, 3),
    ...fallenLeaves('east-leaves', 252, 132, 84, 50, 14, 8),
    ...suyari('mist-west', -340, -163, -169, 13, 4),
    ...suyari('mist-east', 167, 339, -117, 12, 9),
    ...hall('honden', 20, -122, 112, 43, {wallH: 31}),
    ...sanmon('sanmon', 20, 40, 73),
    ...lantern('west-lantern', -114, 151, .9),
    ...lantern('east-lantern', 154, 151, .9),
    ...maple('west-maple', -252, 113, 135, 10, 2),
    ...maple('east-maple', 274, 89, 111, -8, 9),
    ...rock('west-stone', -231, 185, 27, 20, 5),
    ...rock('east-stone', 272, 178, 24, 18, 7, {mat: MAT.kirigin}),
    ...bird('uguisu', [[-220.07, 46.60, 1, 'west-maple', 12], [302.47, 33.39, -1, 'east-maple', 12]]),
  ];
}
