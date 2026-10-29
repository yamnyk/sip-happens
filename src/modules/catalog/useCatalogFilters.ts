import { useMemo, useState } from "react";
import {
  activeRangeCount,
  isRangeActive,
  type CriterionRanges,
} from "#shared/lib/catalogFilter.js";
import {
  ALL_OTHER,
  clampBound,
  groupsForFilter,
  selectEffectiveRanges,
  type Filter,
  type Sort,
} from "./catalogRows.js";
import { FULL_RANGE } from "./catalogConfig.js";

/** Catalog filter, sort, search and range state plus the values derived from it. */
export function useCatalogFilters() {
  const [filter, setFilterState] = useState<Filter>("all");
  const [subFilter, setSubFilter] = useState<string>(ALL_OTHER);
  const [sort, setSort] = useState<Sort>("best");
  const [query, setQuery] = useState("");
  const [ranges, setRanges] = useState<CriterionRanges>({});
  const [totalRange, setTotalRange] = useState<[number, number]>(FULL_RANGE);

  const shownGroups = groupsForFilter(filter);
  const effectiveRanges = useMemo(
    () => selectEffectiveRanges(ranges, filter),
    [ranges, filter],
  );
  const activeCount =
    filter === "all"
      ? isRangeActive(totalRange)
        ? 1
        : 0
      : activeRangeCount(effectiveRanges);

  /** Changing the type filter also clears the subtype filter. */
  const setFilter = (next: Filter) => {
    setFilterState(next);
    setSubFilter(ALL_OTHER);
  };
  const setTotalBound = (bound: 0 | 1, value: number) =>
    setTotalRange((prev) => clampBound(prev, bound, value));
  const setRangeBound = (key: string, bound: 0 | 1, value: number) =>
    setRanges((prev) => ({
      ...prev,
      [key]: clampBound(prev[key] ?? FULL_RANGE, bound, value),
    }));
  const reset = () => {
    setRanges({});
    setTotalRange(FULL_RANGE);
  };

  return {
    filter,
    setFilter,
    subFilter,
    setSubFilter,
    sort,
    setSort,
    query,
    setQuery,
    ranges,
    totalRange,
    setTotalBound,
    setRangeBound,
    reset,
    shownGroups,
    effectiveRanges,
    activeCount,
  };
}
