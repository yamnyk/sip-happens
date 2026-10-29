import { Button } from "#shared/ui/Button.js";
import { Input } from "#shared/ui/Input.js";
import { cardClass } from "#shared/ui/Card.js";
import { drinkTypeLabel } from "#shared/lib/subtype.js";
import type { Drink, DrinkSubtype } from "#contract/domain.js";
import { reviewStrings as s } from "./strings.js";

interface Props {
  drink: Drink | null | undefined;
  name: string;
  suggestions: Drink[];
  exactMatch: Drink | undefined;
  subtypesById: ReadonlyMap<string, DrinkSubtype>;
  onNameChange: (next: string) => void;
  onPick: (d: Drink) => void;
  onChangeDrink: () => void;
}

/** Picked-drink card, or the name input with suggestions and exists/new hints. */
export function DrinkNameField({
  drink,
  name,
  suggestions,
  exactMatch,
  subtypesById,
  onNameChange,
  onPick,
  onChangeDrink,
}: Props) {
  return (
    <section className="flex flex-col gap-2">
      <label htmlFor="drink-name" className="text-sm text-neutral-400">
        {s.name}
      </label>
      {drink ? (
        <div
          className={cardClass(
            {},
            "flex items-center justify-between gap-3 border border-neutral-700 p-3",
          )}
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-neutral-100">
              {drink.name}
            </p>
            <p className="text-xs text-neutral-500">{s.pickedHint}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onChangeDrink}
            className="shrink-0"
          >
            {s.changeDrink}
          </Button>
        </div>
      ) : (
        <>
          <Input
            id="drink-name"
            placeholder={s.namePlaceholder}
            value={name}
            autoComplete="off"
            onChange={(e) => onNameChange(e.target.value)}
          />
          {suggestions.length > 0 && (
            <ul
              className="flex flex-col overflow-hidden rounded-lg border border-neutral-800"
              aria-label={s.suggestions}
            >
              {suggestions.map((d) => (
                <li
                  key={d.id}
                  className="border-b border-neutral-800 last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => onPick(d)}
                    className="flex min-h-11 w-full items-center justify-between gap-3 bg-neutral-900 px-3 text-left text-neutral-100"
                  >
                    <span className="truncate">{d.name}</span>
                    <span className="shrink-0 text-xs text-neutral-500">
                      {drinkTypeLabel(d, subtypesById)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {exactMatch ? (
            <p className="text-sm text-amber-400">{s.existsHint}</p>
          ) : (
            name.trim() && (
              <p className="text-xs text-neutral-500">{s.newDrink}</p>
            )
          )}
        </>
      )}
    </section>
  );
}
