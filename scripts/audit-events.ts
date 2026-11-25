import { parseArgs } from 'node:util';
import { EVENT_CATALOG } from '../src/data/events/catalog';
import { EVENT_LOCALES, EVENT_OCCURRENCES } from '../src/data/events/loader';
import type { IsoDate } from '../src/data/events/types';
import { isStale, parseIsoDay, STALE_AFTER_DAYS, tokyoToday, usualMonthsInWindow } from '../src/lib/seasonal-query';

/** Look ahead this many calendar days when reviewing unannounced dates by their usual months. */
const TBA_LOOKAHEAD_DAYS = 90;

function printSection(title: string, rows: readonly string[]) {
  console.log(`\n${title}（${rows.length} 筆）`);
  for (const row of rows) console.log(`  ${row}`);
}

function auditEvents(today: IsoDate) {
  const events = new Map(EVENT_CATALOG.map(event => [event.id, event]));
  const stale: string[] = [];
  const upcomingTba: string[] = [];
  const usual: string[] = [];

  for (const occurrences of Object.values(EVENT_OCCURRENCES)) {
    for (const occurrence of occurrences) {
      const { eventId, year, status, basis, sessions, source: { checkedOn } } = occurrence;
      const event = events.get(eventId);
      const locale = EVENT_LOCALES.ja[eventId];
      if (!event || !locale) throw new Error(`缺少 ${eventId} 的活動主檔或日文資料`);
      const label = `${eventId} ${locale.name}（${year} 年度）`;

      if (isStale(checkedOn, today)) stale.push(`${label}｜查核日 ${checkedOn}`);

      if (status === 'tba') {
        const months = usualMonthsInWindow(year, event.usualMonths, today, TBA_LOOKAHEAD_DAYS);
        if (months.length) upcomingTba.push(`${label}｜估計月份 ${months.join('、')}｜查核日 ${checkedOn}`);
      }

      if (basis === 'usual') {
        const dates = sessions.map(({ start, end }) => start === end ? start : `${start}～${end}`);
        usual.push(`${label}｜例年場次 ${dates.join('、')}｜查核日 ${checkedOn}`);
      }
    }
  }

  console.log(`歲時記資料稽核｜東京曆日 ${today}`);
  printSection(`查核日已超過 ${STALE_AFTER_DAYS} 天`, stale);
  printSection(`估計在 ${TBA_LOOKAHEAD_DAYS} 天內舉行且仍待公告`, upcomingTba);
  printSection('仍採例年日期', usual);
}

try {
  const { values } = parseArgs({ options: { today: { type: 'string' } } });
  const today = values.today ?? tokyoToday(new Date());
  if (!parseIsoDay(today)) throw new Error('--today 需要有效的 YYYY-MM-DD 曆日');
  auditEvents(today);
} catch (error) {
  console.error(`歲時記資料稽核無法產生報告｜${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1; // the report could not be made (bad --today or missing data); findings alone never fail
}
