// A ceremonial enclosure around a white court: the broad hall is its head and low galleries its open arms.
// Blossom and citrus face across the court; the bare outer rim and open entrance keep the enclosure breathing.
// There is no ground laid outside the galleries (no shore, no bank, no mountain): the court is already a floor of silver, and the Gosho is
// meant to be flat and still. Outside the galleries is bare lacquer and nashiji, and three bands of mist (behind the hall, left and right).
import {MAT, hall, sandGarden, corridor, branchCourtTree as courtTree, petals, fruits, branchPine as pine, bird, suyari, grassTufts} from './vocab.js';
import {crags} from './crag-mesh.js';

// Rocks (docs/plans/2026-11-16-doha.md §15.1, §18.1): the crag, the same upright sharp cluster as Fushimi and Nakagyo. A cluster is one large
// crag of three or four blocks (a ridge each: [dx, dz, height, radius]; a block listed later lies in front of the one before), one small crag
// beside it, fine grain lines, flat pebbles at the foot, and on a few of them a small group of cut-gold squares. Everything is relative to
// (x, z). on: what it stands against; why: the reason it is there.
export const ROCKS = [
  // outside the west end of the south range: one blunt high crown, a lower shoulder on each side of unequal length, a small gold stone at the gallery's side
  {id: 'south-west-end', x: -320, z: 159, scale: .95,
    crags: [
      {seed: 6, blocks: [
        {mat: 'olive', ridge: [[-6, -4, 13, 6.5], [0, -7, 19, 6.5], [6, -4, 14, 5.5]], strata: {ang: .7, period: 4.2, amp: .6, w: 1.1}},
        {mat: 'gold', ridge: [[-16, 1, 8, 5], [-11, 0, 10, 4.5]], strata: {ang: -.6, period: 3.6, amp: .45, w: 1}},
        {mat: 'silver', ridge: [[8, 3, 9, 5], [14, 2, 7, 4]], q: .85},
        {mat: 'olive', ridge: [[-4, 4, 7, 5], [3, 5, 6, 4.5]]},
      ], grooves: [{p: [[1, -9], [1, -3], [2, 3]], w: 2.4, depth: 3}]},
      {at: [24, 7], blocks: [{mat: 'gold', ridge: [[0, 0, 6, 4], [3, 1, 4.5, 3.2]]}]},
    ],
    lines: [[[0, -7], [-1, -2], [-3, 3], [-5, 6]], [[5, -5], [7, 0], [8, 4]], [[-8, -3], [-11, 1], [-13, 4]], [[10, 3], [12, 6]], [[-3, 5], [1, 7], [5, 6]]],
    kiri: [{at: [-8, -2], cols: 2, rows: 2, turn: .2}],
    pebbles: [[-19, 8, 3, 1.8, .8, .2, 'silver'], [5, 11, 3.2, 1.9, .8, -.2, 'olive'], [16, 9, 2.2, 1.5, .6, .3, 'silver']],
    on: 'the outside of the west end of the south range, in the bare rim', why: 'the stone a long wall ends on: the gallery is closed at its end by a stone, and the stone is all the ground this ward lays outside it'},
  // outside the east end of the south range: a pale silver spine that climbs from the right to one thin spire, with a gold step and a low back crown
  {id: 'south-east-end', x: 308, z: 162, scale: .95,
    crags: [
      {seed: 2, blocks: [
        {mat: 'olive', ridge: [[-12, -6, 12, 5.5], [-6, -8, 14, 5.5]], strata: {ang: 1.0, period: 4, amp: .55, w: 1}},
        {mat: 'silver', ridge: [[-1, -3, 11, 6], [5, -6, 17, 5.2], [9, -9, 22, 4.6]], q: .9},
        {mat: 'gold', ridge: [[-12, 3, 7, 5], [-4, 5, 9, 5]], strata: {ang: .1, period: 3.4, amp: .45, w: 1}},
        {mat: 'silver', ridge: [[8, 2, 7, 4.5], [14, 1, 5, 3.5]], q: .8},
      ], grooves: [{p: [[6, -11], [5, -4], [6, 2]], w: 2, depth: 2.8}]},
    ],
    lines: [[[9, -9], [8, -4], [7, 1], [6, 5]], [[3, -6], [2, -1], [0, 4]], [[-10, -6], [-12, -1], [-14, 3]], [[-5, 5], [-1, 7], [4, 7]], [[14, 1], [15, 4]]],
    pebbles: [[-19, 8, 3.2, 1.9, .8, .2, 'silver'], [0, 12, 2.4, 1.6, .7, -.3, 'olive'], [14, 9, 3, 1.8, .8, .1, 'silver'], [21, 2, 2, 1.4, .6, 0, 'silver']],
    on: 'the outside of the east end of the south range, in the bare rim', why: 'the pair to the west stone: the two stones mark the two ends of the wall'},
];

/** No pieces of ground in this ward, for the measuring and checking scripts. */
const PIECES = {};
export {PIECES};

export function kamigyo() {
  return [
    ...sandGarden('nantei', -154, 154, -37, 142, {raked: false, mat: MAT.silver}),
    ...suyari('mist-west', -338, -185, -199, 12, 3),
    ...suyari('mist-back', -118, 122, -183, 12, 5),
    ...suyari('mist-east', 157, 337, -177, 13, 8),
    ...crags(ROCKS),
    ...hall('shishinden', 0, -106, 153, 59, {wallH: 38, bays: 9}),
    ...corridor('west-gallery', -293, -181, 44, {height: 27}),
    ...corridor('east-gallery', 181, 293, 44, {height: 27}),
    // The south range is one wall: two galleries and the gate between them, standing on one line.
    ...corridor('south-west', -264, -50, 167, {height: 22, group: 'south', rigidGroup: true}),
    ...corridor('jomei-mon', -50, 50, 167, {height: 36, group: 'south', order: 2}),
    ...corridor('south-east', 50, 264, 167, {height: 22, group: 'south'}),
    ...petals('sakura-fall', -86, 96, 56, 26, 18, 4),
    ...fruits('tachibana-fall', 94, 92, 40, 16, 7, 9),
    ...courtTree('sakon-sakura', -91, 73, 89),
    ...courtTree('ukon-tachibana', 91, 73, 79, {citrus: true}),
    // Short gold grass at the foot of each pine: only outside the white court is there any, which keeps the court bare.
    ...grassTufts('west-pine-grass', [[-318, -77, 14, 5], [-264, -76, 14, 5]], {on: 'west-pine', seed: 2}),
    ...grassTufts('east-pine-grass', [[258, -76, 14, 5], [314, -76, 14, 5]], {on: 'east-pine', seed: 3}),
    ...pine('west-pine', -292, -84, 99, 12, 2),
    ...pine('east-pine', 285, -83, 99, -12, 6),
    ...bird('uguisu', [[-271.56, -124.28, 1, 'west-pine', 10], [-65.08, 27.28, -1, 'sakon-sakura', 12]]),
  ];
}
