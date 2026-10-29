import { describe, expect, it } from "vitest";
import { asPorts, fakePorts, TOKEN, USER_ID } from "../test-utils.js";
import { inviteStatus } from "./inviteStatus.js";
import { keepalive } from "./keepalive.js";
import { resetComplete } from "./resetComplete.js";
import { resetRequest } from "./resetRequest.js";

describe("keepalive", () => {
  const secret = "cron-secret-value";

  it("rejects a bad bearer without touching the database", async () => {
    const p = fakePorts();
    const res = await keepalive(
      { ports: asPorts(p), cronSecret: secret },
      "Bearer wrong",
    );
    expect(res).toEqual({
      status: 401,
      body: { ok: false, error: "unauthorized" },
    });
    expect(p.health.ping).not.toHaveBeenCalled();
  });

  it("rejects a missing header and a non-bearer scheme", async () => {
    const p = fakePorts();
    expect(
      (await keepalive({ ports: asPorts(p), cronSecret: secret }, null)).status,
    ).toBe(401);
    expect(
      (
        await keepalive(
          { ports: asPorts(p), cronSecret: secret },
          `Basic ${secret}`,
        )
      ).status,
    ).toBe(401);
  });

  it("never accepts when the configured secret is empty", async () => {
    const p = fakePorts();
    const res = await keepalive(
      { ports: asPorts(p), cronSecret: "" },
      "Bearer ",
    );
    expect(res.status).toBe(401);
  });

  it("pings the database on a correct bearer", async () => {
    const p = fakePorts();
    const res = await keepalive(
      { ports: asPorts(p), cronSecret: secret },
      `Bearer ${secret}`,
    );
    expect(res).toEqual({ status: 200, body: { ok: true } });
    expect(p.health.ping).toHaveBeenCalledOnce();
  });
});

describe("resetRequest", () => {
  it("returns the same generic ok whatever the nick", async () => {
    const p = fakePorts();
    const a = await resetRequest(
      { ports: asPorts(p) },
      { nick: "exists", inviterNick: "x" },
    );
    const b = await resetRequest(
      { ports: asPorts(p) },
      { nick: "ghost", inviterNick: "y" },
    );
    expect(a).toEqual({ status: 200, body: { ok: true } });
    expect(b).toEqual(a);
    expect(p.resetRequests.create).toHaveBeenCalledWith("exists", "x");
  });

  it("reports only the global cap", async () => {
    const p = fakePorts();
    p.resetRequests.create.mockResolvedValue("rate_limited");
    const res = await resetRequest(
      { ports: asPorts(p) },
      { nick: "a", inviterNick: "b" },
    );
    expect(res).toEqual({
      status: 429,
      body: { ok: false, error: "rate_limited" },
    });
  });

  it("rejects empty and whitespace-only fields", async () => {
    const p = fakePorts();
    expect(
      (
        await resetRequest(
          { ports: asPorts(p) },
          { nick: "", inviterNick: "b" },
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await resetRequest(
          { ports: asPorts(p) },
          { nick: "  ", inviterNick: "b" },
        )
      ).status,
    ).toBe(400);
    expect(p.resetRequests.create).not.toHaveBeenCalled();
  });
});

describe("resetComplete", () => {
  const body = { token: TOKEN, password: "newsecret99" };

  it("sets the password for the link target and marks the link used", async () => {
    const p = fakePorts();
    p.links.claim.mockResolvedValue({
      createdBy: "admin",
      targetUserId: USER_ID,
    });
    const res = await resetComplete({ ports: asPorts(p) }, body);
    expect(res.status).toBe(200);
    expect(p.links.claim).toHaveBeenCalledWith(TOKEN, "reset");
    expect(p.auth.updatePassword).toHaveBeenCalledWith(USER_ID, "newsecret99");
    expect(p.links.markUsed).toHaveBeenCalledWith(TOKEN, USER_ID);
    expect(p.auth.revokeSessions).toHaveBeenCalledWith(USER_ID);
  });

  it("still succeeds when session revocation fails", async () => {
    const p = fakePorts();
    p.links.claim.mockResolvedValue({
      createdBy: "admin",
      targetUserId: USER_ID,
    });
    p.auth.revokeSessions.mockRejectedValueOnce(new Error("boom"));
    const res = await resetComplete({ ports: asPorts(p) }, body);
    expect(res.status).toBe(200);
  });

  it("rejects expired, used or wrong-kind links as invalid_token", async () => {
    const p = fakePorts();
    p.links.claim.mockResolvedValue(null);
    const res = await resetComplete({ ports: asPorts(p) }, body);
    expect(res.body).toEqual({ ok: false, error: "invalid_token" });
    expect(p.auth.updatePassword).not.toHaveBeenCalled();
  });

  it("releases the claim when the password update fails", async () => {
    const p = fakePorts();
    p.links.claim.mockResolvedValue({
      createdBy: "admin",
      targetUserId: USER_ID,
    });
    p.auth.updatePassword.mockRejectedValue(new Error("nope"));
    await expect(resetComplete({ ports: asPorts(p) }, body)).rejects.toThrow(
      "nope",
    );
    expect(p.links.release).toHaveBeenCalledWith(TOKEN);
  });

  it("releases and rejects a reset link with no target", async () => {
    const p = fakePorts();
    p.links.claim.mockResolvedValue({ createdBy: "admin", targetUserId: null });
    const res = await resetComplete({ ports: asPorts(p) }, body);
    expect(res.body).toEqual({ ok: false, error: "invalid_token" });
    expect(p.links.release).toHaveBeenCalledWith(TOKEN);
  });
});

describe("inviteStatus", () => {
  it("returns valid with the inviter nick", async () => {
    const p = fakePorts();
    const res = await inviteStatus({ ports: asPorts(p) }, { token: TOKEN });
    expect(res).toEqual({
      status: 200,
      body: { ok: true, valid: true, inviterNick: "Gogi" },
    });
  });

  it("returns valid:false for dead or unknown links without an error code", async () => {
    const p = fakePorts();
    p.links.inviteInfo.mockResolvedValue(null);
    const res = await inviteStatus({ ports: asPorts(p) }, { token: TOKEN });
    expect(res).toEqual({ status: 200, body: { ok: true, valid: false } });
  });

  it("returns valid:false for a malformed token", async () => {
    const p = fakePorts();
    const res = await inviteStatus({ ports: asPorts(p) }, { token: "garbage" });
    expect(res.body).toEqual({ ok: true, valid: false });
    expect(p.links.inviteInfo).not.toHaveBeenCalled();
  });
});
