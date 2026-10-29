import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "./date.js";

describe("date", () => {
  const iso = "2026-03-05T14:07:00";

  it("formatDateTime shows two-digit day, month, year and time", () => {
    const out = formatDateTime(iso);
    expect(out).toContain("05.03.2026");
    expect(out).toContain("14:07");
  });

  it("formatDate shows the day without padding and the year", () => {
    const out = formatDate(iso);
    expect(out.startsWith("5 ")).toBe(true);
    expect(out).toContain("2026");
  });
});
