import { useState } from "react";
import { CRITERIA } from "#shared/config/criteria.js";
import { rangeKey, type CriterionRanges } from "#shared/lib/catalogFilter.js";
import { Button } from "#shared/ui/Button.js";
import { cardClass } from "#shared/ui/Card.js";
import type { DrinkGroup } from "#contract/domain.js";
import { catalogStrings as t } from "./strings.js";
import { FULL_RANGE } from "./catalogConfig.js";
import type { Sort } from "./catalogRows.js";
import { RangeRow } from "./RangeRow.js";
import { SortMenu } from "./SortMenu.js";

/** Toolbar (filters toggle, sort, reset, result count) and the collapsible range panel. */
export function FilterPanel({
  isAll,
  shownGroups,
  ranges,
  totalRange,
  activeCount,
  foundCount,
  sort,
  onSortChange,
  onTotalBound,
  onRangeBound,
  onReset,
}: {
  isAll: boolean;
  shownGroups: DrinkGroup[];
  ranges: CriterionRanges;
  totalRange: [number, number];
  activeCount: number;
  foundCount: number;
  sort: Sort;
  onSortChange: (sort: Sort) => void;
  onTotalBound: (bound: 0 | 1, value: number) => void;
  onRangeBound: (key: string, bound: 0 | 1, value: number) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="catalog-filter-panel"
          className="flex min-h-11 items-center gap-2 rounded-lg bg-neutral-900 px-3 text-sm text-neutral-300"
        >
          <span>{t.catalog.filters}</span>
          {activeCount > 0 && (
            <span className="rounded-full bg-amber-400 px-2 text-xs font-medium text-neutral-950">
              {activeCount}
            </span>
          )}
          <svg
            viewBox="0 0 20 20"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path
              d="M5 8l5 5 5-5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <SortMenu sort={sort} onChange={onSortChange} />

        {activeCount > 0 && (
          <Button
            type="button"
            variant="link"
            onClick={onReset}
            className="px-3"
          >
            {t.catalog.filtersReset}
          </Button>
        )}
        <p className="ml-auto text-sm text-neutral-400">
          {t.catalog.found(foundCount)}
        </p>
      </div>

      {open && (
        <div
          id="catalog-filter-panel"
          className={cardClass({}, "flex flex-col gap-4 p-4")}
        >
          {isAll ? (
            <RangeRow
              label={t.catalog.totalRating}
              min={totalRange[0]}
              max={totalRange[1]}
              onChange={onTotalBound}
            />
          ) : (
            shownGroups.flatMap((g) =>
              CRITERIA[g].map((c) => {
                const key = rangeKey(g, c.key);
                const [min, max] = ranges[key] ?? FULL_RANGE;
                return (
                  <RangeRow
                    key={key}
                    label={c.label}
                    min={min}
                    max={max}
                    onChange={(bound, value) => onRangeBound(key, bound, value)}
                  />
                );
              }),
            )
          )}
        </div>
      )}
    </div>
  );
}
