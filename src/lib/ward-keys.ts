import { WARD_KEYS } from '../data/wards';
import type { WardKey } from '../types';

// wards.ts is a protected file (ADR 0003) and declares WARD_KEYS as string[]; WardKey is the union in src/types.ts (also
// protected). This is the one place that narrows the list: everything else reads WARD_KEY_LIST or isWardKey.
// scripts/ward-keys.test.mjs checks that every entry of WARD_KEYS is a known ward and that none repeats.

/** WARD_KEYS as WardKey ids, in the same order. */
export const WARD_KEY_LIST = WARD_KEYS as readonly WardKey[];

/** True when id is one of WARD_KEYS. */
export const isWardKey = (id: string): id is WardKey => WARD_KEYS.includes(id);
