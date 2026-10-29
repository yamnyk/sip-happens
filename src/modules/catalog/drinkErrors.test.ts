import { describe, expect, it } from "vitest";
import { DrinkFormError, saveErrorMessage } from "./drinkErrors.js";

const messages = { nameRequired: "need name", saveError: "failed" };

describe("saveErrorMessage", () => {
  it("maps the name_required code", () => {
    expect(
      saveErrorMessage(new DrinkFormError("name_required"), messages),
    ).toBe("need name");
  });

  it("does not match by message text", () => {
    expect(saveErrorMessage(new Error("need name"), messages)).toBe("failed");
  });

  it("falls back for unknown errors", () => {
    expect(saveErrorMessage("boom", messages)).toBe("failed");
  });
});
