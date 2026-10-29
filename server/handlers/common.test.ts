import { describe, expect, it } from "vitest";
import { fail, ok, parseBearer, safeEqual } from "./common.js";

describe("parseBearer", () => {
  it("returns null for missing headers", () => {
    expect(parseBearer(null)).toBeNull();
    expect(parseBearer(undefined)).toBeNull();
    expect(parseBearer("")).toBeNull();
  });

  it("returns null for a wrong scheme or missing token", () => {
    expect(parseBearer("Basic abc")).toBeNull();
    expect(parseBearer("abc")).toBeNull();
    expect(parseBearer("Bearer")).toBeNull();
    expect(parseBearer("Bearer a b")).toBeNull();
  });

  it("is case-insensitive on the scheme", () => {
    expect(parseBearer("bearer abc")).toBe("abc");
    expect(parseBearer("BEARER abc")).toBe("abc");
  });

  it("tolerates extra spaces", () => {
    expect(parseBearer("Bearer    abc")).toBe("abc");
    expect(parseBearer("  Bearer abc  ")).toBe("abc");
  });

  it("returns the token for a valid header", () => {
    expect(parseBearer("Bearer abc.def-123")).toBe("abc.def-123");
  });
});

describe("safeEqual", () => {
  it("is true for equal strings", () => {
    expect(safeEqual("secret", "secret")).toBe(true);
  });
  it("is false for different strings", () => {
    expect(safeEqual("secret", "secreT")).toBe(false);
  });
  it("is false for different lengths without throwing", () => {
    expect(safeEqual("secret", "secret2")).toBe(false);
    expect(safeEqual("", "x")).toBe(false);
  });
});

describe("ok and fail", () => {
  it("build results with the expected status", () => {
    expect(ok({ x: 1 })).toEqual({ status: 200, body: { ok: true, x: 1 } });
    expect(fail("forbidden")).toEqual({
      status: 403,
      body: { ok: false, error: "forbidden" },
    });
  });
});
