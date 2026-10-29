import { describe, expect, it } from "vitest";
import type { Drink, DrinkSubtype, Review } from "#contract/domain.js";
import { buildPersonStats } from "./personStats.js";

const drink = (id: string, type: Drink["type"], subtype_id?: string): Drink =>
  ({ id, name: id, type, subtype_id: subtype_id ?? null }) as Drink;

const review = (id: string, drink_id: string, score: number | null): Review =>
  ({
    id,
    drink_id,
    author_id: "me",
    first_scores:
      score === null
        ? null
        : { aroma: score, palate: score, finish: score, again: score },
    final_scores: null,
  }) as Review;

const subs = new Map<string, DrinkSubtype>([
  ["s1", { id: "s1", name: "Віскі" } as DrinkSubtype],
]);

describe("buildPersonStats", () => {
  const drinks = [
    drink("d1", "red"),
    drink("d2", "red"),
    drink("d3", "port"),
    drink("d4", "other", "s1"),
  ];

  it("keeps only the person's reviews of known drinks", () => {
    const reviews = [
      review("r1", "d1", 8),
      { ...review("r2", "d2", 5), author_id: "other" },
      review("r3", "missing", 5),
    ];
    const { mine } = buildPersonStats("me", reviews, drinks, subs);
    expect(mine.map((m) => m.review.id)).toEqual(["r1"]);
  });

  it("averages per type with one decimal and skips unscored reviews", () => {
    const reviews = [
      review("r1", "d1", 7),
      review("r2", "d2", 8),
      review("r5", "d3", null),
    ];
    const { perType } = buildPersonStats("me", reviews, drinks, subs);
    expect(perType).toHaveLength(1);
    expect(perType[0]).toMatchObject({ key: "red", avg: 7.5, n: 2 });
  });

  it("orders fixed types first and custom subtypes last", () => {
    const reviews = [
      review("r1", "d4", 9),
      review("r2", "d3", 6),
      review("r3", "d1", 7),
    ];
    const { perType } = buildPersonStats("me", reviews, drinks, subs);
    expect(perType.map((p) => p.key)).toEqual(["red", "port", "s:s1"]);
    expect(perType[2]?.label).toBe("Віскі");
  });
});
