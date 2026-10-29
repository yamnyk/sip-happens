import { describe, expect, it } from "vitest";
import { asPorts, fakePorts, TOKEN, USER_ID } from "../test-utils.js";
import { resetComplete } from "./resetComplete.js";

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
