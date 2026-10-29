import type { Drink, Review } from "#contract/domain.js";
import { groupOf } from "#shared/config/criteria.js";
import { authorScore } from "#shared/lib/score.js";

/** One review of a drink joined with its author nick and author score. */
export interface DrinkReviewRow {
  review: Review;
  nick: string;
  /** The author is banned. */
  disabled: boolean;
  score: number | null;
}

/**
 * Reviews of one drink with author nicks and scores, best score first.
 * Unscored reviews go last; authors without a profile get `unknownNick`.
 */
export function buildDrinkReviewRows(
  drink: Drink,
  reviews: readonly Review[],
  profiles: readonly { id: string; nick: string; disabled?: boolean }[],
  unknownNick: string,
): DrinkReviewRow[] {
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const group = groupOf(drink.type);
  return reviews
    .filter((r) => r.drink_id === drink.id)
    .map((r) => ({
      review: r,
      nick: byId.get(r.author_id)?.nick ?? unknownNick,
      disabled: byId.get(r.author_id)?.disabled ?? false,
      score: authorScore(group, r),
    }))
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}
