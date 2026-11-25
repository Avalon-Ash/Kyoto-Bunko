/** Months in season order. Winter starts in December of the named year. */
export const SEASON_MONTHS = {
  spring: [3, 4, 5],
  summer: [6, 7, 8],
  autumn: [9, 10, 11],
  winter: [12, 1, 2],
} as const;

export type Season = keyof typeof SEASON_MONTHS;
export const SEASONS = Object.keys(SEASON_MONTHS) as Season[];
export const CALENDAR_MONTHS: readonly number[] = Object.values(SEASON_MONTHS).flat().sort((a, b) => a - b);

export function seasonOfMonth(month: number): Season | undefined {
  return SEASONS.find(season =>
    SEASON_MONTHS[season].some(seasonMonth => seasonMonth === month),
  );
}
