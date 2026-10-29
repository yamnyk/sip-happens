// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listDrafts = vi.fn();
const clearDrafts = vi.fn();
let settle: () => Promise<void> = async () => {};
vi.mock("./drafts.js", () => ({
  whenDraftWritesSettled: () => settle(),
  listDrafts: (...a: unknown[]) => listDrafts(...a),
  clearDrafts: (...a: unknown[]) => clearDrafts(...a),
}));

import { useDraftList } from "./useDraftList.js";

const entry = (context: string) => ({ context, stages: ["first"], meta: null });

describe("useDraftList", () => {
  beforeEach(() => {
    listDrafts.mockReset();
    clearDrafts.mockReset();
    settle = async () => {};
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

  it("waits for pending draft writes before listing", async () => {
    let release!: () => void;
    settle = () => new Promise<void>((r) => (release = r));
    listDrafts.mockResolvedValue([entry("a")]);
    const { result } = renderHook(() => useDraftList("u1"));
    await act(async () => {});
    expect(listDrafts).not.toHaveBeenCalled();
    await act(async () => release());
    await waitFor(() => expect(result.current.drafts).toHaveLength(1));
  });
});
