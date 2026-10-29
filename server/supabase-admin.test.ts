import { describe, expect, it, vi } from "vitest";
import { createPorts } from "./supabase-admin.js";

type Res = {
  data?: unknown;
  error?: { message: string; code?: string } | null;
};

function makeChain(res: Res): unknown {
  const handler: ProxyHandler<object> = {
    get(_t, key) {
      if (key === "then")
        return (resolve: (v: Res) => unknown) =>
          resolve({ data: null, error: null, ...res });
      return () => self;
    },
  };
  const self: unknown = new Proxy({}, handler);
  return self;
}

interface Fake {
  rpc: ReturnType<typeof vi.fn>;
  from: ReturnType<typeof vi.fn>;
  auth: {
    getUser: ReturnType<typeof vi.fn>;
    admin: {
      createUser: ReturnType<typeof vi.fn>;
      updateUserById: ReturnType<typeof vi.fn>;
      deleteUser: ReturnType<typeof vi.fn>;
    };
  };
}

function fakeClient(res: Res): Fake {
  return {
    rpc: vi.fn(() => makeChain(res)),
    from: vi.fn(() => makeChain(res)),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, ...res }),
      admin: {
        createUser: vi.fn().mockResolvedValue({ data: { user: null }, ...res }),
        updateUserById: vi.fn().mockResolvedValue({ data: {}, ...res }),
        deleteUser: vi.fn().mockResolvedValue({ data: {}, ...res }),
      },
    },
  };
}

const boom = { error: { message: "boom" } };
const ports = (f: Fake) =>
  createPorts(f as unknown as Parameters<typeof createPorts>[0]);

describe("createPorts error mapping", () => {
  it("throws on each failing query", async () => {
    const p = ports(fakeClient(boom));
    await expect(p.links.claim("t", "invite")).rejects.toThrow(
      "claim_link failed: boom",
    );
    await expect(p.links.release("t")).rejects.toThrow("release link failed");
    await expect(p.links.markUsed("t", "u")).rejects.toThrow(
      "mark link used failed",
    );
    await expect(p.links.inviteInfo("t")).rejects.toThrow(
      "invite lookup failed",
    );
    await expect(p.profiles.getById("u")).rejects.toThrow(
      "profile lookup failed",
    );
    await expect(p.profiles.nickExists("n")).rejects.toThrow(
      "nick lookup failed",
    );
    await expect(p.profiles.setDisabled("u", true)).rejects.toThrow(
      "set disabled failed",
    );
    await expect(p.auth.updatePassword("u", "pw")).rejects.toThrow(
      "update password failed",
    );
    await expect(p.auth.deleteUser("u")).rejects.toThrow("delete user failed");
    await expect(p.auth.setBanned("u", true)).rejects.toThrow("set ban failed");
    await expect(p.auth.revokeSessions("u")).rejects.toThrow(
      "revoke sessions failed",
    );
    await expect(p.resetRequests.create("a", "b")).rejects.toThrow(
      "create_reset_request failed",
    );
    await expect(p.health.ping()).rejects.toThrow("keepalive read failed");
  });

  it("maps claim_link rows, arrays and empty results", async () => {
    const row = { inviter_id: "i", target_id: "t" };
    expect(
      await ports(fakeClient({ data: [row] })).links.claim("x", "invite"),
    ).toEqual({ createdBy: "i", targetUserId: "t" });
    expect(
      await ports(fakeClient({ data: row })).links.claim("x", "reset"),
    ).toEqual({ createdBy: "i", targetUserId: "t" });
    expect(
      await ports(fakeClient({ data: [{}] })).links.claim("x", "reset"),
    ).toEqual({ createdBy: null, targetUserId: null });
    expect(
      await ports(fakeClient({ data: [] })).links.claim("x", "invite"),
    ).toBe(null);
    expect(
      await ports(fakeClient({ data: null })).links.claim("x", "invite"),
    ).toBe(null);
  });

  it("maps create_reset_request results", async () => {
    expect(
      await ports(fakeClient({ data: "rate_limited" })).resetRequests.create(
        "a",
        "b",
      ),
    ).toBe("rate_limited");
    expect(
      await ports(fakeClient({ data: "ok" })).resetRequests.create("a", "b"),
    ).toBe("ok");
  });

  it("maps nickExists and getById", async () => {
    expect(
      await ports(fakeClient({ data: [{ id: "1" }] })).profiles.nickExists("n"),
    ).toBe(true);
    expect(await ports(fakeClient({ data: [] })).profiles.nickExists("n")).toBe(
      false,
    );
    expect(await ports(fakeClient({ data: null })).profiles.getById("u")).toBe(
      null,
    );
  });

  it("returns null from inviteInfo when the link has no creator", async () => {
    expect(
      await ports(fakeClient({ data: { created_by: null } })).links.inviteInfo(
        "t",
      ),
    ).toBeNull();
    expect(
      await ports(fakeClient({ data: null })).links.inviteInfo("t"),
    ).toBeNull();
  });

  it("createUser maps exists codes to exists and others to other", async () => {
    const input = { email: "e", password: "p", nick: "n", invitedBy: null };
    for (const code of ["email_exists", "user_already_exists"]) {
      const f = fakeClient({ error: { message: "x", code } });
      expect(await ports(f).auth.createUser(input)).toEqual({
        ok: false,
        reason: "exists",
      });
    }
    expect(
      await ports(
        fakeClient({ error: { message: "x", code: "weird" } }),
      ).auth.createUser(input),
    ).toEqual({ ok: false, reason: "other" });
    expect(await ports(fakeClient({})).auth.createUser(input)).toEqual({
      ok: false,
      reason: "other",
    });
    const f = fakeClient({});
    f.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: "new" } },
      error: null,
    });
    expect(await ports(f).auth.createUser(input)).toEqual({
      ok: true,
      userId: "new",
    });
  });

  it("verifyJwt returns the id or null", async () => {
    const f = fakeClient({});
    expect(await ports(f).auth.verifyJwt("j")).toBeNull();
    f.auth.getUser.mockResolvedValue({
      data: { user: { id: "u" } },
      error: null,
    });
    expect(await ports(f).auth.verifyJwt("j")).toBe("u");
    f.auth.getUser.mockResolvedValue({
      data: { user: { id: "u" } },
      error: { message: "bad" },
    });
    expect(await ports(f).auth.verifyJwt("j")).toBeNull();
  });

  it("setBanned sends a long ban or none", async () => {
    const f = fakeClient({});
    await ports(f).auth.setBanned("u", true);
    await ports(f).auth.setBanned("u", false);
    expect(f.auth.admin.updateUserById).toHaveBeenNthCalledWith(1, "u", {
      ban_duration: "876000h",
    });
    expect(f.auth.admin.updateUserById).toHaveBeenNthCalledWith(2, "u", {
      ban_duration: "none",
    });
  });
});
