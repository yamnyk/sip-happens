import { describe, expect, it } from "vitest";
import { asPorts, fakePorts } from "#server/test-utils.js";
import { resetRequest } from "./resetRequest.js";

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
