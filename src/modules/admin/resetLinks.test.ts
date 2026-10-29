import { describe, expect, it } from "vitest";
import { latestResetLinks, type ResetLinkRow } from "./resetLinks.js";

const NOW = Date.parse("2026-01-10T00:00:00Z");

function row(over: Partial<ResetLinkRow>): ResetLinkRow {
  return {
    token: "t",
    target_user_id: "u1",
    created_at: "2026-01-09T00:00:00Z",
    expires_at: "2026-01-16T00:00:00Z",
    used_at: null,
    ...over,
  };
}

describe("latestResetLinks", () => {
  it("keeps the newest usable link per user", () => {
    const out = latestResetLinks(
      [
        row({ token: "old" }),
        row({ token: "new", created_at: "2026-01-09T12:00:00Z" }),
        row({ token: "other", target_user_id: "u2" }),
      ],
      NOW,
    );
    expect(out).toEqual({ u1: "new", u2: "other" });
  });

  it("skips used, expired and targetless links", () => {
    const out = latestResetLinks(
      [
        row({ token: "used", used_at: "2026-01-09T01:00:00Z" }),
        row({ token: "expired", expires_at: "2026-01-09T23:00:00Z" }),
        row({ token: "invite", target_user_id: null }),
      ],
      NOW,
    );
    expect(out).toEqual({});
  });
});
