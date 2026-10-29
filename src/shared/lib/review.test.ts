import { describe, expect, it } from "vitest";
import {
  emptyDraft,
  evaluateReview,
  toReviewRow,
  type ReviewDraft,
} from "./review.js";

const NOTE = "Тепле, ягідне, довгий приємний післясмак.";
const full = { aroma: 7, palate: 8, finish: 6, again: 9 };

function draft(parts: Partial<ReviewDraft>): ReviewDraft {
  return { ...emptyDraft(), ...parts };
}

describe("evaluateReview", () => {
  it("empty draft cannot be saved", () => {
    const s = evaluateReview("wine", emptyDraft());
    expect(s.first.status).toBe("empty");
    expect(s.final.status).toBe("empty");
    expect(s.canSave).toBe(false);
  });

  it("first impression alone with all scores is valid", () => {
    const s = evaluateReview(
      "wine",
      draft({ first: { scores: full, note: "" } }),
    );
    expect(s.first.status).toBe("valid");
    expect(s.canSave).toBe(true);
  });

  it("partial first impression blocks saving", () => {
    const s = evaluateReview(
      "wine",
      draft({ first: { scores: { aroma: 5 }, note: "" } }),
    );
    expect(s.first).toEqual({
      status: "invalid",
      errors: ["first_scores_incomplete"],
    });
    expect(s.canSave).toBe(false);
  });

  it("first note without scores is invalid, not dropped", () => {
    const s = evaluateReview(
      "wine",
      draft({ first: { scores: {}, note: "щось" } }),
    );
    expect(s.first.status).toBe("invalid");
  });

  it("final with a long note and no scores is valid next to a valid first impression", () => {
    const s = evaluateReview(
      "wine",
      draft({
        first: { scores: full, note: "" },
        final: { scores: {}, note: NOTE },
      }),
    );
    expect(s.final.status).toBe("valid");
    expect(s.canSave).toBe(true);
  });

  it("short final note is rejected", () => {
    const s = evaluateReview(
      "wine",
      draft({
        first: { scores: full, note: "" },
        final: { scores: {}, note: "ок" },
      }),
    );
    expect(s.final.errors).toContain("final_note_too_short");
    expect(s.canSave).toBe(false);
  });

  it("final-only needs a long note AND all scores", () => {
    const noScores = evaluateReview(
      "wine",
      draft({ final: { scores: {}, note: NOTE } }),
    );
    expect(noScores.final.errors).toEqual(["final_scores_required"]);
    expect(noScores.canSave).toBe(false);

    const withScores = evaluateReview(
      "wine",
      draft({ final: { scores: full, note: NOTE } }),
    );
    expect(withScores.canSave).toBe(true);
  });

  it("final scores without a note are rejected", () => {
    const s = evaluateReview(
      "wine",
      draft({
        first: { scores: full, note: "" },
        final: { scores: { aroma: 3 }, note: "" },
      }),
    );
    expect(s.final.errors).toContain("final_note_too_short");
  });

  it("rejects out-of-range and unknown keys", () => {
    expect(
      evaluateReview(
        "wine",
        draft({ first: { scores: { ...full, aroma: 11 }, note: "" } }),
      ).first.errors,
    ).toContain("scores_out_of_range");
    expect(
      evaluateReview(
        "wine",
        draft({ first: { scores: { ...full, botanicals: 5 }, note: "" } }),
      ).first.status,
    ).toBe("invalid");
  });

  it("whitespace-only note counts as no input", () => {
    expect(
      evaluateReview("wine", draft({ final: { scores: {}, note: "    " } }))
        .final.status,
    ).toBe("empty");
  });
});

describe("toReviewRow", () => {
  it("maps a first-only review and nulls the rest", () => {
    const d = draft({ first: { scores: full, note: "  " } });
    expect(toReviewRow("wine", d, evaluateReview("wine", d))).toEqual({
      first_scores: full,
      first_note: null,
      final_scores: null,
      final_note: null,
    });
  });

  it("keeps partial final scores and a trimmed note", () => {
    const d = draft({
      first: { scores: full, note: "ok" },
      final: { scores: { aroma: 3 }, note: ` ${NOTE} ` },
    });
    expect(toReviewRow("wine", d, evaluateReview("wine", d))).toEqual({
      first_scores: full,
      first_note: "ok",
      final_scores: { aroma: 3 },
      final_note: NOTE,
    });
  });
});
