import type { Lang, SpotSchema, WardKey } from '../../types';
import { isWardKey } from '../../lib/ward-keys';
import { DEFAULT_MUNICIPALITY } from '../municipalities';
import { EVENT_CATALOG } from './catalog';
import { EVENTS_JA } from './locales/ja';
import { EVENTS_ZH } from './locales/zh';
import { OCCURRENCES_2027, YEAR_2027 } from './occurrences/2027';
import type { EventLocale, EventOccurrence, EventOccurrencesByYear, EventSchema, EventVenue } from './types';

export const EVENT_OCCURRENCES: EventOccurrencesByYear = {
  [YEAR_2027]: OCCURRENCES_2027,
};

export const EVENT_LOCALES: Readonly<Record<Lang, Readonly<Record<string, EventLocale>>>> = {
  zh: EVENTS_ZH,
  ja: EVENTS_JA,
};

export type ResolvedEventVenue = { wardId: WardKey; municipalityId: string } & (
  | { kind: 'spot'; spotId: string; areaId: SpotSchema['areaId'] }
  | { kind: 'ward' }
);

export type LoadedEvent = Omit<EventSchema, 'venues'> & EventLocale & {
  venues: ResolvedEventVenue[];
  occurrences: EventOccurrence[];
};

function resolveVenue(venue: EventVenue, spots: ReadonlyMap<string, SpotSchema>): ResolvedEventVenue {
  if (venue.kind === 'ward') {
    return { ...venue, municipalityId: venue.municipalityId ?? DEFAULT_MUNICIPALITY };
  }
  const spot = spots.get(venue.spotId);
  if (!spot || !isWardKey(spot.wardId)) throw new Error(`Invalid event venue: ${venue.spotId}`);
  return {
    ...venue,
    wardId: spot.wardId,
    areaId: spot.areaId,
    municipalityId: spot.municipalityId ?? DEFAULT_MUNICIPALITY,
  };
}

export async function loadEvents(lang: Lang): Promise<LoadedEvent[]> {
  // The raw registries above are also imported by the Node validator. Vite resolves the spot loader's locale glob.
  const { loadAllSchemasSync } = await import('../spots-loader');
  const spots = new Map(loadAllSchemasSync().map(spot => [spot.id, spot]));
  const occurrences = new Map<string, EventOccurrence[]>();
  for (const rows of Object.values(EVENT_OCCURRENCES)) {
    for (const row of rows) {
      const existing = occurrences.get(row.eventId);
      if (existing) existing.push(row);
      else occurrences.set(row.eventId, [row]);
    }
  }

  return EVENT_CATALOG.map(event => ({
    ...event,
    ...EVENT_LOCALES[lang][event.id],
    venues: event.venues.map(venue => resolveVenue(venue, spots)),
    occurrences: occurrences.get(event.id) ?? [],
  }));
}
