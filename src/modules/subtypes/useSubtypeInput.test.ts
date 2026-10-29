// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DrinkSubtype } from "#contract/domain.js";
import { subtypeStrings } from "./strings.js";
import { useSubtypeInput } from "./useSubtypeInput.js";

const whisky: DrinkSubtype = {
  id: "s1",
  name: "Віскі",
  name_normalized: "віскі",
  created_by: null,
  created_at: "",
};

describe("useSubtypeInput", () => {
  it("adds a clean name and resets the text", () => {
    const onAdd = vi.fn();
    const { result } = renderHook(() =>
      useSubtypeInput({ existing: [whisky], pendingNewName: null, onAdd }),
    );
    act(() => result.current.changeText("  Ром "));
    act(() => result.current.add());
    expect(onAdd).toHaveBeenCalledWith("Ром");
    expect(result.current.text).toBe("");
    expect(result.current.error).toBeNull();
  });

  it("shows the validation error", () => {
    const onAdd = vi.fn();
    const { result } = renderHook(() =>
      useSubtypeInput({ existing: [], pendingNewName: null, onAdd }),
    );
    act(() => result.current.add());
    expect(result.current.error).toBe(subtypeStrings.errors.subtype_empty);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("keeps an existing duplicate selectable and clears on typing", () => {
    const { result } = renderHook(() =>
      useSubtypeInput({
        existing: [whisky],
        pendingNewName: null,
        onAdd: vi.fn(),
      }),
    );
    act(() => result.current.changeText("віскі"));
    act(() => result.current.add());
    expect(result.current.duplicate).toBe(whisky);
    expect(result.current.error).toBe(subtypeStrings.duplicate("Віскі"));
    act(() => result.current.changeText("x"));
    expect(result.current.duplicate).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("does not expose a pending duplicate as selectable", () => {
    const { result } = renderHook(() =>
      useSubtypeInput({ existing: [], pendingNewName: "Ром", onAdd: vi.fn() }),
    );
    act(() => result.current.changeText("ром"));
    act(() => result.current.add());
    expect(result.current.duplicate).toBeNull();
    expect(result.current.error).toBe(subtypeStrings.duplicate("Ром"));
  });
});
