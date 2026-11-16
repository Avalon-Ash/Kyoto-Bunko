// Six modest roofs descend in a goose-flight staircase, each with its own clear interval; there is no keep.
// The cusped gate anchors the open left court, while the masonry and moat underline the entire procession.
// The ground is suhama (doha.js): tongues of gold and silver, laid one beside and over another, each hall on its own. Every
// outline is written here, point by point, round the piece (x, z from its centre `at`). Four clusters: the staircase of halls,
// the forecourt of the gate, the east pine, the west pine. A few rocks, each against something: see ROCKS.
import {hall, karamon, moatWall, branchPine as pine, bird, suyari} from './vocab.js';
import {tongues} from './doha.js';
import {meshCrag} from './crag-mesh.js';

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

// Rocks (docs/plans/2026-11-16-doha.md §15.1, §16): each against something it belongs to, on the shore. A cluster is one large crag of
// four lobes (a hand-written outline each, [dx, dz] points round it; h its height; a lobe listed later lies over the one before), one
// small lobe beside it, fine grain lines, flat pebbles at the foot, and on a few of them a small group of cut-gold squares.
// Everything is relative to (x, z). on: what it stands against; why: the reason it is there.
export const ROCKS = [
  // the east pine's roots: one tall crown leaning toward the trunk, a silver shoulder in front on the left, a gold step on the right
  {id: 'east-pine', x: 257, z: -66,
    crags: [
      {lobes: [
        {mat: 'olive', h: 25, d: [[-14, -3], [-12, -10], [-8, -14], [-6, -21], [-1, -18], [3, -22], [7, -15], [10, -11], [14, -7], [11, -1], [5, -2], [-1, 1], [-8, 0]]},
        {mat: 'silver', h: 10, d: [[-22, 2], [-20, -4], [-15, -6], [-12, -1], [-13, 5], [-18, 8], [-23, 7]]},
        {mat: 'gold', h: 11, d: [[6, 0], [10, -4], [16, -5], [20, -1], [19, 5], [13, 8], [7, 6]]},
        {mat: 'olive', h: 7, d: [[-9, 3], [-3, 1], [3, 2], [6, 6], [2, 10], [-5, 10], [-10, 8]]},
      ]},
      {at: [-32, 5], lobes: [{mat: 'silver', h: 4, d: [[-5, -1], [-2, -5], [3, -4], [5, 0], [2, 4], [-3, 4]]}, {mat: 'olive', h: 3, d: [[3, 2], [7, 0], [10, 3], [7, 6]]}]},
    ],
    lines: [[[-3, -17], [-5, -11], [-6, -5], [-7, 0]], [[3, -17], [4, -11], [4, -5]], [[11, -9], [12, -4], [12, 1]], [[-17, -1], [-18, 4]], [[8, 2], [13, 2], [17, 0]]],
    pebbles: [[-18, 12, 3.2, 1.9, .8, .2, 'silver'], [4, 14, 2.4, 1.6, .7, -.2, 'olive'], [20, 11, 3, 1.8, .7, .3, 'silver']],
    on: 'the roots of the east pine, on the east arm of the shore', why: 'the pine grips a stone; the stone is what holds its foot'},
  // the west pine: a tall thin leaning stone with a broad shoulder at each side
  {id: 'west-pine', x: -279, z: 74,
    crags: [
      {lobes: [
        {mat: 'gold', h: 28, d: [[-6, -4], [-7, -12], [-4, -18], [-3, -26], [1, -22], [4, -27], [7, -19], [6, -11], [9, -6], [6, -1], [0, 0]]},
        {mat: 'silver', h: 9, d: [[-19, 2], [-17, -5], [-12, -7], [-9, -2], [-10, 5], [-15, 8], [-20, 7]]},
        {mat: 'olive', h: 9, d: [[6, 0], [11, -6], [17, -5], [18, 1], [14, 6], [8, 6]]},
        {mat: 'olive', h: 11, d: [[-8, 2], [-2, -1], [5, 0], [8, 4], [4, 9], [-3, 10], [-9, 8]]},
      ]},
      {at: [2, 17], lobes: [{mat: 'olive', h: 3, d: [[-6, -3], [-2, -5], [4, -4], [7, 0], [2, 3], [-4, 2]]}]},
    ],
    lines: [[[1, -23], [0, -17], [-1, -11], [-3, -5]], [[4, -22], [5, -15], [5, -9]], [[-15, -3], [-14, 2], [-14, 6]], [[11, -3], [14, 0], [15, 4]], [[-4, 2], [1, 4], [6, 4]]],
    pebbles: [[-19, 12, 2.6, 1.6, .7, .3, 'silver'], [3, 14, 3.2, 1.8, .8, -.1, 'olive'], [-17, -4, 2, 1.4, .6, 0, 'silver'], [17, 11, 2.2, 1.5, .6, .2, 'silver']],
    on: 'the roots of the west pine, on the left lobe of the shore', why: 'a tall thin stone leaning at the pine, as a lantern stone stands by an old tree'},
  // the foot of the cusped gate, its east side: two crowns, the right one silver and pierced, bridged by a gold step
  {id: 'karamon-foot', x: -86, z: 173,
    crags: [
      {lobes: [
        {mat: 'olive', h: 21, d: [[-24, -2], [-22, -9], [-17, -12], [-13, -18], [-8, -13], [-5, -9], [-4, -3], [-8, 1], [-16, 2]]},
        {mat: 'silver', h: 25, d: [[3, -6], [5, -14], [10, -16], [14, -22], [19, -15], [20, -8], [23, -3], [18, 2], [10, 1]], holes: [[[11, -10], [14, -11], [15, -8], [12, -7]]]},
        {mat: 'gold', h: 9, d: [[-12, 0], [-5, -4], [3, -3], [11, -1], [17, 3], [12, 8], [3, 9], [-6, 8], [-13, 6]]},
        {mat: 'olive', h: 6, d: [[-24, 3], [-19, 1], [-15, 5], [-18, 10], [-24, 9]]},
      ]},
      {at: [-34, 7], lobes: [{mat: 'gold', h: 4, d: [[-4, -2], [0, -5], [4, -3], [4, 2], [0, 4], [-4, 3]]}]},
    ],
    lines: [[[-14, -14], [-13, -8], [-14, -3]], [[-9, -10], [-8, -5]], [[11, -18], [10, -12], [11, -6], [12, -1]], [[18, -11], [20, -5]], [[-6, 2], [0, 3], [8, 3]]],
    kiri: [{at: [-13, -6], cols: 3, rows: 2, turn: .25}],
    pebbles: [[-14, 12, 3, 1.8, .8, .2, 'silver'], [8, 11, 3.4, 2, .8, -.2, 'olive'], [24, 7, 2.2, 1.5, .6, .3, 'silver']],
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
    ...ROCKS.flatMap(({id, x, z, ...spec}) => meshCrag(`rock-${id}`, x, z, spec)),
    ...rooms.flatMap(([x, z, w], i) => hall(`ninomaru-${i}`, x, z, w, 22, {wallH: 22, bays: 5})),
    ...karamon('karamon', -172, 184, 69),
    ...pine('west-pine', -305, 62, 99, 12, 2, {clusters: 3}),
    ...pine('east-pine', 282, -79, 112, -12, 6, {clusters: 3}),
    ...bird('uguisu', [[-284.56, 21.72, 1, 'west-pine', 10], [261.10, -125.00, -1, 'east-pine', 10]]),
  ];
}
