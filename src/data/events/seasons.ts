/** Months in season order. Winter starts in December of the named year. */
export const SEASON_MONTHS = {
  spring: [3, 4, 5],
  summer: [6, 7, 8],
  autumn: [9, 10, 11],
  winter: [12, 1, 2],
} as const;

export type Season = keyof typeof SEASON_MONTHS;
export const CALENDAR_MONTHS: readonly number[] = Object.values(SEASON_MONTHS).flat().sort((a, b) => a - b);
