import { useMemo } from "react";
import {
  drinkPassesRanges,
  drinkPassesTotal,
  matchesQuery,
} from "#shared/lib/catalogFilter.js";
import { useDrinks, useReviews, useSubtypes } from "#shared/api/queries.js";
import { strings } from "#shared/strings.js";
import { useSubtypesById } from "#modules/subtypes/index.js";
import { PageStatus } from "#shared/ui/Status.js";
import { catalogStrings as t } from "./strings.js";
import { ALL_OTHER, buildRows } from "./catalogRows.js";
import { FILTERS } from "./catalogConfig.js";
import { useCatalogFilters } from "./useCatalogFilters.js";
import { SearchBox } from "./SearchBox.js";
import { FilterChips } from "./FilterChips.js";
import { FilterPanel } from "./FilterPanel.js";
import { DrinkListItem } from "./DrinkListItem.js";

export function CatalogPage() {
  const drinks = useDrinks();
  const reviews = useReviews();
  const f = useCatalogFilters();
  const subtypesQ = useSubtypes();
  const subtypesById = useSubtypesById();
  const subtypeOptions = useMemo(
    () => [
      { id: ALL_OTHER, label: t.catalog.filterAllOther },
      ...[...(subtypesQ.data ?? [])]
        .sort((a, b) => a.name.localeCompare(b.name, "uk"))
        .map((x) => ({ id: x.id, label: x.name })),
    ],
    [subtypesQ.data],
  );

  const rows = useMemo(
    () =>
      buildRows(
        drinks.data ?? [],
        reviews.data ?? [],
        f.filter,
        f.subFilter,
        f.sort,
      ),
    [drinks.data, reviews.data, f.filter, f.subFilter, f.sort],
  );

  const visibleRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          matchesQuery(r.drink.name, f.query) &&
          (f.filter === "all"
            ? drinkPassesTotal(r.stats.average, f.totalRange)
            : drinkPassesRanges(r.group, r.averages, f.effectiveRanges)),
      ),
    [rows, f.query, f.filter, f.totalRange, f.effectiveRanges],
  );

  if (drinks.isLoading || reviews.isLoading)
    return <PageStatus>{strings.common.loading}</PageStatus>;
  if (drinks.isError || reviews.isError)
    return <PageStatus tone="error">{strings.common.error}</PageStatus>;

  return (
    <div className="flex flex-col gap-4 py-2">
      <SearchBox value={f.query} onChange={f.setQuery} />
      <FilterChips
        options={FILTERS}
        selected={f.filter}
        onSelect={f.setFilter}
      />
      {f.filter === "other" && (
        <FilterChips
          options={subtypeOptions}
          selected={f.subFilter}
          onSelect={f.setSubFilter}
        />
      )}
      <FilterPanel
        isAll={f.filter === "all"}
        shownGroups={f.shownGroups}
        ranges={f.ranges}
        totalRange={f.totalRange}
        activeCount={f.activeCount}
        foundCount={visibleRows.length}
        sort={f.sort}
        onSortChange={f.setSort}
        onTotalBound={f.setTotalBound}
        onRangeBound={f.setRangeBound}
        onReset={f.reset}
      />
      {visibleRows.length === 0 ? (
        <p className="py-8 text-center text-neutral-500">
          {rows.length === 0 ? t.catalog.noResults : t.catalog.noMatches}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visibleRows.map(({ drink, stats }) => (
            <DrinkListItem
              key={drink.id}
              drink={drink}
              stats={stats}
              subtypesById={subtypesById}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
