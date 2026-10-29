import { SCORE_MAX, SCORE_MIN } from "#shared/config/criteria.js";
import { typeLabels } from "#shared/strings.js";
import { catalogStrings as t } from "./strings.js";
import type { Filter, Sort } from "./catalogRows.js";

export const SORTS: Sort[] = ["best", "worst", "new", "old", "name", "reviews"];

export const SCORE_OPTIONS = Array.from(
  { length: SCORE_MAX - SCORE_MIN + 1 },
  (_, i) => SCORE_MIN + i,
);

export const FULL_RANGE: [number, number] = [SCORE_MIN, SCORE_MAX];

export const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: t.catalog.filterAll },
  { id: "wine", label: t.catalog.filterWine },
  { id: "red", label: typeLabels.red },
  { id: "white", label: typeLabels.white },
  { id: "rose", label: typeLabels.rose },
  { id: "sparkling", label: typeLabels.sparkling },
  { id: "port", label: typeLabels.port },
  { id: "gin", label: typeLabels.gin },
  { id: "other", label: typeLabels.other },
];
