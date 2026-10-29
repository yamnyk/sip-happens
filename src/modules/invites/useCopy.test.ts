// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCopy } from "./useCopy.js";

function mockClipboard(writeText: (t: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
}

describe("useCopy", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("marks the key as copied and resets after 2 s", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);
    const { result } = renderHook(() => useCopy());

    await act(() => result.current.copy("a", "url-a"));
    expect(writeText).toHaveBeenCalledWith("url-a");
    expect(result.current.copied).toBe("a");

    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.copied).toBeNull();
  });

  it("does not let an earlier timer clear a later copy", async () => {
    mockClipboard(vi.fn().mockResolvedValue(undefined));
    const { result } = renderHook(() => useCopy());

    await act(() => result.current.copy("a", "url-a"));
    act(() => vi.advanceTimersByTime(1500));
    await act(() => result.current.copy("b", "url-b"));
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.copied).toBe("b");

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.copied).toBeNull();
  });

  it("sets copyError on failure and clears it on the next attempt", async () => {
    mockClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    const { result } = renderHook(() => useCopy());

    await act(() => result.current.copy("a", "url-a"));
    expect(result.current.copyError).toBe(true);
    expect(result.current.copied).toBeNull();

    mockClipboard(vi.fn().mockResolvedValue(undefined));
    await act(() => result.current.copy("a", "url-a"));
    expect(result.current.copyError).toBe(false);
  });
});
