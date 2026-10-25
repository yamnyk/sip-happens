import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { CRITERIA, SCORE_MAX, SCORE_MIN, groupOf } from '../../config/criteria';
import {
  activeRangeCount,
  criterionAverages,
  drinkPassesRanges,
  drinkPassesTotal,
  isRangeActive,
  matchesQuery,
  rangeKey,
  type CriterionRanges,
} from '../../lib/catalogFilter';
import { drinkStats } from '../../lib/score';
import { useDrinks, useReviews, useSubtypes } from '../../data/queries';
import { drinkTypeLabel } from '../../lib/subtype';
import { strings, typeLabels } from '../../strings';
import { useSubtypesById } from '../subtypes/useSubtypesById';
import type { DrinkGroup, DrinkType, Review } from '../../types/domain';
import { browseStrings as t } from './strings';
import { ScoreBadge } from './ScoreBadge';

type Filter = 'all' | 'wine' | DrinkType;
type Sort = 'best' | 'worst' | 'new' | 'old' | 'name' | 'reviews';
const SORTS: Sort[] = ['best', 'worst', 'new', 'old', 'name', 'reviews'];
const ALL_OTHER = 'all-other';
const SCORE_OPTIONS = Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, i) => SCORE_MIN + i);
const FULL_RANGE: [number, number] = [SCORE_MIN, SCORE_MAX];

/** Groups whose criteria the panel shows. "All" shows none: it only offers the total rating range. */
function groupsForFilter(filter: Filter): DrinkGroup[] {
  if (filter === 'all') return [];
  if (filter === 'wine') return ['wine'];
  return [groupOf(filter)];
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: t.catalog.filterAll },
  { id: 'wine', label: t.catalog.filterWine },
  { id: 'red', label: typeLabels.red },
  { id: 'white', label: typeLabels.white },
  { id: 'rose', label: typeLabels.rose },
  { id: 'sparkling', label: typeLabels.sparkling },
  { id: 'port', label: typeLabels.port },
  { id: 'gin', label: typeLabels.gin },
  { id: 'other', label: typeLabels.other },
];

function clampBound(range: [number, number], bound: 0 | 1, value: number): [number, number] {
  const [min, max] = range;
  return bound === 0 ? [value, Math.max(value, max)] : [Math.min(value, min), value];
}

function RangeRow({
  label,
  min,
  max,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  onChange: (bound: 0 | 1, value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-neutral-300">{label}</span>
      <div className="flex items-center gap-2 text-sm text-neutral-400">
        {([0, 1] as const).map((bound) => (
          <label key={bound} className="flex flex-1 items-center gap-2">
            <span>{bound === 0 ? t.catalog.rangeFrom : t.catalog.rangeTo}</span>
            <select
              value={bound === 0 ? min : max}
              onChange={(e) => onChange(bound, Number(e.target.value))}
              aria-label={`${label}, ${bound === 0 ? t.catalog.rangeFrom : t.catalog.rangeTo}`}
              className="h-11 flex-1 rounded-lg bg-neutral-800 px-3 text-neutral-100"
            >
              {SCORE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function CatalogPage() {
  const drinks = useDrinks();
  const reviews = useReviews();
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('best');
  const [sortOpen, setSortOpen] = useState(false);
  const [subFilter, setSubFilter] = useState<string>(ALL_OTHER);
  const [query, setQuery] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [ranges, setRanges] = useState<CriterionRanges>({});
  const [totalRange, setTotalRange] = useState<[number, number]>(FULL_RANGE);
  const subtypesQ = useSubtypes();
  const subtypesById = useSubtypesById();
  const subtypeList = useMemo(
    () => [...(subtypesQ.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'uk')),
    [subtypesQ.data],
  );

  const rows = useMemo(() => {
    const byDrink = new Map<string, Review[]>();
    for (const r of reviews.data ?? []) {
      const list = byDrink.get(r.drink_id);
      if (list) list.push(r);
      else byDrink.set(r.drink_id, [r]);
    }
    const filtered = (drinks.data ?? []).filter((d) => {
      if (filter === 'all') return true;
      if (filter === 'wine') return groupOf(d.type) === 'wine';
      if (filter === 'other' && subFilter !== ALL_OTHER) return d.type === 'other' && d.subtype_id === subFilter;
      return d.type === filter;
    });
    const withStats = filtered.map((d) => {
      const group = groupOf(d.type);
      const list = byDrink.get(d.id) ?? [];
      return { drink: d, group, stats: drinkStats(group, list), averages: criterionAverages(group, list) };
    });
    type Row = (typeof withStats)[number];
    const newest = (a: Row, b: Row) => b.drink.created_at.localeCompare(a.drink.created_at);
    // Unrated drinks always sink to the bottom, whichever way the rating is sorted.
    const byRating = (a: Row, b: Row, dir: 1 | -1) => {
      const av = a.stats.average;
      const bv = b.stats.average;
      if (av === null && bv === null) return newest(a, b);
      if (av === null) return 1;
      if (bv === null) return -1;
      return dir * (bv - av) || b.stats.count - a.stats.count;
    };
    withStats.sort((a, b) => {
      switch (sort) {
        case 'best':
          return byRating(a, b, 1);
        case 'worst':
          return byRating(a, b, -1);
        case 'new':
          return newest(a, b);
        case 'old':
          return -newest(a, b);
        case 'name':
          return a.drink.name.localeCompare(b.drink.name, 'uk');
        case 'reviews':
          return b.stats.count - a.stats.count || newest(a, b);
      }
    });
    return withStats;
  }, [drinks.data, reviews.data, filter, subFilter, sort]);

  const shownGroups = groupsForFilter(filter);
  const effectiveRanges = useMemo(() => {
    const groups = groupsForFilter(filter);
    const out: CriterionRanges = {};
    for (const [key, range] of Object.entries(ranges)) {
      if (groups.some((g) => key.startsWith(`${g}.`))) out[key] = range;
    }
    return out;
  }, [ranges, filter]);
  const activeCount = filter === 'all' ? (isRangeActive(totalRange) ? 1 : 0) : activeRangeCount(effectiveRanges);

  const visibleRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          matchesQuery(r.drink.name, query) &&
          (filter === 'all'
            ? drinkPassesTotal(r.stats.average, totalRange)
            : drinkPassesRanges(r.group, r.averages, effectiveRanges)),
      ),
    [rows, query, filter, totalRange, effectiveRanges],
  );

  if (drinks.isLoading || reviews.isLoading) return <p className="py-4 text-neutral-400">{strings.common.loading}</p>;
  if (drinks.isError || reviews.isError) return <p className="py-4 text-rose-300">{strings.common.error}</p>;

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.catalog.searchPlaceholder}
          aria-label={t.catalog.searchPlaceholder}
          autoComplete="off"
          className="h-11 w-full rounded-xl bg-neutral-900 pl-4 pr-11 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        {query !== '' && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label={t.catalog.searchClear}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-neutral-400"
          >
            <span aria-hidden="true">✕</span>
          </button>
        )}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              setFilter(f.id);
              setSubFilter(ALL_OTHER);
            }}
            aria-pressed={filter === f.id}
            className={`min-h-11 shrink-0 rounded-full px-4 text-sm ${
              filter === f.id ? 'bg-amber-400 font-medium text-neutral-950' : 'bg-neutral-900 text-neutral-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filter === 'other' && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {[{ id: ALL_OTHER, label: t.catalog.filterAllOther }, ...subtypeList.map((x) => ({ id: x.id, label: x.name }))].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSubFilter(f.id)}
              aria-pressed={subFilter === f.id}
              className={`min-h-11 shrink-0 rounded-full px-4 text-sm ${
                subFilter === f.id ? 'bg-amber-400 font-medium text-neutral-950' : 'bg-neutral-900 text-neutral-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPanelOpen((v) => !v)}
            aria-expanded={panelOpen}
            aria-controls="catalog-filter-panel"
            className="flex min-h-11 items-center gap-2 rounded-lg bg-neutral-900 px-3 text-sm text-neutral-300"
          >
            <span>{t.catalog.filters}</span>
            {activeCount > 0 && (
              <span className="rounded-full bg-amber-400 px-2 text-xs font-medium text-neutral-950">{activeCount}</span>
            )}
            <svg
              viewBox="0 0 20 20"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
              className={`transition-transform ${panelOpen ? 'rotate-180' : ''}`}
            >
              <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setSortOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
              aria-label={`${t.catalog.sortLabel}: ${t.catalog.sortOptions[sort]}`}
              className="flex min-h-11 items-center gap-2 rounded-lg bg-neutral-900 px-3 text-sm text-neutral-300"
            >
              <svg
                viewBox="0 0 20 20"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M6 15V5m0 0L3 8m3-3l3 3M14 5v10m0 0l-3-3m3 3l3-3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{t.catalog.sortOptions[sort]}</span>
            </button>
            {sortOpen && (
              <>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-hidden="true"
                  onClick={() => setSortOpen(false)}
                  className="fixed inset-0 z-10 cursor-default"
                />
                <ul
                  role="listbox"
                  aria-label={t.catalog.sortLabel}
                  className="absolute left-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 shadow-lg"
                >
                  {SORTS.map((s) => (
                    <li key={s} role="option" aria-selected={sort === s}>
                      <button
                        type="button"
                        onClick={() => {
                          setSort(s);
                          setSortOpen(false);
                        }}
                        className={`flex min-h-11 w-full items-center justify-between px-4 text-left text-sm ${
                          sort === s ? 'text-amber-400' : 'text-neutral-200'
                        }`}
                      >
                        <span>{t.catalog.sortOptions[s]}</span>
                        {sort === s && <span aria-hidden="true">✓</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setRanges({});
                setTotalRange(FULL_RANGE);
              }}
              className="min-h-11 rounded-lg px-3 text-sm text-amber-400"
            >
              {t.catalog.filtersReset}
            </button>
          )}
          <p className="ml-auto text-sm text-neutral-400">{t.catalog.found(visibleRows.length)}</p>
        </div>

        {panelOpen && (
          <div id="catalog-filter-panel" className="flex flex-col gap-4 rounded-xl bg-neutral-900 p-4">
            {filter === 'all' ? (
              <RangeRow
                label={t.catalog.totalRating}
                min={totalRange[0]}
                max={totalRange[1]}
                onChange={(bound, value) => setTotalRange((prev) => clampBound(prev, bound, value))}
              />
            ) : (
              shownGroups.flatMap((g) =>
                CRITERIA[g].map((c) => {
                  const key = rangeKey(g, c.key);
                  const [min, max] = ranges[key] ?? FULL_RANGE;
                  return (
                    <RangeRow
                      key={key}
                      label={c.label}
                      min={min}
                      max={max}
                      onChange={(bound, value) =>
                        setRanges((prev) => ({ ...prev, [key]: clampBound(prev[key] ?? FULL_RANGE, bound, value) }))
                      }
                    />
                  );
                }),
              )
            )}
          </div>
        )}
      </div>

      {visibleRows.length === 0 ? (
        <p className="py-8 text-center text-neutral-500">{rows.length === 0 ? t.catalog.noResults : t.catalog.noMatches}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visibleRows.map(({ drink, stats }) => (
            <li key={drink.id}>
              <Link
                to={`/drink/${drink.id}`}
                className="flex min-h-16 items-center justify-between gap-3 rounded-xl bg-neutral-900 px-4 py-3 active:bg-neutral-800"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{drink.name}</p>
                  <p className="text-sm text-neutral-400">
                    {drinkTypeLabel(drink, subtypesById)} · {t.catalog.reviewsCount(stats.count)}
                  </p>
                </div>
                <ScoreBadge score={stats.average} size="lg" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
