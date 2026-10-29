import type { DrinkType, Scores } from "#contract/domain.js";
import { criteriaFor } from "#shared/config/criteria.js";
import { catalogStrings as t } from "./strings.js";

/** One review stage (first impression or final): criteria scores and a note. Renders nothing when empty. */
export function StageBlock({
  label,
  type,
  scores,
  note,
}: {
  label: string;
  type: DrinkType;
  scores: Scores | null;
  note: string | null;
}) {
  if (!scores && !note) return null;
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-neutral-950/60 p-3">
      <p className="text-xs tracking-wide text-neutral-500 uppercase">
        {label}
      </p>
      {scores && (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {criteriaFor(type).map((c) => (
            <li
              key={c.key}
              className="flex items-baseline justify-between gap-2"
            >
              <span className="text-neutral-400">{c.label}</span>
              <span className="font-medium tabular-nums">
                {scores[c.key] ?? t.drink.emptyScore}
              </span>
            </li>
          ))}
        </ul>
      )}
      {note && (
        <p className="text-sm whitespace-pre-wrap text-neutral-200">{note}</p>
      )}
    </div>
  );
}
