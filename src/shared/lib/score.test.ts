import { describe, expect, it } from "vitest";
import {
  authorScore,
  computeTotal,
  countByAuthor,
  drinkStats,
  isCompleteScores,
  round1,
} from "./score.js";
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

describe("computeTotal", () => {
  it("returns 10 for all tens and 0 for all zeros", () => {
    expect(computeTotal("wine", wine(10, 10, 10, 10))).toBe(10);
    expect(computeTotal("wine", wine(0, 0, 0, 0))).toBe(0);
  });

  it("applies weights (wine: 20/35/20/25)", () => {
    // (5*20 + 8*35 + 6*20 + 7*25) / 100 = 6.75 -> 6.8
    expect(computeTotal("wine", wine(5, 8, 6, 7))).toBe(6.8);
  });

  it("uses different weights per group", () => {
    const s = wine(10, 0, 0, 0);
    expect(computeTotal("wine", s)).toBe(2);
    expect(computeTotal("other", s)).toBe(2.5);
  });

  it("gin has equal weights", () => {
    expect(
      computeTotal("gin", { botanicals: 10, clean: 0, mixing: 0, smooth: 0 }),
    ).toBe(2.5);
  });

  it("returns null for incomplete, out-of-range or non-integer scores", () => {
    expect(computeTotal("wine", { aroma: 5 })).toBeNull();
    expect(computeTotal("wine", wine(5, 5, 5, 11))).toBeNull();
    expect(computeTotal("wine", wine(5, 5, 5, 4.5))).toBeNull();
    expect(computeTotal("wine", null)).toBeNull();
  });
});

describe("isCompleteScores", () => {
  it("requires every criterion key of the group", () => {
    expect(isCompleteScores("gin", wine(1, 2, 3, 4))).toBe(false);
    expect(isCompleteScores("wine", wine(1, 2, 3, 4))).toBe(true);
  });
});

describe("authorScore", () => {
  it("prefers a complete final over first impression", () => {
    expect(
      authorScore(
        "wine",
        review({
          first_scores: wine(0, 0, 0, 0),
          final_scores: wine(10, 10, 10, 10),
        }),
      ),
    ).toBe(10);
  });

  it("falls back to first impression when final scores are partial", () => {
    expect(
      authorScore(
        "wine",
        review({
          first_scores: wine(10, 10, 10, 10),
          final_scores: { aroma: 1 },
        }),
      ),
    ).toBe(10);
  });

  it("uses a complete final when there is no first impression", () => {
    expect(
      authorScore("wine", review({ final_scores: wine(4, 4, 4, 4) })),
    ).toBe(4);
  });

  it("is null when nothing is scored", () => {
    expect(
      authorScore(
        "wine",
        review({ final_note: "only a note, no scores at all here" }),
      ),
    ).toBeNull();
  });
});

describe("drinkStats", () => {
  it("averages author scores and counts all reviews", () => {
    const stats = drinkStats("wine", [
      review({ first_scores: wine(10, 10, 10, 10) }),
      review({ first_scores: wine(5, 5, 5, 5) }),
      review({ final_note: "unscored review with a long enough note" }),
    ]);
    expect(stats).toEqual({ average: 7.5, count: 3 });
  });

  it("has null average with no scored reviews", () => {
    expect(drinkStats("wine", [])).toEqual({ average: null, count: 0 });
  });
});

describe("round1 and countByAuthor", () => {
  it("round1 rounds to one decimal", () => {
    expect(round1(7.25)).toBe(7.3);
    expect(round1(7.24)).toBe(7.2);
  });

  it("countByAuthor counts reviews per author", () => {
    const counts = countByAuthor([
      { author_id: "a" },
      { author_id: "b" },
      { author_id: "a" },
    ]);
    expect(counts.get("a")).toBe(2);
    expect(counts.get("b")).toBe(1);
    expect(counts.get("c")).toBeUndefined();
  });
});
