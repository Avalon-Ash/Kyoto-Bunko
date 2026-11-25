import assert from 'node:assert/strict';
import test from 'node:test';
import type { LoadedEvent } from '../data/events/loader';
import { SEASON_MONTHS, SEASONS, seasonOfMonth } from '../data/events/seasons';
import type { EventOccurrence, EventSession, IsoDate } from '../data/events/types';
import { DEFAULT_MUNICIPALITY } from '../data/municipalities';
import {
  STALE_AFTER_DAYS,
  earliestSessionStart,
  isStale,
  listSeason,
  listYear,
  queryRange,
  seasonBounds,
  selectCatalogYear,
  sessionDates,
  tokyoToday,
  usualMonthsInWindow,
  validateRange,
} from './seasonal-query';
import { WARD_KEY_LIST } from './ward-keys';

const BASE_ID = 'EV-900';
const BASE_YEAR = 2027;
const BASE_DAY: IsoDate = '2027-05-15';
const MS_PER_DAY = 86_400_000;

function addUtcDays(date: IsoDate, days: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setTime(d.getTime() + days * MS_PER_DAY);
  return d.toISOString().slice(0, date.length);
}

function makeOccurrence(
  overrides: Partial<EventOccurrence> = {},
  session: Partial<EventSession> = {},
): EventOccurrence {
  const start = session.start ?? BASE_DAY;
  const end = session.end ?? start;
  return {
    eventId: BASE_ID,
    year: Number(start.slice(0, 4)),
    status: 'confirmed',
    basis: 'announced',
    sessions: [{ start, end, ...session }],
    admission: 'free',
    reservation: 'none',
    source: { url: 'https://example.org/schedule', checkedOn: BASE_DAY },
    ...overrides,
  };
}

function makeItem(
  overrides: Partial<LoadedEvent> = {},
  occurrenceOverrides: Partial<EventOccurrence> = {},
  session: Partial<EventSession> = {},
): LoadedEvent {
  const id = overrides.id ?? BASE_ID;
  const occurrence = makeOccurrence({ eventId: id, ...occurrenceOverrides }, session);
  return {
    id,
    kind: 'rite',
    venues: [{ kind: 'ward', wardId: WARD_KEY_LIST[0], municipalityId: DEFAULT_MUNICIPALITY }],
    usualMonths: [Number(BASE_DAY.slice(5, 7))],
    officialUrl: 'https://example.org/event',
    name: `測試活動 ${id}`,
    desc: '查詢測試用資料。',
    organizer: '測試主辦方',
    occurrences: [occurrence],
    ...overrides,
  };
}

test('跨年場次', () => {
  const session: EventSession = { start: '2027-12-30', end: '2028-01-02' };
  assert.deepEqual(sessionDates(session), [
    '2027-12-30',
    '2027-12-31',
    '2028-01-01',
    '2028-01-02',
  ]);

  const item = makeItem({}, { year: BASE_YEAR }, session);
  const matches = queryRange([item], '2027-12-31', '2028-01-01');
  assert.equal(matches.length, 1);
  assert.deepEqual(matches[0].dates, ['2027-12-31', '2028-01-01']);
});

test('閏日（2028-02-29 合法、2027-02-29 不合法）', () => {
  assert.equal(validateRange('2028-02-29', '2028-02-29'), null);
  assert.equal(validateRange('2027-02-29', '2027-03-01'), 'invalid-date');
  assert.equal(validateRange('2027-02-28', '2027-02-29'), 'invalid-date');

  assert.deepEqual(
    sessionDates({ start: '2028-02-28', end: '2028-03-01' }),
    ['2028-02-28', '2028-02-29', '2028-03-01'],
  );
  assert.deepEqual(sessionDates({ start: '2027-02-29', end: '2027-02-29' }), []);
});

test('同日起訖', () => {
  assert.equal(validateRange(BASE_DAY, BASE_DAY), null);
  assert.deepEqual(sessionDates({ start: BASE_DAY, end: BASE_DAY }), [BASE_DAY]);

  const item = makeItem({}, {}, { start: BASE_DAY, end: BASE_DAY });
  const matches = queryRange([item], BASE_DAY, BASE_DAY);
  assert.equal(matches.length, 1);
  assert.deepEqual(matches[0].dates, [BASE_DAY]);
});

test('活動開始早於查詢區間', () => {
  const item = makeItem({}, {}, { start: '2027-04-01', end: '2027-04-10' });
  const matches = queryRange([item], '2027-04-05', '2027-04-07');
  assert.equal(matches.length, 1);
  assert.deepEqual(matches[0].dates, ['2027-04-05', '2027-04-06', '2027-04-07']);
});

test('查詢區間最後一天', () => {
  const startsOnEnd = makeItem({ id: 'EV-901' }, {}, { start: '2027-04-10', end: '2027-04-15' });
  const endsOnStart = makeItem({ id: 'EV-902' }, {}, { start: '2027-04-01', end: '2027-04-05' });

  const matches = queryRange([startsOnEnd, endsOnStart], '2027-04-05', '2027-04-10');
  assert.deepEqual(
    matches.map(m => ({ id: m.event.id, dates: m.dates })),
    [
      { id: 'EV-902', dates: ['2027-04-05'] },
      { id: 'EV-901', dates: ['2027-04-10'] },
    ],
  );
});

test('排除日', () => {
  const session: EventSession = {
    start: '2027-05-01',
    end: '2027-05-05',
    except: ['2027-05-02', '2027-05-04'],
  };
  assert.deepEqual(sessionDates(session), ['2027-05-01', '2027-05-03', '2027-05-05']);

  const item = makeItem({}, {}, session);
  assert.deepEqual(queryRange([item], '2027-05-02', '2027-05-02'), []);
  assert.deepEqual(queryRange([item], '2027-05-01', '2027-05-05')[0].dates, [
    '2027-05-01',
    '2027-05-03',
    '2027-05-05',
  ]);
});

test('只限週末（weekdays）', () => {
  // 2027-05-01 is Saturday (6), 2027-05-02 is Sunday (0).
  const session: EventSession = {
    start: '2027-05-01',
    end: '2027-05-09',
    weekdays: [0, 6],
  };
  assert.deepEqual(sessionDates(session), [
    '2027-05-01',
    '2027-05-02',
    '2027-05-08',
    '2027-05-09',
  ]);

  const item = makeItem({}, {}, session);
  assert.deepEqual(queryRange([item], '2027-05-03', '2027-05-07'), []);
  assert.deepEqual(queryRange([item], '2027-05-01', '2027-05-09')[0].dates, [
    '2027-05-01',
    '2027-05-02',
    '2027-05-08',
    '2027-05-09',
  ]);
});

test('非連續的多筆 session', () => {
  const item = makeItem({}, {
    sessions: [
      { start: '2027-07-01', end: '2027-07-02' },
      { start: '2027-07-10', end: '2027-07-11' },
    ],
  });

  assert.deepEqual(queryRange([item], '2027-07-03', '2027-07-09'), []);
  const matches = queryRange([item], '2027-07-01', '2027-07-15');
  assert.equal(matches.length, 1);
  assert.deepEqual(matches[0].dates, [
    '2027-07-01',
    '2027-07-02',
    '2027-07-10',
    '2027-07-11',
  ]);
});

test('取消與待公告不進日期結果', () => {
  const cancelled = makeItem(
    { id: 'EV-901' },
    { status: 'cancelled', basis: undefined },
    { start: '2027-08-10', end: '2027-08-12' },
  );
  const tba = makeItem(
    { id: 'EV-902', usualMonths: [8] },
    { year: BASE_YEAR, status: 'tba', basis: undefined, sessions: [] },
  );

  assert.deepEqual(queryRange([cancelled, tba], '2027-08-01', '2027-08-31'), []);
});

test('例年（basis usual）的 confirmed 會進結果', () => {
  const usualItem = makeItem(
    { id: 'EV-903' },
    { status: 'confirmed', basis: 'usual' },
    { start: '2027-08-16', end: '2027-08-16' },
  );

  const matches = queryRange([usualItem], '2027-08-01', '2027-08-31');
  assert.equal(matches.length, 1);
  assert.equal(matches[0].event.id, 'EV-903');
  assert.equal(matches[0].occurrence.basis, 'usual');
  assert.deepEqual(matches[0].dates, ['2027-08-16']);
});

test('無效區間（兩種錯誤碼）', () => {
  assert.equal(validateRange('2027-13-01', '2027-12-31'), 'invalid-date');
  assert.equal(validateRange('2027-04-01', '2027-04-31'), 'invalid-date');
  assert.equal(validateRange('2027-05-10', '2027-05-01'), 'end-before-start');

  const item = makeItem({}, {}, { start: '2027-05-01', end: '2027-05-10' });
  assert.deepEqual(queryRange([item], '2027-05-10', '2027-05-01'), []);
  assert.deepEqual(queryRange([item], '2027-02-29', '2027-03-01'), []);
});

test('冬季跨年歸季', () => {
  const dec2027 = makeItem({ id: 'EV-910' }, { year: BASE_YEAR }, { start: '2027-12-20', end: '2027-12-20' });
  const crossYear = makeItem({ id: 'EV-911' }, { year: BASE_YEAR }, { start: '2027-12-31', end: '2028-01-02' });
  const feb2028Leap = makeItem({ id: 'EV-912' }, { year: BASE_YEAR + 1 }, { start: '2028-02-29', end: '2028-02-29' });
  const jan2027 = makeItem({ id: 'EV-913' }, { year: BASE_YEAR }, { start: '2027-01-15', end: '2027-01-15' });
  const mar2028 = makeItem({ id: 'EV-914' }, { year: BASE_YEAR + 1 }, { start: '2028-03-01', end: '2028-03-01' });

  const all = [dec2027, crossYear, feb2028Leap, jan2027, mar2028];
  const winter2027 = listSeason(all, BASE_YEAR, 'winter');
  assert.deepEqual(
    winter2027.map(m => ({ id: m.event.id, dates: m.dates })),
    [
      { id: 'EV-910', dates: ['2027-12-20'] },
      { id: 'EV-911', dates: ['2027-12-31', '2028-01-01', '2028-01-02'] },
      { id: 'EV-912', dates: ['2028-02-29'] },
    ],
  );

  const winter2026 = listSeason(all, BASE_YEAR - 1, 'winter');
  assert.deepEqual(winter2026.map(m => m.event.id), ['EV-913']);
});

test('tba 依 usualMonths 歸季', () => {
  const springMonth = SEASON_MONTHS.spring[0];
  const winterStartMonth = SEASON_MONTHS.winter[0];
  const winterNextYearMonth = SEASON_MONTHS.winter[1];

  const springTba = makeItem(
    { id: 'EV-920', usualMonths: [springMonth] },
    { year: BASE_YEAR, status: 'tba', basis: undefined, sessions: [] },
  );
  const decTba = makeItem(
    { id: 'EV-921', usualMonths: [winterStartMonth] },
    { year: BASE_YEAR, status: 'tba', basis: undefined, sessions: [] },
  );
  const nextJanTba = makeItem(
    { id: 'EV-922', usualMonths: [winterNextYearMonth] },
    { year: BASE_YEAR + 1, status: 'tba', basis: undefined, sessions: [] },
  );
  const prevJanTba = makeItem(
    { id: 'EV-923', usualMonths: [winterNextYearMonth] },
    { year: BASE_YEAR, status: 'tba', basis: undefined, sessions: [] },
  );

  const items = [springTba, decTba, nextJanTba, prevJanTba];

  const spring = listSeason(items, BASE_YEAR, 'spring');
  assert.deepEqual(spring.map(m => ({ id: m.event.id, dates: m.dates })), [{ id: 'EV-920', dates: [] }]);
  assert.deepEqual(listSeason(items, BASE_YEAR, 'summer'), []);

  const winter2027 = listSeason(items, BASE_YEAR, 'winter');
  assert.deepEqual(winter2027.map(m => m.event.id), ['EV-921', 'EV-922']);

  const winter2026 = listSeason(items, BASE_YEAR - 1, 'winter');
  assert.deepEqual(winter2026.map(m => m.event.id), ['EV-923']);
});

test('isStale 的 89／90／91 天', () => {
  assert.equal(STALE_AFTER_DAYS, 90);
  const checkedOn: IsoDate = '2027-01-01';
  assert.equal(isStale(checkedOn, addUtcDays(checkedOn, STALE_AFTER_DAYS - 1)), false);
  assert.equal(isStale(checkedOn, addUtcDays(checkedOn, STALE_AFTER_DAYS)), false);
  assert.equal(isStale(checkedOn, addUtcDays(checkedOn, STALE_AFTER_DAYS + 1)), true);
});

test('tokyoToday 在 UTC 15:00 的前後（東京換日）', () => {
  assert.equal(tokyoToday(new Date('2027-05-01T14:59:59.999Z')), '2027-05-01');
  assert.equal(tokyoToday(new Date('2027-05-01T15:00:00.000Z')), '2027-05-02');
  assert.equal(tokyoToday(new Date('2027-12-31T14:59:59.000Z')), '2027-12-31');
  assert.equal(tokyoToday(new Date('2027-12-31T15:00:00.000Z')), '2028-01-01');
});

test('顯示東京今天所在的有資料年度，即使已有下一年度的資料', () => {
  assert.equal(selectCatalogYear(BASE_DAY, [BASE_YEAR + 1, BASE_YEAR]), BASE_YEAR);
});

test('今天早於資料年度時顯示最近的有資料年度', () => {
  assert.equal(selectCatalogYear(BASE_DAY, [BASE_YEAR + 2, BASE_YEAR + 1]), BASE_YEAR + 1);
});

test('今天晚於資料年度時顯示最後有資料的年度', () => {
  assert.equal(selectCatalogYear(BASE_DAY, [BASE_YEAR - 1, BASE_YEAR - 2]), BASE_YEAR - 1);
});

test('今天所在的年度缺資料時顯示下一個有資料的年度', () => {
  assert.equal(selectCatalogYear(BASE_DAY, [BASE_YEAR + 1, BASE_YEAR - 1]), BASE_YEAR + 1);
});

test('東京元旦從 12/31 15:00 UTC 開始選下一年度', () => {
  const years = [BASE_YEAR, BASE_YEAR + 1];
  const before = new Date(`${BASE_YEAR}-12-31T14:59:59.999Z`);
  const after = new Date(`${BASE_YEAR}-12-31T15:00:00.000Z`);
  assert.equal(selectCatalogYear(tokyoToday(before), years), BASE_YEAR);
  assert.equal(selectCatalogYear(tokyoToday(after), years), BASE_YEAR + 1);
});

test('沒有場次資料時沒有顯示年度', () => {
  assert.equal(selectCatalogYear(BASE_DAY, []), undefined);
});

test('稽核的慣例月份包含與期間重疊的兩端，並區分場次年度', () => {
  const [december, january, february] = SEASON_MONTHS.winter;
  const today = `${BASE_YEAR}-${december}-31`;
  assert.deepEqual(usualMonthsInWindow(BASE_YEAR, [january, december], today, 1), [`${BASE_YEAR}-12`]);
  assert.deepEqual(usualMonthsInWindow(BASE_YEAR + 1, [january, february], today, 1), [`${BASE_YEAR + 1}-01`]);
  assert.deepEqual(usualMonthsInWindow(BASE_YEAR + 1, [january], today, 0), []);
});

test('依第一個可參加日期與 hours.open 排序', () => {
  const noHours = makeItem({ id: 'EV-930' }, {}, { start: '2027-06-10', end: '2027-06-10' });
  const late = makeItem(
    { id: 'EV-931' },
    {},
    { start: '2027-06-10', end: '2027-06-10', hours: { open: '18:00', close: '21:00' } },
  );
  const early = makeItem(
    { id: 'EV-932' },
    {},
    { start: '2027-06-10', end: '2027-06-10', hours: { open: '09:00', close: '16:00' } },
  );
  const earlierDate = makeItem(
    { id: 'EV-933' },
    {},
    { start: '2027-06-09', end: '2027-06-09', hours: { open: '20:00', close: '22:00' } },
  );
  const multiSession = makeItem({ id: 'EV-934' }, {
    sessions: [
      { start: '2027-06-01', end: '2027-06-01', hours: { open: '06:00', close: '08:00' } },
      { start: '2027-06-10', end: '2027-06-10', hours: { open: '12:00', close: '15:00' } },
    ],
  });

  const matches = queryRange(
    [noHours, late, early, earlierDate, multiSession],
    '2027-06-09',
    '2027-06-11',
  );
  assert.deepEqual(
    matches.map(m => m.event.id),
    ['EV-933', 'EV-932', 'EV-934', 'EV-931', 'EV-930'],
  );
});

test('延期（postponed）有場次進查詢、無場次不進查詢', () => {
  const rescheduled = makeItem(
    { id: 'EV-940' },
    { status: 'postponed', basis: undefined },
    { start: '2027-09-20', end: '2027-09-20' },
  );
  const unscheduled = makeItem(
    { id: 'EV-941' },
    { year: BASE_YEAR, status: 'postponed', basis: undefined, sessions: [] },
  );

  const matches = queryRange([rescheduled, unscheduled], '2027-09-01', '2027-09-30');
  assert.deepEqual(matches.map(m => m.event.id), ['EV-940']);
});

test('全年收錄一、二月待公告活動，並依場次日期或第一個慣例月份排序', () => {
  const [december, january, february] = SEASON_MONTHS.winter;
  const [march] = SEASON_MONTHS.spring;
  const tba: Partial<EventOccurrence> = { year: BASE_YEAR, status: 'tba', basis: undefined, sessions: [] };
  const janTba = makeItem({ id: 'EV-950', usualMonths: [january] }, tba);
  const febTba = makeItem({ id: 'EV-951', usualMonths: [february, january] }, tba);
  const marchCancelled = makeItem({ id: 'EV-952', usualMonths: [march] }, {
    year: BASE_YEAR, status: 'cancelled', basis: undefined, sessions: [],
  });
  const janDay = `${BASE_YEAR}-${String(january).padStart(2, '0')}-15`;
  const januarySession = makeItem({ id: 'EV-953', usualMonths: [december] }, {}, { start: janDay });
  const { from, to } = seasonBounds(BASE_YEAR, 'winter');
  const crossYear = makeItem({ id: 'EV-954' }, { status: 'postponed', basis: undefined }, { start: from, end: to });
  const nextYear = makeItem({ id: 'EV-955' }, {}, { start: to });

  const matches = listYear([nextYear, crossYear, marchCancelled, febTba, januarySession, janTba], BASE_YEAR);
  assert.deepEqual(matches.map(match => match.event.id), ['EV-950', 'EV-953', 'EV-951', 'EV-952', 'EV-954']);
  assert.deepEqual(matches.map(({ dates }) => dates[0]), [undefined, janDay, undefined, undefined, from]);
  assert.equal(matches.at(-1)?.dates.at(-1), to);
});

test('季節列表依日期收錄有場次的延期與取消，無場次則依慣例月份', () => {
  const { from } = seasonBounds(BASE_YEAR, 'autumn');
  const usualMonths = [SEASON_MONTHS.spring[0]];
  const items = (['cancelled', 'postponed'] as const).flatMap((status, index) => {
    const dated = makeItem({ id: `EV-96${index}`, usualMonths }, { status, basis: undefined }, { start: from });
    const undated = makeItem({ id: `EV-97${index}`, usualMonths }, {
      year: BASE_YEAR, status, basis: undefined, sessions: [],
    });
    return [dated, undated];
  });

  const results = (season: keyof typeof SEASON_MONTHS) => listSeason(items, BASE_YEAR, season)
    .map(({ event, dates }) => [event.id, dates]);
  assert.deepEqual(results('autumn'), [['EV-960', [from]], ['EV-961', [from]]]);
  assert.deepEqual(results('spring'), [['EV-970', []], ['EV-971', []]]);
  assert.deepEqual(results('summer'), []);
});

test('季節列表只在實際舉辦日被裁切時附上全期', () => {
  const winter = seasonBounds(BASE_YEAR, 'winter');
  const autumn = seasonBounds(BASE_YEAR, 'autumn');
  const session = { start: autumn.to, end: winter.from };
  const clipped = makeItem({ id: 'EV-980' }, {}, session);
  const excluded = makeItem({ id: 'EV-981' }, {}, { ...session, except: [autumn.to] });

  const matches = listSeason([clipped, excluded], BASE_YEAR, 'winter');
  assert.deepEqual(matches.map(({ dates, fullPeriod }) => ({ dates, fullPeriod })), [
    { dates: [winter.from], fullPeriod: { from: autumn.to, to: winter.from } },
    { dates: [winter.from], fullPeriod: undefined },
  ]);
});

test('月份查季節沿用四季月份表', () => {
  for (const season of SEASONS) {
    for (const month of SEASON_MONTHS[season]) assert.equal(seasonOfMonth(month), season);
  }
  assert.equal(seasonOfMonth(0), undefined);
});

test('取最早的 session 起始日與排列順序無關', () => {
  const { from, to } = seasonBounds(BASE_YEAR, 'winter');
  const sessions = [{ start: to, end: to }, { start: from, end: from }];
  assert.equal(earliestSessionStart(sessions)?.toISOString().slice(0, from.length), from);
});
