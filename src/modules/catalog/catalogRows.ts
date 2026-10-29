import { groupOf } from "#shared/config/criteria.js";
import {
  criterionAverages,
  type CriterionRanges,
} from "#shared/lib/catalogFilter.js";
import { drinkStats } from "#shared/lib/score.js";
import type { Drink, DrinkGroup, DrinkType, Review } from "#contract/domain.js";

export type Filter = "all" | "wine" | DrinkType;
export type Sort = "best" | "worst" | "new" | "old" | "name" | "reviews";

/** Sentinel subtype filter value meaning "every subtype of type other". */
export const ALL_OTHER = "all-other";

export type CatalogRow = {
  drink: Drink;
  group: DrinkGroup;
  stats: ReturnType<typeof drinkStats>;
  averages: Record<string, number | null>;
};

/** Groups whose criteria the panel shows. "All" shows none: it only offers the total rating range. */
export function groupsForFilter(filter: Filter): DrinkGroup[] {
  if (filter === "all") return [];
  if (filter === "wine") return ["wine"];
  return [groupOf(filter)];
}

/** Move one bound of a range, pushing the other bound along so min never exceeds max. */
export function clampBound(
  range: [number, number],
  bound: 0 | 1,
  value: number,
): [number, number] {
  const [min, max] = range;
  return bound === 0
    ? [value, Math.max(value, max)]
    : [Math.min(value, min), value];
}

/** Keeps only the ranges that belong to groups shown by the current filter. */
export function selectEffectiveRanges(
  ranges: CriterionRanges,
  filter: Filter,
): CriterionRanges {
  const groups = groupsForFilter(filter);
  const out: CriterionRanges = {};
  for (const [key, range] of Object.entries(ranges)) {
    if (groups.some((g) => key.startsWith(`${g}.`))) out[key] = range;
  }
  return out;
}

function newest(a: CatalogRow, b: CatalogRow): number {
  return b.drink.created_at.localeCompare(a.drink.created_at);
}

/** Unrated drinks always sink to the bottom, whichever way the rating is sorted. */
function byRating(a: CatalogRow, b: CatalogRow, dir: 1 | -1): number {
  const av = a.stats.average;
  const bv = b.stats.average;
  if (av === null && bv === null) return newest(a, b);
  if (av === null) return 1;
  if (bv === null) return -1;
  return dir * (bv - av) || b.stats.count - a.stats.count;
}

/** Comparator for a sort mode, with the tie-breaks of the catalog list. */
export function compareRows(
  sort: Sort,
): (a: CatalogRow, b: CatalogRow) => number {
  switch (sort) {
    case "best":
      return (a, b) => byRating(a, b, 1);
    case "worst":
      return (a, b) => byRating(a, b, -1);
    case "new":
      return newest;
    case "old":
      return (a, b) => -newest(a, b);
    case "name":
      return (a, b) => a.drink.name.localeCompare(b.drink.name, "uk");
    case "reviews":
      return (a, b) => b.stats.count - a.stats.count || newest(a, b);
  }
}

/** Joins drinks with their review stats, applies the type filters and sorts. */
export function buildRows(
  drinks: readonly Drink[],
  reviews: readonly Review[],
  filter: Filter,
  subFilter: string,
  sort: Sort,
): CatalogRow[] {
  const byDrink = new Map<string, Review[]>();
  for (const r of reviews) {
    const list = byDrink.get(r.drink_id);
    if (list) list.push(r);
    else byDrink.set(r.drink_id, [r]);
  }
  const rows = drinks
    .filter((d) => {
      if (filter === "all") return true;
      if (filter === "wine") return groupOf(d.type) === "wine";
      if (filter === "other" && subFilter !== ALL_OTHER)
        return d.type === "other" && d.subtype_id === subFilter;
      return d.type === filter;
    })
    .map((d): CatalogRow => {
      const group = groupOf(d.type);
      const list = byDrink.get(d.id) ?? [];
      return {
        drink: d,
        group,
        stats: drinkStats(group, list),
        averages: criterionAverages(group, list),
      };
    });
  return rows.sort(compareRows(sort));
}
