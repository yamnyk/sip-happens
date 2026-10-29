import { groupOf } from "#shared/config/criteria.js";
import { authorScore, round1 } from "#shared/lib/score.js";
import { drinkTypeLabel } from "#shared/lib/subtype.js";
import { DRINK_TYPES } from "#contract/domain.js";
import type { Drink, DrinkSubtype, Review } from "#contract/domain.js";

export interface PersonReview {
  review: Review;
  drink: Drink;
  score: number | null;
}

export interface TypeAverage {
  key: string;
  label: string;
  order: number;
  avg: number;
  n: number;
}

/**
 * A person's reviews (in input order, skipping reviews of unknown drinks) and
 * their average score per displayed type. Fixed types come in their usual
 * order, custom 'other' subtypes after, alphabetically.
 */
export function buildPersonStats(
  personId: string | undefined,
  reviews: readonly Review[],
  drinks: readonly Drink[],
  subtypesById: ReadonlyMap<string, DrinkSubtype>,
): { mine: PersonReview[]; perType: TypeAverage[] } {
  const drinkMap = new Map(drinks.map((d) => [d.id, d]));
  const mine = reviews
    .filter((r) => r.author_id === personId)
    .flatMap((r) => {
      const drink = drinkMap.get(r.drink_id);
      return drink
        ? [{ review: r, drink, score: authorScore(groupOf(drink.type), r) }]
        : [];
    });
  const sums = new Map<
    string,
    { label: string; order: number; sum: number; n: number }
  >();
  for (const m of mine) {
    if (m.score === null) continue;
    const custom = m.drink.type === "other" && m.drink.subtype_id;
    const key = custom ? `s:${m.drink.subtype_id}` : m.drink.type;
    const cur = sums.get(key) ?? {
      label: drinkTypeLabel(m.drink, subtypesById),
      order: custom ? DRINK_TYPES.length : DRINK_TYPES.indexOf(m.drink.type),
      sum: 0,
      n: 0,
    };
    cur.sum += m.score;
    cur.n += 1;
    sums.set(key, cur);
  }
  const perType = [...sums.entries()]
    .map(([key, v]) => ({
      key,
      label: v.label,
      order: v.order,
      avg: round1(v.sum / v.n),
      n: v.n,
    }))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, "uk"));
  return { mine, perType };
}
