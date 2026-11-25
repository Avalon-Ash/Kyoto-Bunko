import { useEffect, useId, useState, type FormEvent } from 'react';
import { EVENT_OCCURRENCES, loadEvents, type LoadedEvent } from '../data/events/loader';
import { SEASON_MONTHS, type Season } from '../data/events/seasons';
import { STATUS_RULES, type IsoDate } from '../data/events/types';
import { translate } from '../data/i18n';
import { getSpotLocation } from '../data/municipalities';
import { loadSpotsByWard } from '../data/spots-loader';
import {
  isStale, listSeason, queryRange, seasonBounds, sessionDates, tokyoToday, validateRange,
  type RangeErrorCode, type SeasonalQueryMatch,
} from '../lib/seasonal-query';
import type { Lang } from '../types';

const SEASONS = Object.keys(SEASON_MONTHS) as Season[];
const CATALOG_YEAR = Math.max(...Object.keys(EVENT_OCCURRENCES).map(Number));
const WINTER_BOUNDS = seasonBounds(CATALOG_YEAR, 'winter');
const LOCALES: Record<Lang, string> = { zh: 'zh-TW', ja: 'ja-JP' };

interface DateRange {
  from: IsoDate;
  to: IsoDate;
}

interface SeasonalCatalog {
  events: LoadedEvent[];
  spotNames: ReadonlyMap<string, string>;
  checkedOn: IsoDate;
}

async function loadCatalog(lang: Lang): Promise<SeasonalCatalog> {
  const events = (await loadEvents(lang)).flatMap(event => {
    const occurrences = event.occurrences.filter(occurrence => occurrence.year === CATALOG_YEAR);
    return occurrences.length ? [{ ...event, occurrences }] : [];
  });
  const venues = events.flatMap(event => event.venues).filter(venue => venue.kind === 'spot');
  const wards = new Set(venues.map(venue => venue.wardId));
  const spots = (await Promise.all([...wards].map(ward => loadSpotsByWard(ward, lang)))).flat();
  const spotNames = new Map(spots.map(spot => [spot.id, spot.name]));
  const missingVenue = venues.find(venue => !spotNames.has(venue.spotId));
  if (missingVenue) throw new Error(`Missing event venue name: ${missingVenue.spotId}`);

  const checkedOn = events.flatMap(event => event.occurrences.map(row => row.source.checkedOn)).sort().at(-1) ?? '';
  return { events, spotNames, checkedOn };
}

function calendarDay(date: IsoDate): Date {
  return new Date(`${date}T00:00:00Z`);
}

function seasonalFormats(lang: Lang) {
  const locale = LOCALES[lang];
  return {
    date: new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }),
    month: new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }),
    list: new Intl.ListFormat(locale, { type: 'unit' }),
    number: new Intl.NumberFormat(locale, { useGrouping: false }),
  };
}

function formatDates(dates: IsoDate[], formats: ReturnType<typeof seasonalFormats>): string {
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (first !== last && sessionDates({ start: first, end: last }).length === dates.length) {
    // formatRange falls back to a numeric style in some browsers (2027/10/1至2027/10/5); format both ends like single days.
    return `${formats.date.format(calendarDay(first))} – ${formats.date.format(calendarDay(last))}`;
  }
  return formats.list.format(dates.map(date => formats.date.format(calendarDay(date))));
}

function SeasonalEntry({ match, lang, today, spotNames, formats }: {
  match: SeasonalQueryMatch<LoadedEvent>;
  lang: Lang;
  today: IsoDate;
  spotNames: SeasonalCatalog['spotNames'];
  formats: ReturnType<typeof seasonalFormats>;
}) {
  const { event, occurrence, dates } = match;
  const rule = STATUS_RULES[occurrence.status];
  const summary = occurrence.basis === 'usual' ? rule.usualSummary ?? rule.summary : rule.summary;
  const showDates = rule.dateQuery === 'with-sessions' && dates.length > 0;
  const matchedDays = new Set(dates);
  const times = showDates ? occurrence.sessions.flatMap(session => {
    if (!session.hours) return [];
    const days = sessionDates(session).filter(date => matchedDays.has(date));
    return days.length ? [{ days, ...session.hours }] : [];
  }) : [];

  const venues = event.venues.map(venue => {
    const location = getSpotLocation(venue);
    const city = location.city[lang];
    if (venue.kind === 'ward') return location.ward?.[lang] ?? city;
    const name = spotNames.get(venue.spotId) ?? venue.spotId;
    return location.isNearby ? `${name}（${city}）` : name;
  });

  return (
    <li className="seasonal-entry">
      <h3>{event.name}</h3>
      <p className="ui-muted">{formats.list.format([...new Set(venues)])}</p>
      <p className="seasonal-status">
        <span>{translate(`seasonal_status_${summary}`, lang)}</span>
        {isStale(occurrence.source.checkedOn, today) && (
          <span>{translate('seasonal_stale', lang)}</span>
        )}
      </p>
      {summary === 'usual-months' && (
        <p>{translate('seasonal_usual_months', lang).replace('{months}', formats.list.format(
          event.usualMonths.map(month => formats.month.format(new Date(Date.UTC(CATALOG_YEAR, month - 1, 1)))),
        ))}</p>
      )}
      {showDates && <p>{formatDates(dates, formats)}</p>}
      {times.map(({ days, open, close }, index) => (
        <p key={index} className="seasonal-time">
          {days.length !== dates.length && <>{formatDates(days, formats)}<br /></>}
          <time dateTime={open}>{open}</time>–<time dateTime={close}>{close}</time>
        </p>
      ))}
      <a className="seasonal-official" href={event.officialUrl} target="_blank" rel="noopener"
        aria-label={translate('seasonal_official_event', lang).replace('{name}', event.name)}>
        {translate('seasonal_official', lang)} <span aria-hidden="true">↗</span>
      </a>
    </li>
  );
}

export function SeasonalView({ lang }: { lang: Lang }) {
  const today = tokyoToday(new Date());
  const [season, setSeason] = useState<Season>(() => {
    const currentMonth = Number(today.split('-')[1]);
    return SEASONS.find(key => SEASON_MONTHS[key].some(month => month === currentMonth)) ?? SEASONS[0];
  });
  const [draft, setDraft] = useState<DateRange>({ from: '', to: '' });
  const { from, to } = draft;
  const [range, setRange] = useState<DateRange | null>(null);
  const [error, setError] = useState<RangeErrorCode | null>(null);
  const [catalog, setCatalog] = useState<{ lang: Lang; data: SeasonalCatalog | null } | null>(null);
  const id = useId();

  useEffect(() => {
    let current = true;
    loadCatalog(lang).then(data => {
      if (current) setCatalog({ lang, data });
    }).catch((error: unknown) => {
      if (current) {
        console.error(error);
        setCatalog({ lang, data: null });
      }
    });
    return () => { current = false; };
  }, [lang]);

  const currentCatalog = catalog?.lang === lang ? catalog : null;
  const data = currentCatalog?.data;
  const t = (key: string) => translate(key, lang);
  const formats = seasonalFormats(lang);
  const matches = data ? (range
    ? queryRange(data.events, range.from, range.to)
    : listSeason(data.events, CATALOG_YEAR, season)) : [];

  function submitRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateRange(from, to);
    setError(validation);
    if (validation) {
      const field = event.currentTarget.elements.namedItem(from ? 'to' : 'from');
      if (field instanceof HTMLInputElement) field.focus();
      return;
    }
    setRange(draft);
  }

  function changeDate(field: keyof DateRange, value: IsoDate) {
    setDraft(previous => ({ ...previous, [field]: value }));
    setError(null);
    if (!value) setRange(null);
  }

  function clearRange() {
    setDraft({ from: '', to: '' });
    setRange(null);
    setError(null);
  }

  const errorId = `${id}-range-error`;
  const fromInvalid = error === 'invalid-date' && !from;
  const toInvalid = error === 'end-before-start' || (error === 'invalid-date' && !to);
  const winterRange = [WINTER_BOUNDS.from, WINTER_BOUNDS.to].map(date => {
    const [year, month] = date.split('-');
    return `${formats.number.format(Number(year))}/${formats.number.format(Number(month))}`;
  }).join('–');

  return (
    <section className="bunko-index seasonal-index" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="seasonal-title">
        {t('seasonal_title').replace('{year}', formats.number.format(CATALOG_YEAR))}
      </h2>
      {data && <p className="index-caption">{t('seasonal_caption')
        .replace('{n}', formats.number.format(data.events.length)).replace('{date}', data.checkedOn)}</p>}

      <section className="index-group">
        <h2 id={`${id}-seasons`}>{t('seasonal_seasons')}</h2>
        <div className="seasonal-controls" role="group" aria-labelledby={`${id}-seasons`}>
          {SEASONS.map(key => (
            <button key={key} className="ui-button" type="button" aria-pressed={!range && key === season}
              onClick={() => { setSeason(key); clearRange(); }}>
              {t(`seasonal_${key}`)}{key === 'winter' && <small>{winterRange}</small>}
            </button>
          ))}
        </div>
      </section>

      <section className="index-group">
        <h2 id={`${id}-range`}>{t('seasonal_range')}</h2>
        <form aria-labelledby={`${id}-range`} noValidate onSubmit={submitRange}>
          <div className="seasonal-fields">
            <label htmlFor={`${id}-from`}>{t('seasonal_from')}
              <input id={`${id}-from`} name="from" type="date" value={from} required
                aria-invalid={fromInvalid} aria-describedby={fromInvalid ? errorId : undefined}
                onChange={event => changeDate('from', event.target.value)} />
            </label>
            <label htmlFor={`${id}-to`}>{t('seasonal_to')}
              <input id={`${id}-to`} name="to" type="date" value={to} required
                aria-invalid={toInvalid} aria-describedby={toInvalid ? errorId : undefined}
                onChange={event => changeDate('to', event.target.value)} />
            </label>
          </div>
          {error && <p className="seasonal-error" id={errorId} role="alert">{t(`seasonal_error_${error}`)}</p>}
          <div className="seasonal-controls seasonal-actions">
            <button className="ui-button" type="submit">{t('seasonal_search')}</button>
            <button className="ui-button" type="button" onClick={clearRange}>{t('seasonal_clear')}</button>
          </div>
        </form>
      </section>

      <section className="index-group" aria-labelledby={`${id}-results`}>
        <h2 id={`${id}-results`}>{range
          ? formats.date.formatRange(calendarDay(range.from), calendarDay(range.to))
          : t(`seasonal_${season}`)}</h2>
        <p className="ui-muted seasonal-result-summary" role="status">
          {data === null ? t('seasonal_load_failed') : !data ? t('loading')
            : matches.length ? t('seasonal_result_count').replace('{n}', formats.number.format(matches.length))
              : t(range ? 'seasonal_empty_range' : 'seasonal_empty_season')}
        </p>
        {data && matches.length > 0 && (
          <ul className="seasonal-results" role="list">
            {matches.map(match => (
              <SeasonalEntry key={`${match.event.id}:${match.occurrence.year}`} match={match} lang={lang}
                today={today} spotNames={data.spotNames} formats={formats} />
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
