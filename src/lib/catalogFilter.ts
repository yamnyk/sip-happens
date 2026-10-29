import { CRITERIA, SCORE_MAX, SCORE_MIN } from "../config/criteria";
import type { DrinkGroup, Review, Scores } from "../types/domain";
import { isCompleteScores } from "./score";

/** Per-criterion inclusive [min, max] ranges, keyed `${group}.${criterionKey}`. */
export type CriterionRanges = Record<string, [number, number]>;

export function rangeKey(group: DrinkGroup, criterionKey: string): string {
  return `${group}.${criterionKey}`;
}

/** Case- and accent-insensitive normal form: NFD, combining marks stripped, lowercase, trimmed. */
export function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/** Substring match on folded strings. An empty query matches everything. */
export function matchesQuery(name: string, query: string): boolean {
  const q = fold(query);
  if (q === "") return true;
  return fold(name).includes(q);
}

/**
 * Mean score per criterion over the reviews. Per review the scores used are final_scores when
 * complete for the group, else first_scores when complete, else the review is skipped.
 * Null for a criterion when no review contributed.
 */
export function criterionAverages(
  group: DrinkGroup,
  reviews: readonly Review[],
): Record<string, number | null> {
  const used: Scores[] = [];
  for (const r of reviews) {
    if (isCompleteScores(group, r.final_scores))
      used.push(r.final_scores as Scores);
    else if (isCompleteScores(group, r.first_scores))
      used.push(r.first_scores as Scores);
  }
  const out: Record<string, number | null> = {};
  for (const c of CRITERIA[group]) {
    out[c.key] =
      used.length === 0
        ? null
        : used.reduce((acc, s) => acc + s[c.key], 0) / used.length;
  }
  return out;
}

function isActive(range: [number, number]): boolean {
  return range[0] !== SCORE_MIN || range[1] !== SCORE_MAX;
}

/** Number of ranges that differ from the full 0-10 scale. */
export function activeRangeCount(ranges: CriterionRanges): number {
  return Object.values(ranges).filter(isActive).length;
}

/**
 * Whether a drink of `group` passes. `ranges` must already be limited to the groups currently shown.
 * No active ranges: everything passes. Otherwise the drink needs active ranges in its own group and
 * must satisfy all of them (AND within group, OR across groups). Missing data fails an active range.
 */
export function drinkPassesRanges(
  group: DrinkGroup,
  averages: Record<string, number | null>,
  ranges: CriterionRanges,
): boolean {
  const active = Object.entries(ranges).filter(([, r]) => isActive(r));
  if (active.length === 0) return true;
  const prefix = `${group}.`;
  const own = active.filter(([key]) => key.startsWith(prefix));
  if (own.length === 0) return false;
  return own.every(([key, [min, max]]) => {
    const avg = averages[key.slice(prefix.length)];
    return avg !== null && avg !== undefined && avg >= min && avg <= max;
  });
}

export function isRangeActive(range: [number, number]): boolean {
  return isActive(range);
}

/** Overall rating range for the "all types" view. Inclusive; a drink without a rating fails an active range. */
export function drinkPassesTotal(
  average: number | null,
  range: [number, number],
): boolean {
  if (!isActive(range)) return true;
  return average !== null && average >= range[0] && average <= range[1];
}
