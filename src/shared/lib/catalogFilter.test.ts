import { fold } from "./text.js";
import { describe, expect, it } from "vitest";
import {
  activeRangeCount,
  criterionAverages,
  drinkPassesRanges,
  drinkPassesTotal,
  matchesQuery,
  type CriterionRanges,
} from "./catalogFilter.js";
import type { Review, Scores } from "#contract/domain.js";

const wine = (
  aroma: number,
  palate: number,
  finish: number,
  again: number,
): Scores => ({ aroma, palate, finish, again });

function review(partial: Partial<Review>): Review {
  return {
    id: "r",
    drink_id: "d",
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

describe("search", () => {
  it("folds case and accents", () => {
    expect(fold("  Crème BRÛLÉE ")).toBe("creme brulee");
  });
  it("matches ignoring case and accents", () => {
    expect(matchesQuery("Château Margaux", "chateau")).toBe(true);
    expect(matchesQuery("Château Margaux", "MARG")).toBe(true);
    expect(matchesQuery("Château Margaux", "xyz")).toBe(false);
  });
  it("matches Cyrillic case-insensitively", () => {
    expect(matchesQuery("Червоне Сухе", "червоне")).toBe(true);
  });
  it("empty or blank query matches everything", () => {
    expect(matchesQuery("Anything", "")).toBe(true);
    expect(matchesQuery("Anything", "   ")).toBe(true);
  });
});

describe("criterionAverages", () => {
  it("prefers final over first and skips unscored reviews", () => {
    const avgs = criterionAverages("wine", [
      review({
        first_scores: wine(2, 2, 2, 2),
        final_scores: wine(8, 6, 4, 10),
      }),
      review({ first_scores: wine(4, 4, 4, 4) }),
      review({ first_scores: { aroma: 9 }, final_scores: null }),
      review({}),
    ]);
    expect(avgs).toEqual({ aroma: 6, palate: 5, finish: 4, again: 7 });
  });
  it("falls back to first when final is incomplete", () => {
    const avgs = criterionAverages("wine", [
      review({ first_scores: wine(5, 5, 5, 5), final_scores: { aroma: 9 } }),
    ]);
    expect(avgs.aroma).toBe(5);
  });
  it("returns null per criterion when nothing is scored", () => {
    expect(criterionAverages("gin", [review({})])).toEqual({
      botanicals: null,
      clean: null,
      mixing: null,
      smooth: null,
    });
  });
});

describe("drinkPassesRanges", () => {
  const avgs = { aroma: 7, palate: 5, finish: 5, again: 5 };
  const ginAvgs = { botanicals: 8, clean: 9, mixing: 5, smooth: 5 };

  it("passes everything with no active ranges", () => {
    expect(drinkPassesRanges("wine", avgs, {})).toBe(true);
    expect(
      drinkPassesRanges("wine", { aroma: null }, { "wine.aroma": [0, 10] }),
    ).toBe(true);
    expect(activeRangeCount({ "wine.aroma": [0, 10] })).toBe(0);
  });
  it("bounds are inclusive", () => {
    expect(drinkPassesRanges("wine", avgs, { "wine.aroma": [7, 10] })).toBe(
      true,
    );
    expect(drinkPassesRanges("wine", avgs, { "wine.aroma": [0, 7] })).toBe(
      true,
    );
    expect(drinkPassesRanges("wine", avgs, { "wine.aroma": [8, 10] })).toBe(
      false,
    );
    expect(drinkPassesRanges("wine", avgs, { "wine.aroma": [0, 6] })).toBe(
      false,
    );
  });
  it("missing data fails an active range", () => {
    expect(
      drinkPassesRanges("wine", { aroma: null }, { "wine.aroma": [0, 9] }),
    ).toBe(false);
    expect(drinkPassesRanges("wine", {}, { "wine.aroma": [1, 10] })).toBe(
      false,
    );
  });
  it("ANDs ranges within a group", () => {
    const r: CriterionRanges = {
      "wine.aroma": [6, 10],
      "wine.palate": [6, 10],
    };
    expect(drinkPassesRanges("wine", avgs, r)).toBe(false);
    expect(drinkPassesRanges("wine", { ...avgs, palate: 6 }, r)).toBe(true);
  });
  it("ORs across groups and hides groups without active ranges", () => {
    const r: CriterionRanges = { "wine.aroma": [7, 10], "gin.clean": [8, 10] };
    expect(drinkPassesRanges("wine", avgs, r)).toBe(true);
    expect(drinkPassesRanges("gin", ginAvgs, r)).toBe(true);
    expect(drinkPassesRanges("gin", { ...ginAvgs, clean: 7 }, r)).toBe(false);
    expect(drinkPassesRanges("port", avgs, r)).toBe(false);
    expect(drinkPassesRanges("other", avgs, r)).toBe(false);
  });
  it("hides other-group drinks when a range is active elsewhere", () => {
    expect(drinkPassesRanges("other", avgs, { "wine.aroma": [1, 10] })).toBe(
      false,
    );
  });
  it("counts only active ranges", () => {
    expect(
      activeRangeCount({
        "wine.aroma": [1, 10],
        "wine.palate": [0, 10],
        "gin.clean": [0, 9],
      }),
    ).toBe(2);
  });
});

describe("drinkPassesTotal", () => {
  it("passes everything, even unrated drinks, on the full scale", () => {
    expect(drinkPassesTotal(null, [0, 10])).toBe(true);
    expect(drinkPassesTotal(3.2, [0, 10])).toBe(true);
  });

  it("is inclusive on both bounds", () => {
    expect(drinkPassesTotal(7, [7, 9])).toBe(true);
    expect(drinkPassesTotal(9, [7, 9])).toBe(true);
    expect(drinkPassesTotal(6.9, [7, 9])).toBe(false);
    expect(drinkPassesTotal(9.1, [7, 9])).toBe(false);
  });

  it("fails an unrated drink on an active range", () => {
    expect(drinkPassesTotal(null, [5, 10])).toBe(false);
  });
});
