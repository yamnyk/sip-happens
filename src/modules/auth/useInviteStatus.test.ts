// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiErrors } from "#shared/strings.js";
import { useInviteStatus } from "./useInviteStatus.js";

const callApi = vi.fn();
vi.mock("#shared/api/callApi.js", () => ({
  callApi: (...args: unknown[]) => callApi(...args),
}));

describe("useInviteStatus", () => {
  beforeEach(() => callApi.mockReset());

  it("starts loading and becomes valid with the inviter", async () => {
    callApi.mockResolvedValue({ ok: true, valid: true, inviterNick: "ann" });
    const { result } = renderHook(() => useInviteStatus("t 1"));
    expect(result.current.status).toEqual({ state: "loading" });
    await waitFor(() =>
      expect(result.current.status).toEqual({
        state: "valid",
        inviterNick: "ann",
      }),
    );
    expect(callApi).toHaveBeenCalledWith("/api/invite-status?token=t%201");
  });

  it("is dead with invalid_token when the invite is not valid", async () => {
    callApi.mockResolvedValue({ ok: true, valid: false });
    const { result } = renderHook(() => useInviteStatus("t"));
    await waitFor(() =>
      expect(result.current.status).toEqual({
        state: "dead",
        message: apiErrors.invalid_token,
      }),
    );
  });

  it("maps server_error and other failures", async () => {
    callApi.mockResolvedValue({ ok: false, error: "server_error" });
    const first = renderHook(() => useInviteStatus("t"));
    await waitFor(() =>
      expect(first.result.current.status).toEqual({
        state: "dead",
        message: apiErrors.server_error,
      }),
    );
    callApi.mockResolvedValue({ ok: false, error: "rate_limited" });
    const second = renderHook(() => useInviteStatus("t"));
    await waitFor(() =>
      expect(second.result.current.status).toEqual({
        state: "dead",
        message: apiErrors.invalid_token,
      }),
    );
  });

  it("ignores a response that arrives after unmount", async () => {
    let resolve: (v: unknown) => void = () => {};
    callApi.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result, unmount } = renderHook(() => useInviteStatus("t"));
    unmount();
    resolve({ ok: true, valid: true, inviterNick: "x" });
    await Promise.resolve();
    expect(result.current.status).toEqual({ state: "loading" });
  });
});
