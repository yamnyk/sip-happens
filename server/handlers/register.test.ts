import { describe, expect, it, vi } from "vitest";
import {
  asPorts,
  fakePorts,
  INVITER_ID,
  TOKEN,
  USER_ID,
} from "../test-utils.js";
import { register } from "./register.js";

const body = { token: TOKEN, nick: "Gogi", password: "supersecret1" };

describe("register", () => {
  it("creates the user, passes the inviter, marks the link used", async () => {
    const p = fakePorts();
    const res = await register({ ports: asPorts(p) }, body);
    expect(res).toEqual({ status: 200, body: { ok: true } });
    expect(p.links.claim).toHaveBeenCalledWith(TOKEN, "invite");
    expect(p.auth.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        nick: "Gogi",
        invitedBy: INVITER_ID,
        email: expect.stringMatching(/^[0-9a-f]{32}@sip\.invalid$/),
      }),
    );
    expect(p.links.markUsed).toHaveBeenCalledWith(TOKEN, USER_ID);
    expect(p.links.release).not.toHaveBeenCalled();
  });

  it("rejects an expired link (claim returns nothing) as invalid_token", async () => {
    const p = fakePorts();
    p.links.claim.mockResolvedValue(null);
    const res = await register({ ports: asPorts(p) }, body);
    expect(res.body).toEqual({ ok: false, error: "invalid_token" });
    expect(p.auth.createUser).not.toHaveBeenCalled();
  });

  it("rejects an already used link identically to an expired one", async () => {
    const expired = fakePorts();
    const used = fakePorts();
    expired.links.claim.mockResolvedValue(null);
    used.links.claim.mockResolvedValue(null);
    const a = await register({ ports: asPorts(expired) }, body);
    const b = await register({ ports: asPorts(used) }, body);
    expect(a).toEqual(b);
    expect(a.status).toBe(400);
  });

  it("rejects a reset link used as an invite (claim is kind-scoped)", async () => {
    const p = fakePorts();
    p.links.claim.mockImplementation(async (_t: string, kind: string) =>
      kind === "invite"
        ? null
        : { createdBy: INVITER_ID, targetUserId: USER_ID },
    );
    const res = await register({ ports: asPorts(p) }, body);
    expect(res.body).toEqual({ ok: false, error: "invalid_token" });
    expect(p.links.claim).toHaveBeenCalledWith(TOKEN, "invite");
  });

  it("releases the claim when the nick already exists", async () => {
    const p = fakePorts();
    p.profiles.nickExists.mockResolvedValue(true);
    const res = await register({ ports: asPorts(p) }, body);
    expect(res.body).toEqual({ ok: false, error: "nick_taken" });
    expect(p.links.release).toHaveBeenCalledWith(TOKEN);
    expect(p.auth.createUser).not.toHaveBeenCalled();
  });

  it("releases the claim and maps a duplicate-nick createUser failure to nick_taken", async () => {
    const p = fakePorts();
    p.profiles.nickExists
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    p.auth.createUser.mockResolvedValue({ ok: false, reason: "other" });
    const res = await register({ ports: asPorts(p) }, body);
    expect(res.body).toEqual({ ok: false, error: "nick_taken" });
    expect(p.links.release).toHaveBeenCalledWith(TOKEN);
    expect(p.links.markUsed).not.toHaveBeenCalled();
  });

  it("releases the claim and returns server_error on an unknown createUser failure", async () => {
    const p = fakePorts();
    p.auth.createUser.mockResolvedValue({ ok: false, reason: "other" });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await register({ ports: asPorts(p) }, body);
    expect(spy).toHaveBeenCalledWith("create user failed:", "other");
    spy.mockRestore();
    expect(res).toEqual({
      status: 500,
      body: { ok: false, error: "server_error" },
    });
    expect(p.links.release).toHaveBeenCalledWith(TOKEN);
  });

  it("releases the claim and rethrows when createUser throws", async () => {
    const p = fakePorts();
    p.auth.createUser.mockRejectedValue(new Error("boom"));
    await expect(register({ ports: asPorts(p) }, body)).rejects.toThrow("boom");
    expect(p.links.release).toHaveBeenCalledWith(TOKEN);
  });

  it("rejects bad input before touching the database", async () => {
    const p = fakePorts();
    const res = await register(
      { ports: asPorts(p) },
      { token: "nope", nick: "x", password: "short" },
    );
    expect(res.body).toEqual({ ok: false, error: "invalid_input" });
    expect(p.links.claim).not.toHaveBeenCalled();
  });
});
