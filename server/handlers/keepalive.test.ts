import { describe, expect, it } from "vitest";
import { asPorts, fakePorts } from "#server/test-utils.js";
import { keepalive } from "./keepalive.js";

describe("keepalive", () => {
  const secret = "cron-secret-value";

  it("rejects a bad bearer without touching the database", async () => {
    const p = fakePorts();
    const res = await keepalive(
      { ports: asPorts(p), cronSecret: secret },
      { authorization: "Bearer wrong" },
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
      (
        await keepalive(
          { ports: asPorts(p), cronSecret: secret },
          { authorization: null },
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await keepalive(
          { ports: asPorts(p), cronSecret: secret },
          { authorization: `Basic ${secret}` },
        )
      ).status,
    ).toBe(401);
  });

  it("never accepts when the configured secret is empty", async () => {
    const p = fakePorts();
    const res = await keepalive(
      { ports: asPorts(p), cronSecret: "" },
      { authorization: "Bearer " },
    );
    expect(res.status).toBe(401);
  });

  it("pings the database on a correct bearer", async () => {
    const p = fakePorts();
    const res = await keepalive(
      { ports: asPorts(p), cronSecret: secret },
      { authorization: `Bearer ${secret}` },
    );
    expect(res).toEqual({ status: 200, body: { ok: true } });
    expect(p.health.ping).toHaveBeenCalledOnce();
  });
});
