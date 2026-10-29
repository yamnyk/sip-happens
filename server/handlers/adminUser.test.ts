import { describe, expect, it } from "vitest";
import { ADMIN_ID, asPorts, fakePorts, USER_ID } from "#server/test-utils.js";
import { adminUser } from "./adminUser.js";

const bearer = "Bearer some.jwt.value";
const target = {
  id: USER_ID,
  nick: "victim",
  is_admin: false,
  disabled: false,
};

const goodAdmin = {
  id: ADMIN_ID,
  nick: "boss",
  is_admin: true,
  disabled: false,
};

function setup(callerProfile: object | null = goodAdmin) {
  const p = fakePorts();
  p.profiles.getById.mockImplementation(async (id: string) =>
    id === ADMIN_ID ? callerProfile : id === USER_ID ? target : null,
  );
  return p;
}

describe("adminUser", () => {
  it("rejects a missing bearer token", async () => {
    const p = fakePorts();
    const res = await adminUser(
      { ports: asPorts(p) },
      { authorization: null, body: { userId: USER_ID, action: "delete" } },
    );
    expect(res.body).toEqual({ ok: false, error: "unauthorized" });
  });

  it("rejects an invalid JWT", async () => {
    const p = fakePorts();
    p.auth.verifyJwt.mockResolvedValue(null);
    const res = await adminUser(
      { ports: asPorts(p) },
      { authorization: bearer, body: { userId: USER_ID, action: "delete" } },
    );
    expect(res.status).toBe(401);
    expect(p.auth.deleteUser).not.toHaveBeenCalled();
  });

  it("rejects a non-admin caller", async () => {
    const p = setup({
      id: ADMIN_ID,
      nick: "pleb",
      is_admin: false,
      disabled: false,
    });
    const res = await adminUser(
      { ports: asPorts(p) },
      { authorization: bearer, body: { userId: USER_ID, action: "delete" } },
    );
    expect(res.body).toEqual({ ok: false, error: "forbidden" });
    expect(p.auth.deleteUser).not.toHaveBeenCalled();
  });

  it("rejects a banned/disabled admin caller", async () => {
    const p = setup({
      id: ADMIN_ID,
      nick: "boss",
      is_admin: true,
      disabled: true,
    });
    const res = await adminUser(
      { ports: asPorts(p) },
      { authorization: bearer, body: { userId: USER_ID, action: "ban" } },
    );
    expect(res.body).toEqual({ ok: false, error: "forbidden" });
    expect(p.auth.setBanned).not.toHaveBeenCalled();
  });

  it("rejects a caller with no profile", async () => {
    const p = setup(null);
    const res = await adminUser(
      { ports: asPorts(p) },
      { authorization: bearer, body: { userId: USER_ID, action: "delete" } },
    );
    expect(res.status).toBe(403);
  });

  it("does not let an admin delete or ban themselves", async () => {
    const p = setup();
    const del = await adminUser(
      { ports: asPorts(p) },
      { authorization: bearer, body: { userId: ADMIN_ID, action: "delete" } },
    );
    const ban = await adminUser(
      { ports: asPorts(p) },
      { authorization: bearer, body: { userId: ADMIN_ID, action: "ban" } },
    );
    expect(del.body).toEqual({ ok: false, error: "forbidden" });
    expect(ban.body).toEqual({ ok: false, error: "forbidden" });
    expect(p.auth.deleteUser).not.toHaveBeenCalled();
  });

  it("does not let an admin delete, ban or unban another admin", async () => {
    const p = fakePorts();
    const otherAdmin = {
      id: USER_ID,
      nick: "boss2",
      is_admin: true,
      disabled: false,
    };
    p.profiles.getById.mockImplementation(async (id: string) =>
      id === ADMIN_ID ? goodAdmin : id === USER_ID ? otherAdmin : null,
    );
    for (const action of ["delete", "ban", "unban"] as const) {
      const res = await adminUser(
        { ports: asPorts(p) },
        { authorization: bearer, body: { userId: USER_ID, action } },
      );
      expect(res.body).toEqual({ ok: false, error: "forbidden" });
    }
    expect(p.auth.deleteUser).not.toHaveBeenCalled();
    expect(p.auth.setBanned).not.toHaveBeenCalled();
    expect(p.profiles.setDisabled).not.toHaveBeenCalled();
  });

  it("rejects invalid bodies", async () => {
    const p = setup();
    const res = await adminUser(
      { ports: asPorts(p) },
      { authorization: bearer, body: { userId: "x", action: "nuke" } },
    );
    expect(res.body).toEqual({ ok: false, error: "invalid_input" });
  });

  it("deletes a user", async () => {
    const p = setup();
    const res = await adminUser(
      { ports: asPorts(p) },
      { authorization: bearer, body: { userId: USER_ID, action: "delete" } },
    );
    expect(res).toEqual({ status: 200, body: { ok: true } });
    expect(p.auth.deleteUser).toHaveBeenCalledWith(USER_ID);
  });

  it("flags disabled first, then bans and revokes sessions; a failed revoke does not fail the ban", async () => {
    const p = setup();
    p.auth.revokeSessions.mockRejectedValueOnce(new Error("boom"));
    const res = await adminUser(
      { ports: asPorts(p) },
      { authorization: bearer, body: { userId: USER_ID, action: "ban" } },
    );
    expect(res.status).toBe(200);
    expect(p.profiles.setDisabled.mock.invocationCallOrder[0]).toBeLessThan(
      p.auth.setBanned.mock.invocationCallOrder[0],
    );
    expect(p.auth.revokeSessions).toHaveBeenCalledWith(USER_ID);
  });

  it("bans then flags disabled, and unbans", async () => {
    const p = setup();
    await adminUser(
      { ports: asPorts(p) },
      { authorization: bearer, body: { userId: USER_ID, action: "ban" } },
    );
    expect(p.auth.setBanned).toHaveBeenLastCalledWith(USER_ID, true);
    expect(p.profiles.setDisabled).toHaveBeenLastCalledWith(USER_ID, true);
    await adminUser(
      { ports: asPorts(p) },
      { authorization: bearer, body: { userId: USER_ID, action: "unban" } },
    );
    expect(p.auth.setBanned).toHaveBeenLastCalledWith(USER_ID, false);
    expect(p.profiles.setDisabled).toHaveBeenLastCalledWith(USER_ID, false);
  });
});
