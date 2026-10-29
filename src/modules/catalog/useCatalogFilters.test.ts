// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ALL_OTHER } from "./catalogRows.js";
import { useCatalogFilters } from "./useCatalogFilters.js";

describe("useCatalogFilters", () => {
  it("starts unfiltered", () => {
    const { result } = renderHook(() => useCatalogFilters());
    expect(result.current.filter).toBe("all");
    expect(result.current.sort).toBe("best");
    expect(result.current.activeCount).toBe(0);
    expect(result.current.shownGroups).toEqual([]);
  });

  it("resets subFilter when the filter changes", () => {
    const { result } = renderHook(() => useCatalogFilters());
    act(() => result.current.setFilter("other"));
    act(() => result.current.setSubFilter("s1"));
    expect(result.current.subFilter).toBe("s1");
    act(() => result.current.setFilter("gin"));
    expect(result.current.subFilter).toBe(ALL_OTHER);
  });

  it("counts the total range on all and criteria ranges elsewhere", () => {
    const { result } = renderHook(() => useCatalogFilters());
    act(() => result.current.setTotalBound(0, 5));
    expect(result.current.activeCount).toBe(1);
    act(() => result.current.setFilter("red"));
    expect(result.current.activeCount).toBe(0);
    act(() => result.current.setRangeBound("wine.aroma", 0, 6));
    expect(result.current.activeCount).toBe(1);
    expect(result.current.ranges["wine.aroma"]).toEqual([6, 10]);
  });

  it("keeps ranges per group but only applies shown ones", () => {
    const { result } = renderHook(() => useCatalogFilters());
    act(() => result.current.setFilter("red"));
    act(() => result.current.setRangeBound("wine.aroma", 0, 6));
    act(() => result.current.setFilter("gin"));
    expect(result.current.ranges["wine.aroma"]).toEqual([6, 10]);
    expect(result.current.effectiveRanges).toEqual({});
    act(() => result.current.setFilter("wine"));
    expect(result.current.effectiveRanges["wine.aroma"]).toEqual([6, 10]);
  });

  it("reset clears all ranges", () => {
    const { result } = renderHook(() => useCatalogFilters());
    act(() => result.current.setTotalBound(1, 4));
    act(() => result.current.setRangeBound("wine.aroma", 0, 6));
    act(() => result.current.reset());
    expect(result.current.totalRange).toEqual([0, 10]);
    expect(result.current.ranges).toEqual({});
  });
});
