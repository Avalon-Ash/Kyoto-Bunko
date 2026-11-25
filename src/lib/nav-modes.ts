/**
 * The home page's navigation modes: the one place they are listed (seasonal plan §9–§10, user 2026-11-25).
 * `useKyotoEngine` types its state from `NavMode`; `HomeView` draws one button per row, in this order, with the label's i18n key.
 * A new mode is one row here (and its view); nothing else repeats the set.
 */
export const NAV_MODES = [
  ['ward', 'mode_bunko'],
  ['area', 'mode_area'],
  ['tag', 'mode_tag'],
] as const;

export type NavMode = typeof NAV_MODES[number][0];

/** The mode the app opens in and resets to. */
export const DEFAULT_NAV_MODE: NavMode = NAV_MODES[0][0];
