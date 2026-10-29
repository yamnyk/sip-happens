import { describe, expect, it } from "vitest";
import type { Drink, Review } from "#contract/domain.js";
import {
  ALL_OTHER,
  buildRows,
  clampBound,
  compareRows,
  groupsForFilter,
  selectEffectiveRanges,
  type CatalogRow,
} from "./catalogRows.js";

function drink(partial: Partial<Drink>): Drink {
  return {
    id: "d",
    name: "Drink",
    type: "red",
    subtype_id: null,
    created_by: null,
    name_normalized: null,
    created_at: "2024-01-01",
    ...partial,
  } as Drink;
}

function review(drinkId: string, score: number): Review {
  const scores = { aroma: score, palate: score, finish: score, again: score };
  return {
    id: `r-${drinkId}-${score}`,
    drink_id: drinkId,
    author_id: "a",
    first_scores: null,
    first_note: null,
    final_scores: scores,
    final_note: null,
    created_at: "",
    updated_at: "",
  } as Review;
}

const ids = (rows: CatalogRow[]) => rows.map((r) => r.drink.id);

describe("groupsForFilter", () => {
  it("maps filters to criteria groups", () => {
    expect(groupsForFilter("all")).toEqual([]);
    expect(groupsForFilter("wine")).toEqual(["wine"]);
    expect(groupsForFilter("red")).toEqual(["wine"]);
    expect(groupsForFilter("gin")).not.toEqual(["wine"]);
  });
});

describe("clampBound", () => {
  it("pushes max up when min passes it", () => {
    expect(clampBound([2, 5], 0, 7)).toEqual([7, 7]);
    expect(clampBound([2, 5], 0, 3)).toEqual([3, 5]);
  });
  it("pulls min down when max drops below it", () => {
    expect(clampBound([4, 8], 1, 2)).toEqual([2, 2]);
    expect(clampBound([4, 8], 1, 6)).toEqual([4, 6]);
  });
});

describe("selectEffectiveRanges", () => {
  const ranges = { "wine.aroma": [3, 8] as [number, number] };
  it("keeps ranges of shown groups only", () => {
    expect(selectEffectiveRanges(ranges, "red")).toEqual(ranges);
    expect(selectEffectiveRanges(ranges, "wine")).toEqual(ranges);
    expect(selectEffectiveRanges(ranges, "all")).toEqual({});
  });
});

describe("buildRows", () => {
  const drinks = [
    drink({ id: "a", name: "Alpha", type: "red", created_at: "2024-01-01" }),
    drink({ id: "b", name: "Beta", type: "white", created_at: "2024-03-01" }),
    drink({ id: "c", name: "Gamma", type: "rose", created_at: "2024-02-01" }),
    drink({
      id: "o1",
      name: "Other1",
      type: "other",
      subtype_id: "s1",
      created_at: "2024-04-01",
    }),
    drink({
      id: "o2",
      name: "Other2",
      type: "other",
      subtype_id: "s2",
      created_at: "2024-05-01",
    }),
  ];
  const reviews = [
    review("a", 4),
    review("b", 9),
    review("b", 9),
    review("c", 9),
  ];

  it("filters by type, wine group and subtype", () => {
    expect(
      ids(buildRows(drinks, reviews, "all", ALL_OTHER, "name")),
    ).toHaveLength(5);
    expect(ids(buildRows(drinks, reviews, "wine", ALL_OTHER, "name"))).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(ids(buildRows(drinks, reviews, "rose", ALL_OTHER, "name"))).toEqual([
      "c",
    ]);
    expect(ids(buildRows(drinks, reviews, "other", "s1", "name"))).toEqual([
      "o1",
    ]);
    expect(ids(buildRows(drinks, reviews, "other", ALL_OTHER, "new"))).toEqual([
      "o2",
      "o1",
    ]);
  });

  it("joins stats", () => {
    const rows = buildRows(drinks, reviews, "wine", ALL_OTHER, "name");
    expect(rows[1]?.stats.count).toBe(2);
    expect(rows[0]?.stats.average).toBe(4);
  });

  it("sorts best with count tie-break and unrated last", () => {
    expect(ids(buildRows(drinks, reviews, "all", ALL_OTHER, "best"))).toEqual([
      "b",
      "c",
      "a",
      "o2",
      "o1",
    ]);
  });

  it("sorts worst with unrated still last", () => {
    expect(ids(buildRows(drinks, reviews, "all", ALL_OTHER, "worst"))).toEqual([
      "a",
      "b",
      "c",
      "o2",
      "o1",
    ]);
  });

  it("sorts by date, name and review count", () => {
    expect(ids(buildRows(drinks, reviews, "all", ALL_OTHER, "new"))).toEqual([
      "o2",
      "o1",
      "b",
      "c",
      "a",
    ]);
    expect(ids(buildRows(drinks, reviews, "all", ALL_OTHER, "old"))).toEqual([
      "a",
      "c",
      "b",
      "o1",
      "o2",
    ]);
    expect(ids(buildRows(drinks, reviews, "all", ALL_OTHER, "name"))[0]).toBe(
      "a",
    );
    expect(
      ids(buildRows(drinks, reviews, "all", ALL_OTHER, "reviews")),
    ).toEqual(["b", "c", "a", "o2", "o1"]);
  });
});

describe("compareRows", () => {
  it("returns zero for identical rows under name", () => {
    const row = {
      drink: drink({ name: "X" }),
      group: "wine",
      stats: { average: null, count: 0 },
      averages: {},
    } as CatalogRow;
    expect(compareRows("name")(row, row)).toBe(0);
  });
});
