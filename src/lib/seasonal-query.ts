import { SEASON_MONTHS } from '../data/events/seasons';
import type { Season } from '../data/events/seasons';
import { STATUS_RULES } from '../data/events/types';
import type { ClockTime, EventOccurrence, EventSession, IsoDate } from '../data/events/types';
import { iterateSessionDates, parseIsoDay } from './event-checks';


/** Days after checkedOn before a source record is flagged stale (user decision 2026-11-25). */
export const STALE_AFTER_DAYS = 90;

const TOKYO_TIME_ZONE = 'Asia/Tokyo';
const MS_PER_DAY = 86_400_000;
const ISO_YEAR_DIGITS = 4;
const ISO_MONTH_DAY_DIGITS = 2;

const TOKYO_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: TOKYO_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export type RangeErrorCode = 'invalid-date' | 'end-before-start';

export interface SeasonalItem {
  id: string;
  usualMonths: readonly number[];
  occurrences: readonly EventOccurrence[];
}

export interface SeasonalQueryMatch<T extends SeasonalItem = SeasonalItem> {
  event: T;
  occurrence: EventOccurrence;
  dates: IsoDate[];
}

interface MatchedDates {
  dates: IsoDate[];
  firstOpen: ClockTime | null;
}

interface SortableMatch<T extends SeasonalItem> {
  match: SeasonalQueryMatch<T>;
  firstOpen: ClockTime | null;
  seasonSlotIndex: number;
}

function formatYearMonthDay(year: number, month: number, day: number): IsoDate {
  const y = String(year).padStart(ISO_YEAR_DIGITS, '0');
  const m = String(month).padStart(ISO_MONTH_DAY_DIGITS, '0');
  const d = String(day).padStart(ISO_MONTH_DAY_DIGITS, '0');
  return `${y}-${m}-${d}`;
}

function seasonSlots(year: number, season: Season): Array<{ year: number; month: number }> {
  const months = SEASON_MONTHS[season];
  const firstMonth = months[0];
  return months.map(month => ({
    year: month < firstMonth ? year + 1 : year,
    month,
  }));
}

/** Inclusive start and end calendar dates of a season for the given named year. */
export function seasonBounds(year: number, season: Season): { from: IsoDate; to: IsoDate } {
  const slots = seasonSlots(year, season);
  const first = slots[0];
  const last = slots[slots.length - 1];
  const lastDay = new Date(Date.UTC(last.year, last.month, 0)).getUTCDate();
  return {
    from: formatYearMonthDay(first.year, first.month, 1),
    to: formatYearMonthDay(last.year, last.month, lastDay),
  };
}

function collectOccurrenceDates(occurrence: EventOccurrence, from: IsoDate, to: IsoDate): MatchedDates {
  const openByDate = new Map<IsoDate, ClockTime | null>();
  for (const session of occurrence.sessions) {
    if (session.start > to || session.end < from) continue;
    const open = session.hours?.open ?? null;
    for (const date of iterateSessionDates(session)) {
      if (date < from || date > to) continue;
      const current = openByDate.get(date);
      if (current === undefined || (open !== null && (current === null || open < current))) {
        openByDate.set(date, open);
      }
    }
  }
  const dates = [...openByDate.keys()].sort();
  return {
    dates,
    firstOpen: dates.length ? (openByDate.get(dates[0]) ?? null) : null,
  };
}

function compareMatches<T extends SeasonalItem>(a: SortableMatch<T>, b: SortableMatch<T>): number {
  const aDate = a.match.dates[0];
  const bDate = b.match.dates[0];
  if (aDate !== bDate) {
    if (aDate === undefined) return 1;
    if (bDate === undefined) return -1;
    return aDate < bDate ? -1 : 1;
  }
  if (aDate !== undefined && a.firstOpen !== b.firstOpen) {
    if (a.firstOpen === null) return 1;
    if (b.firstOpen === null) return -1;
    return a.firstOpen < b.firstOpen ? -1 : 1;
  }
  if (aDate === undefined && a.seasonSlotIndex !== b.seasonSlotIndex) {
    return a.seasonSlotIndex - b.seasonSlotIndex;
  }
  if (a.match.event.id !== b.match.event.id) {
    return a.match.event.id < b.match.event.id ? -1 : 1;
  }
  return a.match.occurrence.year - b.match.occurrence.year;
}

/** Calendar day in Asia/Tokyo for the given instant. */
export function tokyoToday(now: Date): IsoDate {
  const parts = TOKYO_DATE_FORMAT.formatToParts(now);
  const year = (parts.find(part => part.type === 'year')?.value ?? '').padStart(ISO_YEAR_DIGITS, '0');
  const month = parts.find(part => part.type === 'month')?.value ?? '';
  const day = parts.find(part => part.type === 'day')?.value ?? '';
  return `${year}-${month}-${day}`;
}

/** Expand a session into actual calendar dates (UTC arithmetic, weekday and exception filters applied). */
export function sessionDates(session: EventSession): IsoDate[] {
  return [...iterateSessionDates(session)];
}

/** Validate an inclusive date range against real calendar dates. */
export function validateRange(from: IsoDate, to: IsoDate): RangeErrorCode | null {
  if (!parseIsoDay(from) || !parseIsoDay(to)) return 'invalid-date';
  if (from > to) return 'end-before-start';
  return null;
}

/** Query attendable occurrences overlapping [from, to], ordered by first date then hours.open. */
export function queryRange<T extends SeasonalItem>(
  items: readonly T[],
  from: IsoDate,
  to: IsoDate,
): SeasonalQueryMatch<T>[] {
  if (validateRange(from, to) !== null) return [];

  const matched: SortableMatch<T>[] = [];
  for (const event of items) {
    for (const occurrence of event.occurrences) {
      if (STATUS_RULES[occurrence.status].dateQuery !== 'with-sessions') continue;
      const { dates, firstOpen } = collectOccurrenceDates(occurrence, from, to);
      if (!dates.length) continue;
      matched.push({
        match: { event, occurrence, dates },
        firstOpen,
        seasonSlotIndex: -1,
      });
    }
  }

  matched.sort(compareMatches);
  return matched.map(entry => entry.match);
}

/** List occurrences belonging to a named year and season (winter spans Dec of year to Feb of year + 1). */
export function listSeason<T extends SeasonalItem>(
  items: readonly T[],
  year: number,
  season: Season,
): SeasonalQueryMatch<T>[] {
  if (!Number.isInteger(year)) return [];
  const slots = seasonSlots(year, season);
  const { from, to } = seasonBounds(year, season);

  const matched: SortableMatch<T>[] = [];
  for (const event of items) {
    for (const occurrence of event.occurrences) {
      if (occurrence.sessions.length > 0) {
        const { dates, firstOpen } = collectOccurrenceDates(occurrence, from, to);
        if (!dates.length) continue;
        matched.push({
          match: { event, occurrence, dates },
          firstOpen,
          seasonSlotIndex: -1,
        });
      } else if (STATUS_RULES[occurrence.status].summary === 'usual-months') {
        const seasonSlotIndex = slots.findIndex(
          slot => slot.year === occurrence.year && event.usualMonths.includes(slot.month),
        );
        if (seasonSlotIndex === -1) continue;
        matched.push({
          match: { event, occurrence, dates: [] },
          firstOpen: null,
          seasonSlotIndex,
        });
      }
    }
  }

  matched.sort(compareMatches);
  return matched.map(entry => entry.match);
}

/** True when checkedOn is strictly more than STALE_AFTER_DAYS days before today. */
export function isStale(checkedOn: IsoDate, today: IsoDate): boolean {
  const checked = parseIsoDay(checkedOn);
  const current = parseIsoDay(today);
  if (!checked || !current) return false;
  return (current.getTime() - checked.getTime()) / MS_PER_DAY > STALE_AFTER_DAYS;
}
