import { SEASON_MONTHS, type Season } from '../data/events/seasons';
import { STATUS_RULES } from '../data/events/types';
import type { ClockTime, EventOccurrence, EventSession, IsoDate } from '../data/events/types';

/** Days after checkedOn before a source record is flagged stale (user decision 2026-11-25). */
export const STALE_AFTER_DAYS = 90;

const TOKYO_TIME_ZONE = 'Asia/Tokyo';
const MS_PER_DAY = 86_400_000;
const ISO_YEAR_DIGITS = 4;
const ISO_MONTH_DAY_DIGITS = 2;
const ISO_MONTH_LENGTH = ISO_YEAR_DIGITS + '-'.length + ISO_MONTH_DAY_DIGITS;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const TOKYO_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: TOKYO_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export type RangeErrorCode = 'invalid-date' | 'end-before-start';

export interface DateRange {
  from: IsoDate;
  to: IsoDate;
}

export interface SeasonalItem {
  id: string;
  usualMonths: readonly number[];
  occurrences: readonly EventOccurrence[];
}

export interface SeasonalQueryMatch<T extends SeasonalItem = SeasonalItem> {
  event: T;
  occurrence: EventOccurrence;
  dates: IsoDate[];
  fullPeriod?: DateRange;
}

interface MatchedDates {
  dates: IsoDate[];
  firstOpen: ClockTime | null;
}

interface SortableMatch<T extends SeasonalItem> {
  match: SeasonalQueryMatch<T>;
  firstOpen: ClockTime | null;
  sortDate?: IsoDate;
}

/** UTC midnight is used for arithmetic on Tokyo calendar dates. */
export function parseIsoDay(date: IsoDate): Date | undefined {
  if (!ISO_DAY.test(date)) return undefined;
  const day = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, date.length) !== date) return undefined;
  return day;
}

export function earliestSessionStart(sessions: readonly EventSession[]): Date | undefined {
  let earliest: Date | undefined;
  for (const { start } of sessions) {
    const day = parseIsoDay(start);
    if (day && (!earliest || day < earliest)) earliest = day;
  }
  return earliest;
}

/** Shared expansion for validation and date queries. */
export function* iterateSessionDates({ start, end, weekdays, except }: EventSession): Generator<IsoDate> {
  const day = parseIsoDay(start);
  const last = parseIsoDay(end);
  if (!day || !last || weekdays?.length === 0) return;
  const excluded = new Set(except);
  for (; day <= last; day.setUTCDate(day.getUTCDate() + 1)) {
    if (weekdays && !weekdays.includes(day.getUTCDay())) continue;
    const date = day.toISOString().slice(0, start.length);
    if (!excluded.has(date)) yield date;
  }
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
export function seasonBounds(year: number, season: Season): DateRange {
  const slots = seasonSlots(year, season);
  const first = slots[0];
  const last = slots[slots.length - 1];
  const lastDay = new Date(Date.UTC(last.year, last.month, 0)).getUTCDate();
  return {
    from: formatYearMonthDay(first.year, first.month, 1),
    to: formatYearMonthDay(last.year, last.month, lastDay),
  };
}

function collectOccurrenceDates(occurrence: EventOccurrence, range?: DateRange): MatchedDates {
  const openByDate = new Map<IsoDate, ClockTime | null>();
  for (const session of occurrence.sessions) {
    if (range && (session.start > range.to || session.end < range.from)) continue;
    const open = session.hours?.open ?? null;
    for (const date of iterateSessionDates(session)) {
      if (range && (date < range.from || date > range.to)) continue;
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

function clippedFullPeriod(occurrence: EventOccurrence, { from, to }: DateRange): DateRange | undefined {
  if (!occurrence.sessions.some(session => session.start < from || session.end > to)) return undefined;
  const { dates } = collectOccurrenceDates(occurrence);
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (first < from || last > to) return { from: first, to: last };
}

function compareMatches<T extends SeasonalItem>(a: SortableMatch<T>, b: SortableMatch<T>): number {
  const aDate = a.match.dates[0] ?? a.sortDate;
  const bDate = b.match.dates[0] ?? b.sortDate;
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
  if (a.match.event.id !== b.match.event.id) {
    return a.match.event.id < b.match.event.id ? -1 : 1;
  }
  return a.match.occurrence.year - b.match.occurrence.year;
}

function sortMatches<T extends SeasonalItem>(matches: SortableMatch<T>[]): SeasonalQueryMatch<T>[] {
  return matches.sort(compareMatches).map(entry => entry.match);
}

/** Calendar day in Asia/Tokyo for the given instant. */
export function tokyoToday(now: Date): IsoDate {
  const parts = TOKYO_DATE_FORMAT.formatToParts(now);
  const year = (parts.find(part => part.type === 'year')?.value ?? '').padStart(ISO_YEAR_DIGITS, '0');
  const month = parts.find(part => part.type === 'month')?.value ?? '';
  const day = parts.find(part => part.type === 'day')?.value ?? '';
  return `${year}-${month}-${day}`;
}

/** Select the current or nearest later catalog year, falling back to the latest recorded year. */
export function selectCatalogYear(today: IsoDate, availableYears: readonly number[]): number | undefined {
  const year = parseIsoDay(today)?.getUTCFullYear();
  if (year === undefined) return undefined;
  const sorted = [...availableYears].sort((a, b) => a - b);
  return sorted.find(candidate => candidate >= year) ?? sorted.at(-1);
}

/** Return YYYY-MM values whose calendar month overlaps the inclusive window starting today. */
export function usualMonthsInWindow(
  year: number,
  months: readonly number[],
  today: IsoDate,
  daysAhead: number,
): string[] {
  const end = parseIsoDay(today);
  if (!end) return [];
  end.setUTCDate(end.getUTCDate() + daysAhead);
  const from = today.slice(0, ISO_MONTH_LENGTH);
  const to = end.toISOString().slice(0, ISO_MONTH_LENGTH);
  return months
    .map(month => formatYearMonthDay(year, month, 1).slice(0, ISO_MONTH_LENGTH))
    .filter(month => month >= from && month <= to)
    .sort();
}

/** Return YYYY-MM values of the occurrence year's usual months that ended before today's month began. */
export function usualMonthsPassed(year: number, months: readonly number[], today: IsoDate): string[] {
  if (!parseIsoDay(today)) return [];
  const current = today.slice(0, ISO_MONTH_LENGTH);
  return months
    .map(month => formatYearMonthDay(year, month, 1).slice(0, ISO_MONTH_LENGTH))
    .filter(month => month < current)
    .sort();
}

/** Expand a session into actual calendar dates (UTC arithmetic, weekday and exception filters applied). */
export function sessionDates(session: EventSession): IsoDate[] {
  return [...iterateSessionDates(session)];
}

/** Group calendar days into runs of consecutive days, in order (for display: one range instead of each day). */
export function consecutiveRuns(dates: readonly IsoDate[]): DateRange[] {
  const runs: DateRange[] = [];
  for (const date of [...new Set(dates)].sort()) {
    const last = runs.at(-1);
    const day = parseIsoDay(date);
    const previous = last && parseIsoDay(last.to);
    if (last && day && previous && day.getTime() - previous.getTime() === MS_PER_DAY) last.to = date;
    else runs.push({ from: date, to: date });
  }
  return runs;
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
      const { dates, firstOpen } = collectOccurrenceDates(occurrence, { from, to });
      if (!dates.length) continue;
      matched.push({
        match: { event, occurrence, dates },
        firstOpen,
      });
    }
  }

  return sortMatches(matched);
}

/** List occurrences belonging to a named year and season (winter spans Dec of year to Feb of year + 1). */
export function listSeason<T extends SeasonalItem>(
  items: readonly T[],
  year: number,
  season: Season,
): SeasonalQueryMatch<T>[] {
  if (!Number.isInteger(year)) return [];
  const slots = seasonSlots(year, season);
  const range = seasonBounds(year, season);

  const dated: SortableMatch<T>[] = [];
  const undated: SortableMatch<T>[] = [];
  for (const event of items) {
    for (const occurrence of event.occurrences) {
      if (occurrence.sessions.length > 0) {
        const { dates, firstOpen } = collectOccurrenceDates(occurrence, range);
        if (!dates.length) continue;
        const fullPeriod = clippedFullPeriod(occurrence, range);
        const match = { event, occurrence, dates };
        dated.push({ match: fullPeriod ? { ...match, fullPeriod } : match, firstOpen });
        continue;
      }

      const slot = slots.find(slot => slot.year === occurrence.year && event.usualMonths.includes(slot.month));
      if (!slot) continue;
      undated.push({
        match: { event, occurrence, dates: [] },
        firstOpen: null,
        sortDate: formatYearMonthDay(slot.year, slot.month, 1),
      });
    }
  }

  return [...sortMatches(dated), ...sortMatches(undated)];
}

/** List all occurrences filed under the given year, including dates that extend into the next year. */
export function listYear<T extends SeasonalItem>(items: readonly T[], year: number): SeasonalQueryMatch<T>[] {
  if (!Number.isInteger(year)) return [];

  const matched: SortableMatch<T>[] = [];
  for (const event of items) {
    for (const occurrence of event.occurrences) {
      if (occurrence.year !== year) continue;

      const { dates, firstOpen } = collectOccurrenceDates(occurrence);
      let sortDate: IsoDate | undefined;
      if (!occurrence.sessions.length) {
        const [firstMonth] = event.usualMonths;
        if (firstMonth !== undefined) sortDate = formatYearMonthDay(year, firstMonth, 1);
      } else if (!dates.length) {
        const start = earliestSessionStart(occurrence.sessions);
        if (start) sortDate = formatYearMonthDay(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate());
      }
      matched.push({ match: { event, occurrence, dates }, firstOpen, sortDate });
    }
  }

  return sortMatches(matched);
}

/** True when checkedOn is strictly more than STALE_AFTER_DAYS days before today. */
export function isStale(checkedOn: IsoDate, today: IsoDate): boolean {
  const checked = parseIsoDay(checkedOn);
  const current = parseIsoDay(today);
  if (!checked || !current) return false;
  return (current.getTime() - checked.getTime()) / MS_PER_DAY > STALE_AFTER_DAYS;
}
