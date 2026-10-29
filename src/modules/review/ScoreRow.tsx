import {
  SCORE_MAX,
  SCORE_MIN,
  type Criterion,
} from "#shared/config/criteria.js";
import { reviewStrings } from "./strings.js";

const values = Array.from(
  { length: SCORE_MAX - SCORE_MIN + 1 },
  (_, i) => SCORE_MIN + i,
);

interface Props {
  criterion: Criterion;
  value: number | undefined;
  onChange: (next: number | undefined) => void;
}

export function ScoreRow({ criterion, value, onChange }: Props) {
  return (
    <div
      className="flex flex-col gap-2"
      role="group"
      aria-label={criterion.label}
    >
      <div>
        <p className="font-medium text-neutral-100">{criterion.label}</p>
        <p className="text-xs text-neutral-500">
          {reviewStrings.weight(criterion.weight)}
        </p>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {values.map((v) => {
          const on = value === v;
          return (
            <button
              key={v}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? undefined : v)}
              className={`min-h-11 rounded-lg border text-base font-medium ${
                on
                  ? "border-amber-400 bg-amber-400 text-neutral-950"
                  : "border-neutral-700 bg-neutral-900 text-neutral-200"
              }`}
            >
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}
