import { WARD_NAMES } from '../../data/wards';
import { WARD_KEY_LIST } from '../../lib/ward-keys';
import { computeWardStats } from '../../data/spots-loader';
import { MAKIE_LANDMARKS } from '../../lib/makie-scene';
import type { Lang, WardKey } from '../../types';
import { LANDMARK_STUDIES } from './landmarks.js';

/** Initial cabinet shown on both the home entrance and the standalone study page. */
export const DEFAULT_CABINET: WardKey = 'W_MINAMI';

const counts = computeWardStats();
export const CABINETS = WARD_KEY_LIST.map(id => {
  const landmark = MAKIE_LANDMARKS.find(item => item.wardId === id);
  if (!landmark) throw new Error(`Missing cabinet landmark: ${id}`);
  return { id, names: WARD_NAMES[id], count: counts[id], landmark, relief: Object.hasOwn(LANDMARK_STUDIES,id) };
});

export function cabinetFor(id: string) {
  const cabinet = CABINETS.find(item => item.id === id);
  if (!cabinet) throw new Error(`Unknown cabinet: ${id}`);
  return cabinet;
}

/** Collection order follows the existing eleven-ward index, not geographic distance. */
export function adjacentCabinet(id: string, direction: number) {
  const index = CABINETS.indexOf(cabinetFor(id));
  return CABINETS[(index + Math.sign(direction) + CABINETS.length) % CABINETS.length];
}

export function volumeTitle(id: string, lang: Lang) {
  return cabinetFor(id).names[lang].replace(/[區区]$/, '') + (lang === 'zh' ? '之卷' : 'の巻');
}
