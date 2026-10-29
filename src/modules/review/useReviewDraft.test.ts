// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_SUBTYPE } from "#modules/subtypes/index.js";

const persist = vi.fn(async () => {});
vi.mock("./drafts.js", async (orig) => ({
  ...(await orig<typeof import("./drafts.js")>()),
  persistDrafts: persist,
  loadStageDraft: async () => null,
  clearDrafts: async () => {},
}));

const { useReviewDraft } = await import("./useReviewDraft.js");
const { withNote } = await import("./reviewForm.js");

const args = {
  ready: true,
  userId: "u",
  context: "c",
  myReview: undefined,
  saving: false,
  draftName: "n",
  effectiveType: "red" as const,
  subtype: EMPTY_SUBTYPE,
};

beforeEach(() => {
  vi.useFakeTimers();
  persist.mockClear();
});
afterEach(() => vi.useRealTimers());

describe("useReviewDraft", () => {
  it("debounces persistence by 500 ms after hydration and an edit", async () => {
    const { result } = renderHook(() => useReviewDraft(args));
    await act(async () => {});
    act(() => result.current.edit((p) => withNote(p, "first", "hi")));
    act(() => void vi.advanceTimersByTime(499));
    expect(persist).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(1));
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("flushes a dirty draft on unmount", async () => {
    const { result, unmount } = renderHook(() => useReviewDraft(args));
    await act(async () => {});
    act(() => result.current.edit((p) => withNote(p, "first", "hi")));
    unmount();
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("does not write before an edit", async () => {
    const { unmount } = renderHook(() => useReviewDraft(args));
    await act(async () => {});
    act(() => void vi.advanceTimersByTime(1000));
    unmount();
    expect(persist).not.toHaveBeenCalled();
  });
});
