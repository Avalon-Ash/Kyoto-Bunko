import type { FlatSpot } from '../types';
import { AREA_CENTERS, SPOT_POSITIONS } from '../data/map-centers';
import { getSpotLocation } from '../data/municipalities';

/**
 * Nearby municipalities never inherit a Kyoto area-center position.
 * Only verified positions are drawn: an area cluster sits on its area centre, a nearby spot on its own
 * surveyed point. No spot is scattered around a centre, which would look precise and be invented.
 */
export function buildMapClusters(spots: FlatSpot[], areaLabel: (id: string) => string) {
  const groups = new Map<string, FlatSpot[]>();
  for (const spot of spots) {
    const key = getSpotLocation(spot).isNearby ? `spot:${spot.id}` : spot.areaId;
    groups.set(key, [...(groups.get(key) ?? []), spot]);
  }
  return [...groups].map(([key, entries]) => {
    const first = entries[0];
    const nearby = getSpotLocation(first).isNearby;
    const position = nearby ? SPOT_POSITIONS[first.id] : AREA_CENTERS[first.areaId];
    if (!position) throw new Error(nearby
      ? `Nearby spot requires verified coordinates: ${first.id}`
      : `Unknown area centre: ${first.areaId}`);
    return { key, spots: entries, label: nearby ? first.name : areaLabel(first.areaId),
      pos: [position.lat, position.lng] as [number, number], nearby };
  });
}
