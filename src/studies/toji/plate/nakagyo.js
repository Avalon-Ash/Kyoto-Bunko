// Six modest roofs descend in a goose-flight staircase, each with its own clear interval; there is no keep.
// The cusped gate anchors the open left court, while the masonry and moat underline the entire procession.
// The ground is suhama (doha.js): tongues of gold and silver, laid one beside and over another, each hall on its own. Every
// outline is written here, point by point, round the piece (x, z from its centre `at`). Four clusters: the staircase of halls,
// the forecourt of the gate, the east pine, the west pine. A few rocks, each against something: see ROCKS.
import {MAT, hall, karamon, moatWall, branchPine as pine, bird, rock, suyari} from './vocab.js';
import {tongues} from './doha.js';

// The ground is one shore (岸) along the moat and the stone wall, laid as a gold bank over a thin silver ribbon over a front gold
// bank, with a long gold arm up the east side to the pine. Their outlines are the scalloped waves of a Shioyama-style suhama: a
// run of round lobes with sharp coves between. The halls rise out of mist (suyari), not out of pieces of ground.
// Listed far to near; kiri: [from, to], a string of cut gold along the outline between those fractions of its length.
const SHORE = [
  // silver: a thin ribbon sandwiched between the two gold banks; only a hand's breadth of it shows
  {p: [[-358,172],[-300,170],[-240,173],[-170,171],[-90,173],[0,171],[90,172],[180,171],[260,173],[330,171],[358,174],[358,198],[300,201],[220,199],[130,201],[40,199],[-50,201],[-140,199],[-230,201],[-310,199],[-358,198]], tone: 'silver', seed: 51},
  // the long gold bank: its upper edge scalloped, a lobe at the left that rises to the west pine, its lower edge in gentler waves
  {p: [[-352,180],[-338,184],[-320,187],[-302,185],[-288,180],[-269,187],[-244,189],[-219,186],[-200,180],[-185,183],[-165,186],[-145,185],[-130,180],[-109,185],[-82,188],[-55,185],[-34,180],[-18,186],[2,187],[22,184],[38,180],[56,185],[80,189],[104,187],[122,180],[137,184],[155,186],[173,184],[188,180],[205,186],[227,188],[249,185],[266,181],[284,184],[310,187],[334,185],[352,181],[358,168],[352,152],[334,158],[322,166],[309,159],[292,154],[275,154],[262,163],[247,153],[227,148],[207,152],[192,159],[179,151],[163,146],[147,148],[134,156],[116,144],[94,139],[72,144],[54,151],[39,142],[21,136],[3,137],[-12,147],[-23,139],[-36,135],[-49,138],[-60,145],[-76,132],[-97,127],[-118,133],[-134,140],[-148,132],[-165,126],[-182,127],[-196,137],[-208,125],[-223,121],[-238,126],[-250,134],[-258,112],[-266,92],[-280,68],[-304,52],[-330,56],[-348,76],[-356,110],[-357,150]], tone: 'gold', seed: 52, kiri: [.52, .62]},
  // the front gold bank at the water: low waves, its lower edge under the stone wall
  {p: [[-352,197],[-339,194],[-323,192],[-307,193],[-294,197],[-278,192],[-257,191],[-236,193],[-220,197],[-206,194],[-189,192],[-172,193],[-158,197],[-139,193],[-115,191],[-91,193],[-72,197],[-57,193],[-39,192],[-21,194],[-6,197],[9,194],[29,191],[49,192],[64,197],[77,193],[94,192],[111,193],[124,197],[140,192],[160,191],[180,193],[196,197],[207,194],[222,192],[237,193],[248,196],[262,192],[284,193],[300,197],[322,192],[340,193],[352,196],[353,204],[200,205],[0,204],[-200,205],[-353,204]], tone: 'gold', seed: 53},
  // the east arm: a long gold bank up the right side to the foot of the east pine, its left edge scalloped
  {p: [[356,170],[358,120],[357,60],[354,10],[346,-30],[334,-62],[322,-90],[302,-108],[276,-114],[252,-108],[238,-92],[234,-72],[238,-62],[246,-44],[252,-22],[250,0],[242,18],[236,30],[240,42],[250,58],[256,80],[254,100],[246,114],[242,120],[248,132],[262,146],[270,160],[274,172],[300,176],[330,176]], tone: 'gold', seed: 54, kiri: [.34, .5]},
];

// Rocks: each against something it belongs to, on the shore. Outline and peaks are relative to (x, z); w, h its half extents.
// on: what it stands against; why: the reason it is there. A pair is one large angular stone and a small round one beside it.
export const ROCKS = [
  // the east pine's roots: the large stone, jagged, one tall summit and two shoulders
  {id: 'east-pine', x: 258, z: -66, w: 23, h: 11, seed: 4, height: 15,
    outline: [[-22,6],[-19,-2],[-14,-4],[-12,-10],[-5,-9],[-1,-15],[5,-10],[9,-12],[14,-5],[21,-3],[23,5],[12,9],[-4,7],[-14,10]],
    peaks: [{x: 0, z: -6, rx: 11, rz: 9, h: 1}, {x: -14, z: 0, rx: 7, rz: 6, h: .5}, {x: 15, z: -1, rx: 8, rz: 6, h: .4}],
    lines: [[[0,-9],[-2,-3],[-6,3],[-9,8]], [[2,-8],[4,-2],[8,4],[10,7]], [[-8,-6],[-12,-1],[-16,4]], [[9,-7],[14,-3],[18,1]]],
    on: 'the roots of the east pine, on the east arm of the shore', why: 'the pine grips a stone; the stone is what holds its foot'},
  {id: 'east-pine-s', silver: true, x: 226, z: -56, w: 9, h: 6, seed: 3, height: 4,
    outline: [[-9,1],[-7,-5],[-1,-6],[2,-3],[8,-4],[9,3],[2,6],[-5,5]],
    peaks: [{x: -2, z: -1, rx: 9, rz: 6, h: 1}],
    lines: [[[-2,-3],[0,1],[1,4]]],
    on: 'beside the large stone, at the pine', why: 'the small one of the pair: a chip fallen from the large'},
  // the west pine: one tall thin stone leaning at its trunk, and a flat pebble
  {id: 'west-pine', silver: true, x: -284, z: 76, w: 15, h: 9, seed: 6, height: 15,
    outline: [[-9,4],[-10,-3],[-6,-8],[-3,-16],[1,-12],[5,-18],[8,-9],[10,-2],[9,5],[2,9],[-5,8]],
    peaks: [{x: 2, z: -10, rx: 8, rz: 12, h: 1}, {x: -5, z: -1, rx: 6, rz: 6, h: .5}],
    lines: [[[2,-12],[1,-4],[0,3],[-2,8]], [[5,-13],[6,-5],[8,2]], [[-3,-10],[-6,-4],[-8,2]]],
    on: 'the roots of the west pine, on the left lobe of the shore', why: 'a tall thin stone leaning at the pine, as a lantern stone stands by an old tree'},
  {id: 'west-pine-s', x: -308, z: 82, w: 13, h: 5, seed: 8, height: 3,
    outline: [[-13,2],[-9,-3],[0,-4],[10,-2],[13,1],[5,4],[-6,4]],
    peaks: [{x: -1, z: 0, rx: 13, rz: 4, h: 1}],
    lines: [[[-2,-2],[0,1],[1,3]]],
    on: 'beside the tall stone, at the pine', why: 'the small one of the pair'},
  // the foot of the cusped gate, its east side: split into two crowns
  {id: 'karamon-foot', x: -86, z: 179, w: 15, h: 9, seed: 9, height: 11,
    outline: [[-14,3],[-12,-5],[-6,-9],[-2,-3],[1,-3],[4,-10],[10,-9],[14,-3],[15,3],[9,7],[1,6],[-7,8]],
    peaks: [{x: -7, z: -3, rx: 7, rz: 6, h: .8}, {x: 9, z: -5, rx: 7, rz: 6, h: 1}],
    lines: [[[-7,-5],[-8,0],[-11,5]], [[-5,-4],[-2,1],[0,6]], [[9,-7],[11,-2],[13,3]], [[7,-6],[5,-1],[6,5]]],
    on: 'the footing of the cusped gate, at its east side, on the bank', why: 'the gate foot is steadied by a stone, the way a garden gate has one'},
];
/** The clusters, for the measuring and checking scripts. */
const PIECES = {SHORE};
export {PIECES};

export function nakagyo() {
  const rooms = [[-248, -172, 62], [-161, -110, 64], [-74, -48, 66], [13, 14, 62], [100, 76, 58], [187, 138, 58]];
  return [
    ...tongues('shore', SHORE),
    // The halls rise out of the mist: two bands across the staircase, one among the far halls, one among the near.
    ...suyari('mist-court', -205, 15, -212, 11, 8),
    ...suyari('mist-far', -358, 40, -118, 13, 3),
    ...suyari('mist-near', -90, 358, 62, 13, 5),
    ...moatWall('ishigaki', -333, 333, 201, 218, 232),
    ...ROCKS.flatMap(({id, x, z, w, h, seed, outline, peaks, height, lines, foil, silver}) =>
      rock(`rock-${id}`, x, z, w, h, seed, {outline, peaks, height, lines, foil, mat: silver ? MAT.rockSilver : MAT.rockGold})),
    ...rooms.flatMap(([x, z, w], i) => hall(`ninomaru-${i}`, x, z, w, 22, {wallH: 22, bays: 5})),
    ...karamon('karamon', -172, 184, 69),
    ...pine('west-pine', -305, 62, 99, 12, 2, {clusters: 3}),
    ...pine('east-pine', 282, -79, 112, -12, 6, {clusters: 3}),
    ...bird('uguisu', [[-284.56, 21.72, 1, 'west-pine', 10], [261.10, -125.00, -1, 'east-pine', 10]]),
  ];
}
