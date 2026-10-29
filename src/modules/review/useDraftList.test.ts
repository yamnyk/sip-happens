// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listDrafts = vi.fn();
const clearDrafts = vi.fn();
vi.mock("./drafts.js", () => ({
  listDrafts: (...a: unknown[]) => listDrafts(...a),
  clearDrafts: (...a: unknown[]) => clearDrafts(...a),
}));

import { useDraftList } from "./useDraftList.js";

const entry = (context: string) => ({ context, stages: ["first"], meta: null });

describe("useDraftList", () => {
  beforeEach(() => {
    listDrafts.mockReset();
    clearDrafts.mockReset();
  });

  it("stays empty without a user", async () => {
    const { result } = renderHook(() => useDraftList(undefined));
    await act(async () => {});
    expect(result.current.drafts).toEqual([]);
    expect(listDrafts).not.toHaveBeenCalled();
  });

  it("loads on mount and reloads after remove", async () => {
    listDrafts.mockResolvedValueOnce([entry("a"), entry("b")]);
    const { result } = renderHook(() => useDraftList("u1"));
    await waitFor(() => expect(result.current.drafts).toHaveLength(2));
    expect(listDrafts).toHaveBeenCalledWith("u1");

    listDrafts.mockResolvedValueOnce([entry("b")]);
    await act(async () => {
      await result.current.remove("a");
    });
    expect(clearDrafts).toHaveBeenCalledWith("u1", "a");
    expect(result.current.drafts.map((d) => d.context)).toEqual(["b"]);
  });
});
