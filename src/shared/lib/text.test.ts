import { describe, expect, it } from "vitest";
import { fold, normalizeName } from "./text.js";

describe("text", () => {
  it("fold strips accents, case and outer spaces", () => {
    expect(fold("  Crème BRÛLÉE ")).toBe("creme brulee");
  });

  it("normalizeName lowercases NFC without trimming or folding accents", () => {
    expect(normalizeName("Crème")).toBe("crème");
    expect(normalizeName("Crème")).toBe("crème");
  });
});
