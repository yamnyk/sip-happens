// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSubtypeField } from "./useSubtypeField.js";

describe("useSubtypeField", () => {
  it("starts empty and clears required and notice on change", () => {
    const { result } = renderHook(() => useSubtypeField());
    expect(result.current.value).toEqual({ subtypeId: null, newName: null });

    act(() => {
      result.current.setRequired(true);
      result.current.setNotice("dup");
    });
    expect(result.current.required).toBe(true);
    expect(result.current.notice).toBe("dup");

    act(() => result.current.change({ subtypeId: "s1", newName: null }));
    expect(result.current.value).toEqual({ subtypeId: "s1", newName: null });
    expect(result.current.required).toBe(false);
    expect(result.current.notice).toBeNull();
  });

  it("accepts an initial value", () => {
    const { result } = renderHook(() =>
      useSubtypeField({ subtypeId: "x", newName: null }),
    );
    expect(result.current.value.subtypeId).toBe("x");
  });
});
