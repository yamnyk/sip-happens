// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_SUBTYPE } from "#modules/subtypes/index.js";
import type { Review } from "#contract/domain.js";

const navigate = vi.fn();
vi.mock("react-router", () => ({ useNavigate: () => navigate }));

const reviewsInCache: Review[] = [];
const queryClient = {
  refetchQueries: vi.fn(async () => {}),
  invalidateQueries: vi.fn(async () => {}),
  getQueryData: vi.fn(() => reviewsInCache),
};
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => queryClient }));

vi.mock("#modules/subtypes/index.js", async (orig) => ({
  ...(await orig<typeof import("#modules/subtypes/index.js")>()),
  useEnsureSubtype: () => async () => ({ id: "st" }),
}));

const createDrink = vi.fn();
const updateDrink = vi.fn();
const insertReview = vi.fn();
const updateReview = vi.fn();
vi.mock("./queries.js", () => ({
  createDrink: (...a: unknown[]) => createDrink(...a),
  updateDrink: (...a: unknown[]) => updateDrink(...a),
  insertReview: (...a: unknown[]) => insertReview(...a),
  updateReview: (...a: unknown[]) => updateReview(...a),
}));
vi.mock("./drafts.js", () => ({ clearDrafts: async () => {} }));
vi.mock("#shared/lib/review.js", () => ({ toReviewRow: () => ({ row: 1 }) }));

const { useSubmitReview } = await import("./useSubmitReview.js");

function setup(over: Record<string, unknown> = {}) {
  const setError = vi.fn();
  const props = {
    userId: "u",
    context: "c",
    name: "Barolo",
    drink: null,
    group: {},
    effectiveType: "red",
    state: { canSave: true },
    draft: {},
    myReview: undefined,
    subtype: {
      value: EMPTY_SUBTYPE,
      setValue: vi.fn(),
      setRequired: vi.fn(),
      setNotice: vi.fn(),
    },
    setSaving: vi.fn(),
    setError,
    setConflict: vi.fn(),
    ...over,
  };
  const hook = renderHook((p) => useSubmitReview(p as never), {
    initialProps: props,
  });
  return { hook, props, setError };
}

beforeEach(() => {
  vi.clearAllMocks();
  reviewsInCache.length = 0;
});

describe("useSubmitReview", () => {
  it("B7: retry after a failed review insert reuses the created drink", async () => {
    createDrink.mockResolvedValue({ id: "d1" });
    insertReview.mockRejectedValueOnce(new Error("net"));
    const { hook, props, setError } = setup();
    await act(async () => hook.result.current.onSave());
    expect(createDrink).toHaveBeenCalledTimes(1);
    expect(setError).toHaveBeenLastCalledWith(expect.any(String));

    // Same name: no second drink, no rename.
    insertReview.mockResolvedValueOnce(undefined);
    await act(async () => hook.result.current.onSave());
    expect(createDrink).toHaveBeenCalledTimes(1);
    expect(updateDrink).not.toHaveBeenCalled();
    expect(insertReview).toHaveBeenLastCalledWith("d1", { row: 1 });

    // Edited name after a failure: the created drink is renamed.
    insertReview.mockRejectedValueOnce(new Error("net"));
    await act(async () => hook.result.current.onSave());
    insertReview.mockResolvedValueOnce(undefined);
    updateDrink.mockResolvedValue({ id: "d1" });
    hook.rerender({ ...props, name: "Barolo 2019" });
    await act(async () => hook.result.current.onSave());
    expect(createDrink).toHaveBeenCalledTimes(1);
    expect(updateDrink).toHaveBeenCalledWith("d1", {
      name: "Barolo 2019",
      type: "red",
      subtypeId: null,
    });
    expect(insertReview).toHaveBeenLastCalledWith("d1", { row: 1 });
  });

  it("B7: forgetCreated unbinds the drink", async () => {
    createDrink.mockResolvedValue({ id: "d1" });
    insertReview.mockRejectedValueOnce(new Error("net"));
    const { hook } = setup();
    await act(async () => hook.result.current.onSave());
    act(() => hook.result.current.forgetCreated());
    insertReview.mockResolvedValueOnce(undefined);
    createDrink.mockResolvedValueOnce({ id: "d2" });
    await act(async () => hook.result.current.onSave());
    expect(createDrink).toHaveBeenCalledTimes(2);
  });

  it("B5: unique violation on insert refetches and updates the existing review", async () => {
    const drink = { id: "d1", name: "Barolo", type: "red" };
    insertReview.mockResolvedValue({ duplicate: true });
    reviewsInCache.push({ id: "r1", drink_id: "d1", author_id: "u" } as Review);
    updateReview.mockResolvedValue(true);
    const { hook, setError } = setup({ drink });
    await act(async () => hook.result.current.onSave());
    expect(queryClient.refetchQueries).toHaveBeenCalled();
    expect(updateReview).toHaveBeenCalledWith("r1", { row: 1 });
    expect(navigate).toHaveBeenCalledWith("/drink/d1");
    expect(setError).not.toHaveBeenCalledWith(expect.any(String));
  });
});
