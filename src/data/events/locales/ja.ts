import type { EventLocale } from '../types';

export const EVENTS_JA: Readonly<Record<string, EventLocale>> = {
  'EV-001': {
    name: '弘法市',
    desc: '御影供の法要に由来する市で、毎月東寺の境内に露店が並びます。',
    organizer: '東寺',
  },
  'EV-002': {
    name: '京都五山送り火',
    desc: 'お盆に京都の山々で順に火をともし、先祖の霊を送る行事です。',
    organizer: '各山の保存会',
  },
  'EV-003': {
    name: '春の夜間特別拝観',
    desc: '清水寺では春の特別拝観期間中、夜まで開門時間を延長します。',
    organizer: '清水寺',
  },
};
