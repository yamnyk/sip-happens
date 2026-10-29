import { CRITERIA, SCORE_MAX, SCORE_MIN } from "../config/criteria";
import type { DrinkGroup, Review, Scores } from "../types/domain";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function isValidScore(v: unknown): v is number {
  return (
    typeof v === "number" &&
    Number.isInteger(v) &&
    v >= SCORE_MIN &&
    v <= SCORE_MAX
  );
}

/** True when every criterion of the group has a valid integer score. */
export function isCompleteScores(
  group: DrinkGroup,
  scores: Partial<Scores> | null | undefined,
): boolean {
  if (!scores) return false;
  return CRITERIA[group].every((c) => isValidScore(scores[c.key]));
}

function weightedTotal(group: DrinkGroup, scores: Scores): number {
  const criteria = CRITERIA[group];
  const weightSum = criteria.reduce((acc, c) => acc + c.weight, 0);
  const sum = criteria.reduce((acc, c) => acc + c.weight * scores[c.key], 0);
  return sum / weightSum;
}

/** Weighted average on the 0-10 scale, one decimal. Null when scores are incomplete. */
export function computeTotal(
  group: DrinkGroup,
  scores: Partial<Scores> | null | undefined,
): number | null {
  if (!isCompleteScores(group, scores)) return null;
  return round1(weightedTotal(group, scores as Scores));
}

function authorScoreRaw(group: DrinkGroup, review: Review): number | null {
  if (isCompleteScores(group, review.final_scores))
    return weightedTotal(group, review.final_scores as Scores);
  if (isCompleteScores(group, review.first_scores))
    return weightedTotal(group, review.first_scores as Scores);
  return null;
}

/** Final total if all final scores are filled, else first-impression total, else null. */
export function authorScore(group: DrinkGroup, review: Review): number | null {
  const raw = authorScoreRaw(group, review);
  return raw === null ? null : round1(raw);
}

interface DrinkStats {
  /** Mean of author scores, one decimal. Null when nobody scored. */
  average: number | null;
  /** Number of reviews (scored or not). */
  count: number;
}

export function drinkStats(
  group: DrinkGroup,
  reviews: readonly Review[],
): DrinkStats {
  const raws = reviews
    .map((r) => authorScoreRaw(group, r))
    .filter((v): v is number => v !== null);
  const average =
    raws.length === 0
      ? null
      : round1(raws.reduce((a, b) => a + b, 0) / raws.length);
  return { average, count: reviews.length };
}
