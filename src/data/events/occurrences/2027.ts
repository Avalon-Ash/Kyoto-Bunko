import type { EventOccurrence, EventSession, IsoDate } from '../types';

export const YEAR_2027 = 2027;

const singleDay = (date: IsoDate): EventSession => ({ start: date, end: date });

export const OCCURRENCES_2027: readonly EventOccurrence[] = [
  {
    eventId: 'EV-001',
    year: YEAR_2027,
    status: 'confirmed',
    basis: 'usual',
    sessions: [
      singleDay('2027-01-21'),
      singleDay('2027-02-21'),
      singleDay('2027-03-21'),
      singleDay('2027-04-21'),
      singleDay('2027-05-21'),
      singleDay('2027-06-21'),
      singleDay('2027-07-21'),
      singleDay('2027-08-21'),
      singleDay('2027-09-21'),
      singleDay('2027-10-21'),
      singleDay('2027-11-21'),
      singleDay('2027-12-21'),
    ],
    admission: 'free',
    reservation: 'none',
    source: { url: 'https://toji.or.jp/smp/mieku/', checkedOn: '2026-11-25' },
  },
  {
    eventId: 'EV-002',
    year: YEAR_2027,
    status: 'confirmed',
    basis: 'usual',
    sessions: [singleDay('2027-08-16')],
    admission: 'free',
    reservation: 'none',
    source: { url: 'https://www.city.kyoto.lg.jp/sogo/page/0000015635.html', checkedOn: '2026-11-25' },
  },
  {
    eventId: 'EV-003',
    year: YEAR_2027,
    status: 'tba',
    sessions: [],
    admission: 'paid',
    reservation: 'none',
    source: { url: 'https://www.kiyomizudera.or.jp/event/yakan.php', checkedOn: '2026-11-25' },
  },
];
