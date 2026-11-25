/**
 * The home page's navigation modes: the one place they are listed (seasonal plan §9–§10, user 2026-11-25).
 * `useKyotoEngine` types its state from `NavMode`; `HomeView` draws one button per row, in this order, with the label's i18n key.
 * The third column specifies whether the mode opens a volume.
 */
export const NAV_MODES = [
  ['ward', 'mode_bunko', true],
  ['area', 'mode_area', true],
  ['tag', 'mode_tag', false],
  ['seasonal', 'mode_seasonal', false],
] as const;

export type NavMode = typeof NAV_MODES[number][0];
export type VolumeMode = Extract<typeof NAV_MODES[number], readonly [NavMode, string, true]>[0];

/** The mode the app opens in and resets to. */
export const DEFAULT_NAV_MODE: NavMode = NAV_MODES[0][0];
