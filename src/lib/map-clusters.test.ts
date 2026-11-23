import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMapClusters } from './map-clusters';
import type { FlatSpot } from '../types';
import { AREA_CENTERS, SPOT_POSITIONS } from '../data/map-centers';
import { AREA_NAMES } from '../data/areas';
import { DEFAULT_MUNICIPALITY } from '../data/municipalities';

function makeSpot(overrides: Partial<FlatSpot> & Pick<FlatSpot, 'id' | 'wardId' | 'areaId'>): FlatSpot {
  return {
    typeId: 'T_TEMPLE',
    name: overrides.id,
    desc: '',
    tags: '',
    ...overrides,
  };
}

test('returns an empty list when given no spots', () => {
  assert.deepEqual(buildMapClusters([], id => id), []);
});

test('groups Kyoto spots by areaId at the area centre in [lat, lng] order without mutating inputs', () => {
  const spots: FlatSpot[] = [
    makeSpot({ id: 'NK-001', wardId: 'W_NAKAGYO', areaId: 'A01', name: '烏丸' }),
    makeSpot({ id: 'SG-001', wardId: 'W_SHIMOGYO', areaId: 'A01', municipalityId: DEFAULT_MUNICIPALITY, name: '四条' }),
    makeSpot({ id: 'HY-003', wardId: 'W_HIGASHIYAMA', areaId: 'A05', name: '清水寺' }),
    // Kyoto landmark present in SPOT_POSITIONS still clusters on its area centre, not its spot coordinate.
    makeSpot({ id: 'NS-006', wardId: 'W_NISHIKYO', areaId: 'A10', name: '桂離宮' }),
  ];
  const snapshot = JSON.stringify(spots);

  const clusters = buildMapClusters(spots, id => AREA_NAMES[id].zh);

  assert.equal(JSON.stringify(spots), snapshot);
  assert.deepEqual(clusters.map(c => c.key), ['A01', 'A05', 'A10']);

  const a01 = clusters[0];
  assert.equal(a01.nearby, false);
  assert.equal(a01.label, AREA_NAMES.A01.zh);
  assert.deepEqual(a01.pos, [AREA_CENTERS.A01.lat, AREA_CENTERS.A01.lng]);
  assert.deepEqual(a01.spots.map(s => s.id), ['NK-001', 'SG-001']);

  const a10 = clusters[2];
  assert.equal(a10.nearby, false);
  assert.deepEqual(a10.pos, [AREA_CENTERS.A10.lat, AREA_CENTERS.A10.lng]);
});

test('separates nearby municipality spots onto their own surveyed coordinates instead of inheriting an area centre', () => {
  const spots: FlatSpot[] = [
    makeSpot({ id: 'NS-012', wardId: 'W_NISHIKYO', areaId: 'A19', name: '勝持寺' }),
    makeSpot({ id: 'NS-034', wardId: 'W_NISHIKYO', areaId: 'A19', municipalityId: 'M_MUKO', name: '向日神社' }),
    makeSpot({ id: 'NS-040', wardId: 'W_NISHIKYO', areaId: 'A19', municipalityId: 'M_NAGAOKAKYO', name: '楊谷寺' }),
    makeSpot({ id: 'NS-065', wardId: 'W_NISHIKYO', areaId: 'A19', municipalityId: 'M_NAGAOKAKYO', name: '長岡天満宮' }),
  ];
  const labeledAreas: string[] = [];

  const clusters = buildMapClusters(spots, id => {
    labeledAreas.push(id);
    return AREA_NAMES[id].zh;
  });

  // Nearby clusters use spot.name directly and never invoke areaLabel.
  assert.deepEqual(labeledAreas, ['A19']);
  assert.deepEqual(clusters.map(c => c.key), ['A19', 'spot:NS-034', 'spot:NS-040', 'spot:NS-065']);

  const [kyoto, muko, nagaoka1, nagaoka2] = clusters;
  assert.equal(kyoto.nearby, false);
  assert.deepEqual(kyoto.pos, [AREA_CENTERS.A19.lat, AREA_CENTERS.A19.lng]);
  assert.deepEqual(kyoto.spots.map(s => s.id), ['NS-012']);

  for (const [cluster, id, name] of [
    [muko, 'NS-034', '向日神社'],
    [nagaoka1, 'NS-040', '楊谷寺'],
    [nagaoka2, 'NS-065', '長岡天満宮'],
  ] as const) {
    assert.equal(cluster.nearby, true);
    assert.equal(cluster.label, name);
    assert.equal(cluster.spots.length, 1);
    assert.deepEqual(cluster.pos, [SPOT_POSITIONS[id].lat, SPOT_POSITIONS[id].lng]);
  }
});

test('throws when a nearby spot has no surveyed position, an area centre is unknown, or a municipality is unregistered', () => {
  assert.throws(
    () => buildMapClusters([makeSpot({ id: 'NS-999', wardId: 'W_NISHIKYO', areaId: 'A19', municipalityId: 'M_MUKO' })], id => id),
    /Nearby spot requires verified coordinates: NS-999/,
  );
  assert.throws(
    () => buildMapClusters([makeSpot({ id: 'XX-001', wardId: 'W_NISHIKYO', areaId: 'A99' })], id => id),
    /Unknown area centre: A99/,
  );
  assert.throws(
    () => buildMapClusters([makeSpot({ id: 'XX-002', wardId: 'W_NISHIKYO', areaId: 'A19', municipalityId: 'M_UNKNOWN' })], id => id),
    /Unknown municipality: M_UNKNOWN/,
  );
});
