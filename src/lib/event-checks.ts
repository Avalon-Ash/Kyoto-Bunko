import { CALENDAR_MONTHS } from '../data/events/seasons';
import { EVENT_KINDS, OCCURRENCE_BASES, STATUS_RULES } from '../data/events/types';
import type { EventLocale, EventOccurrence, EventOccurrencesByYear, EventSchema, EventSession } from '../data/events/types';
import type { Lang } from '../types';
import { earliestSessionStart, iterateSessionDates, parseIsoDay } from './seasonal-query';

export interface EventIssue {
  level: 'ERROR' | 'WARN';
  code: string;
  message: string;
}

interface EventCheckInput {
  catalog: readonly EventSchema[];
  occurrences: EventOccurrencesByYear;
  locales: Readonly<Record<Lang, Readonly<Record<string, EventLocale>>>>;
  spotIds: ReadonlySet<string>;
  wardKeys: readonly string[];
  municipalities: Readonly<Record<string, unknown>>;
}

const EVENT_ID = /^EV-\d{3}$/;
const CLOCK_TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DAYS_PER_WEEK = 7;
const EVENT_FIELDS = {
  id: true, kind: true, venues: true, usualMonths: true, officialUrl: true,
} satisfies Record<keyof EventSchema, true>;
const VENUE_FIELDS = {
  spot: { kind: true, spotId: true },
  ward: { kind: true, wardId: true, municipalityId: true },
};

type ReportIssue = (code: string, message: string) => void;

function checkSession(session: EventSession, label: string, error: ReportIssue, warn: ReportIssue): void {
  const { start, end, weekdays, except, hours } = session;
  const validEndpoints = Boolean(parseIsoDay(start) && parseIsoDay(end));
  if (!validEndpoints) error('session-date', `${label}: 無效的起訖日 ${start}～${end}`);
  const reversed = validEndpoints && start > end;
  if (reversed) error('session-range', `${label}: 結束日早於開始日`);

  const badExceptions = (except ?? []).filter(date => !parseIsoDay(date));
  if (badExceptions.length) error('session-except-date', `${label}: 排除日無效 ${badExceptions.join(', ')}`);
  const outside = validEndpoints && !reversed && (except ?? []).some(date => date < start || date > end);
  if (outside) error('session-except-range', `${label}: 排除日落在場次區間外`);

  const badWeekdays = weekdays?.some(day => !Number.isInteger(day) || day < 0 || day >= DAYS_PER_WEEK);
  if (badWeekdays) error('session-weekdays', `${label}: weekdays 只能使用 0–6 的整數`);
  if (hours && (!CLOCK_TIME.test(hours.open) || !CLOCK_TIME.test(hours.close))) {
    error('session-hours', `${label}: 時刻須為有效的 HH:mm`);
  }

  if (validEndpoints && !reversed && !badExceptions.length && !outside && !badWeekdays && iterateSessionDates(session).next().done) {
    warn('session-empty', `${label}: 展開後沒有舉辦日期`);
  }
}

function checkOccurrence(row: EventOccurrence, label: string, error: ReportIssue, warn: ReportIssue): void {
  const { basis, sessions, source, status, year } = row;
  if (!Object.hasOwn(STATUS_RULES, status)) {
    error('occurrence-status', `${label}: 未知的狀態 ${status}`);
  } else {
    const rules = STATUS_RULES[status];
    if (rules.sessions === 'required' && !sessions.length) error('sessions-required', `${label}: ${status} 必須有場次`);
    if (rules.sessions === 'empty' && sessions.length) error('sessions-forbidden', `${label}: ${status} 的 sessions 必須為空`);
    if (basis === 'usual' && !rules.usualSummary) error('usual-status', `${label}: ${status} 不支援例年日期`);
  }
  if (basis !== undefined && !OCCURRENCE_BASES.includes(basis)) {
    error('occurrence-basis', `${label}: 未知的日期依據 ${basis}`);
  }

  const firstDay = earliestSessionStart(sessions);
  if (firstDay && firstDay.getUTCFullYear() !== year) error('occurrence-year', `${label}: 年度與首場開始日不符`);
  sessions.forEach((session, i) => checkSession(session, `${label} 第 ${i + 1} 場`, error, warn));

  if (!/^https:\/\/[^/\s\\]/i.test(source?.url) || !URL.canParse(source.url)) {
    error('source-url', `${label}: 來源須為有效的 HTTPS 網址`);
  }
  if (!parseIsoDay(source?.checkedOn)) error('source-checked-on', `${label}: 查核日無效`);
}

export function checkEvents({ catalog, occurrences, locales, spotIds, wardKeys, municipalities }: EventCheckInput): EventIssue[] {
  const issues: EventIssue[] = [];
  const error: ReportIssue = (code, message) => { issues.push({ level: 'ERROR', code, message }); };
  const warn: ReportIssue = (code, message) => { issues.push({ level: 'WARN', code, message }); };
  const catalogIds = new Set<string>();

  for (const event of catalog) {
    const { id, kind, venues, usualMonths } = event;
    if (!EVENT_ID.test(id)) error('event-id', `${id}: 活動 ID 須符合 EV-NNN`);
    if (catalogIds.has(id)) error('event-duplicate', `${id}: 活動 ID 重複`);
    catalogIds.add(id);
    const extra = Object.keys(event).filter(key => !Object.hasOwn(EVENT_FIELDS, key));
    if (extra.length) error('event-fields', `${id}: 主檔含禁止欄位 ${extra.join(', ')}`);
    if (!EVENT_KINDS.includes(kind)) error('event-kind', `${id}: 未知的活動類型 ${kind}`);
    if (usualMonths.some(month => !CALENDAR_MONTHS.includes(month))) {
      error('event-months', `${id}: 慣例月份含無效月份`);
    }
    if (!venues.length) error('venue-missing', `${id}: 至少須有一個場地`);
    for (const venue of venues) {
      if (!Object.hasOwn(VENUE_FIELDS, venue.kind)) {
        error('venue-kind', `${id}: 場地類型無效`);
        continue;
      }
      const extra = Object.keys(venue).filter(key => !Object.hasOwn(VENUE_FIELDS[venue.kind], key));
      if (extra.length) error('venue-fields', `${id}: 場地含禁止欄位 ${extra.join(', ')}`);
      if (venue.kind === 'spot') {
        if (!spotIds.has(venue.spotId)) error('venue-spot', `${id}: 不存在的景點 ${venue.spotId}`);
      } else {
        if (!wardKeys.includes(venue.wardId)) error('venue-ward', `${id}: 未登記的行政區 ${venue.wardId}`);
        if (venue.municipalityId !== undefined && !Object.hasOwn(municipalities, venue.municipalityId)) {
          error('venue-municipality', `${id}: 未登記的市域 ${venue.municipalityId}`);
        }
      }
    }
  }

  for (const [lang, locale] of Object.entries(locales)) {
    for (const id of catalogIds) {
      if (!Object.hasOwn(locale, id)) error('locale-missing', `${id}: 缺少 ${lang} locale`);
    }
    for (const id of Object.keys(locale)) {
      if (!catalogIds.has(id)) error('locale-orphan', `${id}: ${lang} locale 為孤立節點`);
    }
  }

  const seenOccurrences = new Set<string>();
  for (const [fileYear, rows] of Object.entries(occurrences)) {
    const yearIds = new Set<string>();
    for (const row of rows) {
      const { eventId, year } = row;
      const label = `${eventId}（${year}）`;
      if (!catalogIds.has(eventId)) error('occurrence-event', `${label}: 未登記的活動`);
      if (year !== Number(fileYear)) error('occurrence-file-year', `${label}: 場次列與年度檔 ${fileYear} 不符`);
      if (seenOccurrences.has(label)) error('occurrence-duplicate', `${label}: 同一年度的場次列重複`);
      seenOccurrences.add(label);
      yearIds.add(eventId);
      checkOccurrence(row, label, error, warn);
    }
    for (const id of catalogIds) {
      if (!yearIds.has(id)) warn('occurrence-missing', `${id}: 缺少 ${fileYear} 年場次列`);
    }
  }

  return issues;
}
