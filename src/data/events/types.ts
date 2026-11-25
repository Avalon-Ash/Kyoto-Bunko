import type { WardKey } from '../../types';

/** Asia/Tokyo calendar day, YYYY-MM-DD. */
export type IsoDate = string;
/** Asia/Tokyo local time, HH:mm. */
export type ClockTime = string;

interface StatusRule {
  sessions: 'required' | 'empty' | 'optional';
  dateQuery: 'with-sessions' | 'never';
  summary: 'dates' | 'usual-months' | 'postponed' | 'cancelled';
  usualSummary: 'usual-dates' | null;
}

/** ADR 0024. A usualSummary permits the usual basis and supplies its display variant. */
export const STATUS_RULES = {
  confirmed: { sessions: 'required', dateQuery: 'with-sessions', summary: 'dates', usualSummary: 'usual-dates' },
  tba: { sessions: 'empty', dateQuery: 'never', summary: 'usual-months', usualSummary: null },
  postponed: { sessions: 'optional', dateQuery: 'with-sessions', summary: 'postponed', usualSummary: null },
  cancelled: { sessions: 'optional', dateQuery: 'never', summary: 'cancelled', usualSummary: null },
} as const satisfies Record<string, StatusRule>;

export type OccurrenceStatus = keyof typeof STATUS_RULES;
export const OCCURRENCE_STATUS: readonly OccurrenceStatus[] = Object.keys(STATUS_RULES) as OccurrenceStatus[];
export const OCCURRENCE_BASES = ['announced', 'usual'] as const;
export const EVENT_KINDS = ['matsuri', 'rite', 'night_viewing', 'special_opening', 'market'] as const;

export type EventVenue =
  | { kind: 'spot'; spotId: string }
  | { kind: 'ward'; wardId: WardKey; municipalityId?: string };

export interface EventSchema {
  id: string;
  kind: typeof EVENT_KINDS[number];
  venues: EventVenue[];
  usualMonths: number[];
  officialUrl: string;
}

export interface EventSession {
  start: IsoDate;
  end: IsoDate; // Inclusive. May cross into the following year.
  weekdays?: number[]; // 0 (Sunday) to 6 (Saturday). Omitted means every day.
  except?: IsoDate[];
  hours?: { open: ClockTime; close: ClockTime };
}

export interface EventOccurrence {
  eventId: string;
  year: number; // Calendar year of the first session's start, when present.
  status: OccurrenceStatus;
  basis?: typeof OCCURRENCE_BASES[number]; // Omitted when there is no date basis to record.
  sessions: EventSession[];
  admission: 'free' | 'paid' | 'mixed' | 'unknown';
  reservation: 'none' | 'required' | 'unknown';
  source: { url: string; checkedOn: IsoDate };
}

export type EventOccurrencesByYear = Readonly<Record<number, readonly EventOccurrence[]>>;

export interface EventLocale {
  name: string;
  desc: string;
  organizer: string;
  note?: string;
}
