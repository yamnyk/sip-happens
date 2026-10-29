import { describe, expect, it } from "vitest";
import type { DrinkSubtype } from "#contract/domain.js";
import { checkNewSubtype } from "./subtypeInput.js";

const sub = (id: string, name: string): DrinkSubtype => ({
  id,
  name,
  name_normalized: name.toLowerCase(),
  created_by: null,
  created_at: "",
});

describe("checkNewSubtype", () => {
  const existing = [sub("s1", "Віскі")];

  it("returns the validation code for bad names", () => {
    expect(checkNewSubtype("   ", existing, null)).toEqual({
      kind: "invalid",
      code: "subtype_empty",
    });
    expect(checkNewSubtype("a".repeat(41), existing, null)).toEqual({
      kind: "invalid",
      code: "subtype_too_long",
    });
  });

  it("finds an existing duplicate case-insensitively", () => {
    expect(checkNewSubtype("  віскі ", existing, null)).toEqual({
      kind: "duplicate",
      duplicate: existing[0],
    });
  });

  it("finds the pending new name as a duplicate with an empty id", () => {
    const res = checkNewSubtype("Ром", existing, "ром");
    expect(res).toMatchObject({
      kind: "duplicate",
      duplicate: { id: "", name: "ром" },
    });
  });

  it("returns the cleaned name when fine", () => {
    expect(checkNewSubtype("  Ром   темний ", existing, null)).toEqual({
      kind: "ok",
      name: "Ром темний",
    });
  });
});
