import { describe, expect, it } from "vitest";
import { asPorts, fakePorts, TOKEN } from "#server/test-utils.js";
import { inviteStatus } from "./inviteStatus.js";

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
