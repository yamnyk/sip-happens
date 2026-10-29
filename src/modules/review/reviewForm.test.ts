import { describe, expect, it } from "vitest";
import type { Drink, Review } from "#contract/domain.js";
import type { ReviewDraft } from "#shared/lib/review.js";
import {
  canSubmit,
  filterSuggestions,
  findConflict,
  findExactMatch,
  parseDraftContext,
  pruneToGroup,
  stageFromReview,
  withNote,
  withScore,
} from "./reviewForm.js";

const drink = (id: string, name: string): Drink =>
  ({ id, name, type: "red", subtype_id: null }) as Drink;

const draft: ReviewDraft = {
  first: { scores: { aroma: 3, bogus: 5 }, note: "a" },
  final: { scores: {}, note: "" },
};

describe("stageFromReview", () => {
  it("returns null without a review or input", () => {
    expect(stageFromReview(undefined, "first")).toBeNull();
    expect(stageFromReview({} as Review, "first")).toBeNull();
  });

  it("copies the stage fields", () => {
    const r = {
      first_scores: { aroma: 4 },
      first_note: "n",
    } as unknown as Review;
    expect(stageFromReview(r, "first")).toEqual({
      scores: { aroma: 4 },
      note: "n",
    });
    expect(stageFromReview(r, "final")).toBeNull();
  });
});

describe("pruneToGroup", () => {
  it("drops unknown criteria and keeps the rest", () => {
    const out = pruneToGroup("wine", draft);
    expect(out.first.scores).toEqual({ aroma: 3 });
    expect(out.first.note).toBe("a");
  });
});

describe("parseDraftContext", () => {
  it("splits name and known type", () => {
    expect(parseDraftContext("chateau x+red")).toEqual({
      name: "chateau x",
      type: "red",
    });
  });

  it("keeps plus signs inside the name and nulls unknown types", () => {
    expect(parseDraftContext("a+b+nope")).toEqual({ name: "a+b", type: null });
    expect(parseDraftContext("plain")).toEqual({ name: "plain", type: null });
  });
});

describe("suggestions and matches", () => {
  const list = [drink("1", "Barolo"), drink("2", "Barbera"), drink("3", "Gin")];

  it("filters by folded substring and respects empty cases", () => {
    expect(filterSuggestions(list, "bar", false).map((d) => d.id)).toEqual([
      "1",
      "2",
    ]);
    expect(filterSuggestions(list, "bar", true)).toEqual([]);
    expect(filterSuggestions(list, " ", false)).toEqual([]);
    expect(filterSuggestions(undefined, "bar", false)).toEqual([]);
  });

  it("caps suggestions at six", () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      drink(`${i}`, `Wine ${i}`),
    );
    expect(filterSuggestions(many, "wine", false)).toHaveLength(6);
  });

  it("finds exact matches ignoring case, not when a drink is picked", () => {
    expect(findExactMatch(list, " barolo ", false)?.id).toBe("1");
    expect(findExactMatch(list, "barolo", true)).toBeUndefined();
    expect(findExactMatch(list, "  ", false)).toBeUndefined();
  });

  it("finds conflicts by normalized name, then by folded name", () => {
    expect(findConflict(list, "BAROLO")?.id).toBe("1");
    expect(findConflict([drink("9", "Café")], "Cafe")?.id).toBe("9");
    expect(findConflict(list, "zzz")).toBeUndefined();
  });
});

describe("canSubmit", () => {
  const base = {
    canSave: true,
    saving: false,
    exactMatch: undefined,
    effectiveType: "red" as const,
    hasDrink: false,
    name: "x",
  };

  it("allows a valid new drink", () => {
    expect(canSubmit(base)).toBe(true);
  });

  it("blocks on each failing condition", () => {
    expect(canSubmit({ ...base, canSave: false })).toBe(false);
    expect(canSubmit({ ...base, saving: true })).toBe(false);
    expect(canSubmit({ ...base, exactMatch: drink("1", "x") })).toBe(false);
    expect(canSubmit({ ...base, effectiveType: null })).toBe(false);
    expect(canSubmit({ ...base, name: " " })).toBe(false);
    expect(canSubmit({ ...base, name: " ", hasDrink: true })).toBe(true);
  });
});

describe("withScore and withNote", () => {
  it("sets and removes a score without mutating", () => {
    const set = withScore(draft, "final", "aroma", 2);
    expect(set.final.scores).toEqual({ aroma: 2 });
    expect(draft.final.scores).toEqual({});
    expect(withScore(set, "final", "aroma", undefined).final.scores).toEqual(
      {},
    );
  });

  it("replaces a note", () => {
    expect(withNote(draft, "final", "hi").final.note).toBe("hi");
  });
});
