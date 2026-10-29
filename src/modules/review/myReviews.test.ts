import { describe, expect, it } from "vitest";
import type { Review } from "#contract/domain.js";
import { typeLabels } from "#shared/strings.js";
import {
  draftTitle,
  draftTypeText,
  myReviewItems,
  reviewStatusLabel,
} from "./myReviews.js";
import { reviewStrings } from "./strings.js";

const s = reviewStrings.mine;
const noSubtypes = new Map();

function meta(over: Record<string, unknown>) {
  return {
    name: "",
    type: null,
    subtype: { subtypeId: null, newName: null },
    updatedAt: 0,
    ...over,
  } as never;
}

describe("draftTitle", () => {
  it("prefers the drink name", () => {
    expect(draftTitle({ name: "Port" }, meta({ name: "x" }), false)).toBe(
      "Port",
    );
  });
  it("uses meta name for new drafts and placeholder otherwise", () => {
    expect(draftTitle(undefined, meta({ name: "Gin" }), false)).toBe("Gin");
    expect(draftTitle(undefined, meta({ name: "" }), false)).toBe(
      s.draftUnnamed,
    );
    expect(draftTitle(undefined, null, false)).toBe(s.draftUnnamed);
    expect(draftTitle(undefined, meta({ name: "Gin" }), true)).toBe(
      s.draftUnnamed,
    );
  });
});

describe("draftTypeText", () => {
  it("is null without drink and type", () => {
    expect(draftTypeText(undefined, null, noSubtypes)).toBeNull();
    expect(draftTypeText(undefined, meta({}), noSubtypes)).toBeNull();
  });
  it("uses the fixed label for plain types", () => {
    expect(draftTypeText(undefined, meta({ type: "red" }), noSubtypes)).toBe(
      typeLabels.red,
    );
  });
  it("resolves other subtypes", () => {
    const subs = new Map([["s1", { name: "Mead" }]]) as never;
    const m = (subtype: object) => meta({ type: "other", subtype });
    expect(
      draftTypeText(undefined, m({ subtypeId: "s1", newName: null }), subs),
    ).toBe("Mead");
    expect(
      draftTypeText(undefined, m({ subtypeId: "zz", newName: null }), subs),
    ).toBe(typeLabels.other);
    expect(
      draftTypeText(undefined, m({ subtypeId: null, newName: "Sake" }), subs),
    ).toBe(s.draftNewSubtype("Sake"));
    expect(
      draftTypeText(undefined, m({ subtypeId: null, newName: null }), subs),
    ).toBe(typeLabels.other);
  });
  it("uses the drink when present", () => {
    expect(
      draftTypeText({ type: "red", subtype_id: null }, null, noSubtypes),
    ).toBe(typeLabels.red);
  });
});

describe("reviewStatusLabel", () => {
  it("covers all three states", () => {
    expect(
      reviewStatusLabel(null, { final_scores: null, final_note: "" }),
    ).toBe(s.noScore);
    expect(reviewStatusLabel(5, { final_scores: {}, final_note: "n" })).toBe(
      s.hasFinal,
    );
    expect(reviewStatusLabel(5, { final_scores: {}, final_note: "" })).toBe(
      s.onlyFirst,
    );
  });
});

describe("myReviewItems", () => {
  it("keeps own reviews of known drinks", () => {
    const r = (id: string, author_id: string, drink_id: string) =>
      ({ id, author_id, drink_id }) as Review;
    const out = myReviewItems(
      "u1",
      [{ id: "d1" }],
      [r("a", "u1", "d1"), r("b", "u2", "d1"), r("c", "u1", "dX")],
    );
    expect(out.map((i) => i.review.id)).toEqual(["a"]);
    expect(out[0].drink.id).toBe("d1");
  });
});
