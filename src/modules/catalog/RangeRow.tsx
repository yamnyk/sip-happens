import { Select } from "#shared/ui/Input.js";
import { catalogStrings as t } from "./strings.js";
import { SCORE_OPTIONS } from "./catalogConfig.js";

/** Two selects (from / to) editing one inclusive score range. */
export function RangeRow({
  label,
  min,
  max,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  onChange: (bound: 0 | 1, value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-neutral-300">{label}</span>
      <div className="flex items-center gap-2 text-sm text-neutral-400">
        {([0, 1] as const).map((bound) => (
          <label key={bound} className="flex flex-1 items-center gap-2">
            <span>{bound === 0 ? t.catalog.rangeFrom : t.catalog.rangeTo}</span>
            <Select
              value={bound === 0 ? min : max}
              onChange={(e) => onChange(bound, Number(e.target.value))}
              aria-label={`${label}, ${bound === 0 ? t.catalog.rangeFrom : t.catalog.rangeTo}`}
              className="flex-1"
            >
              {SCORE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </label>
        ))}
      </div>
    </div>
  );
}
