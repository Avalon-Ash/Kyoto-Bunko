// A ceremonial enclosure around a white court: the broad hall is its head and low galleries its open arms.
// Blossom and citrus face across the court; the bare outer rim and open entrance keep the enclosure breathing.
// There is no ground laid outside the galleries (no shore, no bank, no mountain): the court is already a floor of silver, and the Gosho is
// meant to be flat and still. Outside the galleries is bare lacquer and nashiji, and three bands of mist (behind the hall, left and right).
import {MAT, hall, sandGarden, corridor, branchCourtTree as courtTree, petals, fruits, branchPine as pine, bird, rock, suyari, grassTufts} from './vocab.js';

/** No pieces of ground in this ward, for the measuring and checking scripts. */
const PIECES = {};
export {PIECES};

export function kamigyo() {
  return [
    ...sandGarden('nantei', -154, 154, -37, 142, {raked: false, mat: MAT.silver}),
    ...suyari('mist-west', -338, -185, -199, 12, 3),
    ...suyari('mist-back', -118, 122, -183, 12, 5),
    ...suyari('mist-east', 157, 337, -177, 13, 8),
    ...rock('west-stone', -320, 159, 18, 15, 6),
    ...rock('east-stone', 308, 162, 21, 16, 2, {mat: MAT.kirigin}),
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
    ...pine('west-pine', -292, -84, 99, 12, 2, {clusters: 3}),
    ...pine('east-pine', 285, -83, 99, -12, 6, {clusters: 3}),
    ...bird('uguisu', [[-271.56, -124.28, 1, 'west-pine', 10], [-65.08, 27.28, -1, 'sakon-sakura', 12]]),
  ];
}
