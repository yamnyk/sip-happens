import { afterEach, describe, expect, it, vi } from "vitest";
import { fail, ok } from "./handlers/common.js";
import { guard, readJson, toResponse } from "./http.js";

afterEach(() => vi.restoreAllMocks());

describe("toResponse", () => {
  it("serializes status, body and headers", async () => {
    const res = toResponse(ok({ a: 1 }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe(
      "application/json; charset=utf-8",
    );
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ ok: true, a: 1 });
  });
});

describe("guard", () => {
  it("passes an ok result through", async () => {
    const res = await guard(async () => ok());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it.each([
    ["invalid_input", 400],
    ["invalid_token", 400],
    ["nick_taken", 409],
    ["rate_limited", 429],
    ["unauthorized", 401],
    ["forbidden", 403],
    ["server_error", 500],
  ] as const)("maps %s to %i", async (code, status) => {
    const res = await guard(async () => fail(code));
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ ok: false, error: code });
  });

  it("turns a thrown Error into a generic 500 and logs name and message", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await guard(async () => {
      throw new Error("db down");
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "server_error" });
    expect(spy).toHaveBeenCalledWith("api error:", "Error: db down");
  });

  it("logs unknown for a non-Error throw", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await guard(async () => {
      throw "secret-ish string";
    });
    expect(res.status).toBe(500);
    expect(spy).toHaveBeenCalledWith("api error:", "unknown");
  });
});

describe("readJson", () => {
  const post = (body?: string): Request =>
    new Request("http://localhost/x", { method: "POST", body });

  it("parses a valid JSON body", async () => {
    expect(await readJson(post('{"a":1}'))).toEqual({ a: 1 });
  });

  it("returns undefined for invalid JSON", async () => {
    expect(await readJson(post("{nope"))).toBeUndefined();
  });

  it("returns undefined for an empty body", async () => {
    expect(await readJson(post())).toBeUndefined();
    expect(await readJson(post(""))).toBeUndefined();
  });
});
