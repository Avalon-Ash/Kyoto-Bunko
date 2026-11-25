import { CALENDAR_MONTHS } from './seasons';
import type { EventSchema } from './types';

export const EVENT_CATALOG: readonly EventSchema[] = [
  {
    id: 'EV-001',
    kind: 'market',
    venues: [{ kind: 'spot', spotId: 'MN-067' }, { kind: 'spot', spotId: 'MN-001' }],
    usualMonths: [...CALENDAR_MONTHS],
    officialUrl: 'https://toji.or.jp/smp/mieku/',
  },
  {
    id: 'EV-002',
    kind: 'rite',
    venues: [
      { kind: 'spot', spotId: 'KT-038' },
      { kind: 'ward', wardId: 'W_SAKYO' },
      // W_KITA comes from KT-038 (a spot's ward is derived, ADR 0023); 左大文字 is in the same ward.
      { kind: 'ward', wardId: 'W_UKYO' },
    ],
    usualMonths: [8],
    officialUrl: 'https://www.city.kyoto.lg.jp/sogo/page/0000015635.html',
  },
  {
    id: 'EV-003',
    kind: 'night_viewing',
    venues: [{ kind: 'spot', spotId: 'HY-003' }],
    usualMonths: [3, 4],
    officialUrl: 'https://www.kiyomizudera.or.jp/event/yakan.php',
  },
];
