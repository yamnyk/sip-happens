import { useState } from "react";
import { catalogStrings as t } from "./strings.js";
import { SORTS } from "./catalogConfig.js";
import type { Sort } from "./catalogRows.js";

/** Sort dropdown button with a listbox and a click-away overlay. */
export function SortMenu({
  sort,
  onChange,
}: {
  sort: Sort;
  onChange: (sort: Sort) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t.catalog.sortLabel}: ${t.catalog.sortOptions[sort]}`}
        className="flex min-h-11 items-center gap-2 rounded-lg bg-neutral-900 px-3 text-sm text-neutral-300"
      >
        <svg
          viewBox="0 0 20 20"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            d="M6 15V5m0 0L3 8m3-3l3 3M14 5v10m0 0l-3-3m3 3l3-3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>{t.catalog.sortOptions[sort]}</span>
      </button>
      {open && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <ul
            role="listbox"
            aria-label={t.catalog.sortLabel}
            className="absolute left-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 shadow-lg"
          >
            {SORTS.map((s) => (
              <li key={s} role="option" aria-selected={sort === s}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(s);
                    setOpen(false);
                  }}
                  className={`flex min-h-11 w-full items-center justify-between px-4 text-left text-sm ${
                    sort === s ? "text-amber-400" : "text-neutral-200"
                  }`}
                >
                  <span>{t.catalog.sortOptions[s]}</span>
                  {sort === s && (
                    <span aria-hidden="true">{t.catalog.selectedIcon}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
