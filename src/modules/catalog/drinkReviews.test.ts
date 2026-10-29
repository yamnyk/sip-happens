import { describe, expect, it } from "vitest";
import type { Drink, Review } from "#contract/domain.js";
import { buildDrinkReviewRows } from "./drinkReviews.js";

const drink: Drink = {
  id: "d1",
  type: "red",
  name: "Red",
  name_normalized: null,
  subtype_id: null,
  created_by: null,
  created_at: "",
};

function review(partial: Partial<Review>): Review {
  return {
    id: "r",
    drink_id: "d1",
    author_id: "a",
    first_scores: null,
    first_note: null,
    final_scores: null,
    final_note: null,
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

const scores = (n: number) => ({ aroma: n, palate: n, finish: n, again: n });

describe("buildDrinkReviewRows", () => {
  it("keeps only reviews of the drink", () => {
    const rows = buildDrinkReviewRows(
      drink,
      [review({ id: "1" }), review({ id: "2", drink_id: "other" })],
      [],
      "?",
    );
    expect(rows.map((r) => r.review.id)).toEqual(["1"]);
  });

  it("joins nicks and falls back to the unknown nick", () => {
    const rows = buildDrinkReviewRows(
      drink,
      [
        review({ id: "1", author_id: "a" }),
        review({ id: "2", author_id: "b" }),
      ],
      [{ id: "a", nick: "anna" }],
      "?",
    );
    expect(rows.map((r) => r.nick)).toEqual(["anna", "?"]);
  });

  it("sorts by score desc with unscored last", () => {
    const rows = buildDrinkReviewRows(
      drink,
      [
        review({ id: "none" }),
        review({ id: "low", final_scores: scores(2) }),
        review({ id: "high", final_scores: scores(9) }),
      ],
      [],
      "?",
    );
    expect(rows.map((r) => r.review.id)).toEqual(["high", "low", "none"]);
    expect(rows[2]?.score).toBeNull();
  });
});
