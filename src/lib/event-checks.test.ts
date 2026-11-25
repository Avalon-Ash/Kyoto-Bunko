import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_MUNICIPALITY, MUNICIPALITIES } from '../data/municipalities';
import { WARD_KEY_LIST } from './ward-keys';
import type { EventLocale, EventOccurrence, EventSchema, EventSession, EventVenue } from '../data/events/types';
import { checkEvents } from './event-checks';

const FIXTURE_ID = 'EV-900';
const FIXTURE_SPOT = 'KT-999';
const LEAP_DAY = '2028-02-29';
const LEAP_YEAR = Number(LEAP_DAY.slice(0, 4));

function makeEvent(overrides: Partial<EventSchema> = {}): EventSchema {
  return {
    id: FIXTURE_ID,
    kind: 'rite',
    venues: [
      { kind: 'spot', spotId: FIXTURE_SPOT },
      { kind: 'ward', wardId: WARD_KEY_LIST[0], municipalityId: DEFAULT_MUNICIPALITY },
    ],
    usualMonths: [Number(LEAP_DAY.slice(5, 7))],
    officialUrl: 'https://example.org/event',
    ...overrides,
  };
}

function makeOccurrence(overrides: Partial<EventOccurrence> = {}, session: Partial<EventSession> = {}): EventOccurrence {
  return {
    eventId: FIXTURE_ID,
    year: LEAP_YEAR,
    status: 'confirmed',
    basis: 'usual',
    sessions: [{ start: LEAP_DAY, end: LEAP_DAY, ...session }],
    admission: 'free',
    reservation: 'none',
    source: { url: 'https://example.org/schedule', checkedOn: LEAP_DAY },
    ...overrides,
  };
}

function makeInput(overrides: Partial<Parameters<typeof checkEvents>[0]> = {}): Parameters<typeof checkEvents>[0] {
  const locale: EventLocale = { name: '測試活動', desc: '用於資料驗證。', organizer: '測試主辦方' };
  return {
    catalog: [makeEvent()],
    occurrences: { [LEAP_YEAR]: [makeOccurrence()] },
    locales: { zh: { [FIXTURE_ID]: locale }, ja: { [FIXTURE_ID]: { ...locale, name: 'テスト行事' } } },
    spotIds: new Set([FIXTURE_SPOT]),
    wardKeys: WARD_KEY_LIST,
    municipalities: MUNICIPALITIES,
    ...overrides,
  };
}

const withEvent = (event: EventSchema) => makeInput({ catalog: [event] });
const withVenue = (venue: EventVenue) => withEvent(makeEvent({ venues: [venue] }));
const withOccurrence = (row: EventOccurrence) => makeInput({ occurrences: { [LEAP_YEAR]: [row] } });
const withSession = (session: Partial<EventSession>) => withOccurrence(makeOccurrence({}, session));

test('valid event data covers both venue types, a leap day and a cross-year session', () => {
  const occurrence = makeOccurrence({}, { end: `${LEAP_YEAR + 1}-01-01` });
  assert.deepEqual(checkEvents(withOccurrence(occurrence)), []);
});

test('valid session policies accept undated TBA, postponed and cancelled rows', () => {
  for (const status of ['tba', 'postponed', 'cancelled'] as const) {
    const row = makeOccurrence({ status, basis: undefined, sessions: [] });
    assert.deepEqual(checkEvents(withOccurrence(row)), []);
  }
});

const badInputs: Record<string, () => ReturnType<typeof makeInput>> = {
  'event-id': () => withEvent(makeEvent({ id: 'EV-9' })),
  'event-duplicate': () => makeInput({ catalog: [makeEvent(), makeEvent()] }),
  'event-fields': () => withEvent({ ...makeEvent(), ...{ name: '應放在 locale' } }),
  'event-kind': () => withEvent(makeEvent({ kind: 'invalid' as EventSchema['kind'] })),
  'event-months': () => withEvent(makeEvent({ usualMonths: [13] })),
  'venue-missing': () => withEvent(makeEvent({ venues: [] })),
  'venue-kind': () => withVenue({ ...makeEvent().venues[0], kind: 'invalid' } as unknown as EventVenue),
  'venue-fields': () => withVenue({ kind: 'spot', spotId: FIXTURE_SPOT, ...{ wardId: WARD_KEY_LIST[0] } }),
  'venue-spot': () => makeInput({ spotIds: new Set() }),
  'venue-ward': () => makeInput({ wardKeys: [] }),
  'venue-municipality': () => makeInput({ municipalities: {} }),
  'locale-missing': () => {
    const { locales } = makeInput();
    return makeInput({ locales: { ...locales, zh: {} } });
  },
  'locale-orphan': () => {
    const { locales } = makeInput();
    return makeInput({ locales: { ...locales, ja: { ...locales.ja, 'EV-901': locales.ja[FIXTURE_ID] } } });
  },
  'occurrence-event': () => withOccurrence(makeOccurrence({ eventId: 'EV-901' })),
  'occurrence-file-year': () => makeInput({ occurrences: { [LEAP_YEAR + 1]: [makeOccurrence()] } }),
  'occurrence-duplicate': () => makeInput({ occurrences: { [LEAP_YEAR]: [makeOccurrence(), makeOccurrence()] } }),
  'occurrence-year': () => withSession({ start: `${LEAP_YEAR - 1}-12-31` }),
  'session-date': () => withSession({ start: `${LEAP_YEAR - 1}-02-29` }),
  'session-range': () => withSession({ end: `${LEAP_YEAR}-02-28` }),
  'session-except-date': () => withSession({ except: [`${LEAP_YEAR}-02-30`] }),
  'session-except-range': () => withSession({ except: [`${LEAP_YEAR}-03-01`] }),
  'session-weekdays': () => withSession({ weekdays: [7] }),
  'session-hours': () => withSession({ hours: { open: '19:00', close: '24:00' } }),
  'occurrence-status': () => withOccurrence(makeOccurrence({ status: 'invalid' as EventOccurrence['status'] })),
  'occurrence-basis': () => withOccurrence(makeOccurrence({ basis: 'invalid' as EventOccurrence['basis'] })),
  'sessions-required': () => withOccurrence(makeOccurrence({ sessions: [] })),
  'sessions-forbidden': () => withOccurrence(makeOccurrence({ status: 'tba', basis: undefined })),
  'usual-status': () => withOccurrence(makeOccurrence({ status: 'postponed' })),
  'source-url': () => withOccurrence(makeOccurrence({ source: { url: 'http://example.org', checkedOn: LEAP_DAY } })),
  'source-checked-on': () => withOccurrence(makeOccurrence({ source: { ...makeOccurrence().source, checkedOn: '2028-02-30' } })),
};

for (const [code, makeBadInput] of Object.entries(badInputs)) {
  test(`reports ERROR ${code}`, () => {
    assert.ok(checkEvents(makeBadInput()).some(issue => issue.level === 'ERROR' && issue.code === code));
  });
}

test('warns when an event is missing from a loaded year, including an empty year file', () => {
  const input = makeInput({ occurrences: { [LEAP_YEAR]: [makeOccurrence()], [LEAP_YEAR + 1]: [] } });
  assert.deepEqual(checkEvents(input).map(({ level, code }) => [level, code]), [['WARN', 'occurrence-missing']]);
});

test('warns when weekday and exception filters leave no dates', () => {
  const occurrence = makeOccurrence({}, { end: `${LEAP_YEAR}-03-01`, weekdays: [2], except: [LEAP_DAY] });
  assert.deepEqual(checkEvents(withOccurrence(occurrence)).map(({ level, code }) => [level, code]), [['WARN', 'session-empty']]);
});
