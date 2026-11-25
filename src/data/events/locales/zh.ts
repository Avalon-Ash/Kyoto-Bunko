import type { EventLocale } from '../types';

export const EVENTS_ZH: Readonly<Record<string, EventLocale>> = {
  'EV-001': {
    name: '弘法市',
    desc: '東寺境內每月舉辦的露天市集，源於御影供法會。',
    organizer: '東寺',
  },
  'EV-002': {
    name: '京都五山送火',
    desc: '盂蘭盆節期間，京都各山依序點燃送火，送別祖先亡靈。',
    organizer: '各山保存會',
  },
  'EV-003': {
    name: '清水寺春季夜櫻特別拜觀',
    desc: '清水寺在春季特別拜觀期間延長開門至夜間。',
    organizer: '清水寺',
  },
};
