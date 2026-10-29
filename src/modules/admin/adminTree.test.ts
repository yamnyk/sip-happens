import { describe, expect, it } from "vitest";
import type { Profile } from "#contract/domain.js";
import { buildTree } from "./adminTree.js";

function profile(id: string, invitedBy: string | null): Profile {
  return {
    id,
    nick: id,
    invited_by: invitedBy,
    disabled: false,
    is_admin: false,
    created_at: "2026-01-01T00:00:00Z",
  } as Profile;
}

describe("buildTree", () => {
  it("returns an empty forest for no profiles", () => {
    expect(buildTree([])).toEqual([]);
  });

  it("nests invitees under their inviter", () => {
    const roots = buildTree([
      profile("a", null),
      profile("b", "a"),
      profile("c", "b"),
      profile("d", "a"),
    ]);
    expect(roots.map((r) => r.profile.id)).toEqual(["a"]);
    expect(roots[0].children.map((n) => n.profile.id)).toEqual(["b", "d"]);
    expect(roots[0].children[0].children.map((n) => n.profile.id)).toEqual([
      "c",
    ]);
  });

  it("treats profiles with an unknown inviter as roots", () => {
    const roots = buildTree([profile("a", null), profile("b", "gone")]);
    expect(roots.map((r) => r.profile.id)).toEqual(["a", "b"]);
  });
});
