// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Review } from "#contract/domain.js";
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

  it("reset re-arms the stage init so the next drink opens on its own stage", async () => {
    const review = {
      first_scores: { aroma: 3 },
      final_note: null,
    } as unknown as Review;
    const { result, rerender } = renderHook((p) => useReviewDraft(p), {
      initialProps: {
        ...args,
        context: "a",
        myReview: review as Review | undefined,
      },
    });
    await act(async () => {});
    expect(result.current.stage).toBe("final");

    act(() => result.current.reset());
    rerender({ ...args, context: "b", myReview: undefined });
    await act(async () => {});
    expect(result.current.stage).toBe("first");

    act(() => result.current.reset());
    rerender({ ...args, context: "c", myReview: review });
    await act(async () => {});
    expect(result.current.stage).toBe("final");
  });
});
