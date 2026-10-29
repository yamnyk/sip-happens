import { describe, expect, it } from "vitest";
import type { InviteLink } from "#contract/domain.js";
import { formatDate } from "#shared/lib/date.js";
import { inviteState } from "./inviteState.js";
import { inviteStrings as s } from "./strings.js";

const NOW = Date.parse("2026-03-10T12:00:00Z");
const nickOf = (id: string | null) => (id === "u1" ? "Olya" : s.usedUnknown);

function link(over: Partial<InviteLink>): InviteLink {
  return {
    token: "t",
    created_at: "2026-03-01T00:00:00Z",
    expires_at: "2026-03-20T00:00:00Z",
    used_at: null,
    used_by: null,
    ...over,
  } as InviteLink;
}

describe("inviteState", () => {
  it("marks a used link as inactive with the user's nick", () => {
    const l = link({ used_at: "2026-03-05T00:00:00Z", used_by: "u1" });
    expect(inviteState(l, NOW, nickOf)).toEqual({
      kind: "used",
      text: s.used("Olya", formatDate("2026-03-05T00:00:00Z")),
      tone: "text-emerald-400",
      active: false,
    });
  });

  it("falls back to the unknown label for an unknown user", () => {
    const l = link({ used_at: "2026-03-05T00:00:00Z", used_by: null });
    expect(inviteState(l, NOW, nickOf).text).toContain(s.usedUnknown);
  });

  it("marks an expired link, including expiry exactly at now", () => {
    const past = link({ expires_at: "2026-03-09T00:00:00Z" });
    expect(inviteState(past, NOW, nickOf)).toMatchObject({
      kind: "expired",
      tone: "text-neutral-500",
      active: false,
    });
    const edge = link({ expires_at: new Date(NOW).toISOString() });
    expect(inviteState(edge, NOW, nickOf).kind).toBe("expired");
  });

  it("marks a future unused link as active", () => {
    expect(inviteState(link({}), NOW, nickOf)).toEqual({
      kind: "active",
      text: s.active(formatDate("2026-03-20T00:00:00Z")),
      tone: "text-amber-400",
      active: true,
    });
  });

  it("treats used as winning over expired", () => {
    const l = link({
      used_at: "2026-03-02T00:00:00Z",
      expires_at: "2026-03-03T00:00:00Z",
    });
    expect(inviteState(l, NOW, nickOf).kind).toBe("used");
  });
});
