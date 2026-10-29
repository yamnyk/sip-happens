import { SubtypePicker, type SubtypeValue } from "#modules/subtypes/index.js";
import { Chip, chipClass } from "#shared/ui/Chip.js";
import { drinkTypeLabel } from "#shared/lib/subtype.js";
import { typeLabels } from "#shared/strings.js";
import {
  DRINK_TYPES,
  type Drink,
  type DrinkSubtype,
  type DrinkType,
} from "#contract/domain.js";
import { ConflictOffer } from "./ConflictOffer.js";
import { reviewStrings as s } from "./strings.js";

interface Props {
  drink: Drink | null | undefined;
  type: DrinkType | null;
  conflict: Drink | null;
  subtypesById: ReadonlyMap<string, DrinkSubtype>;
  subtype: {
    value: SubtypeValue;
    required: boolean;
    notice: string | null;
    change: (next: SubtypeValue) => void;
  };
  onChooseType: (t: DrinkType) => void;
  onPick: (d: Drink) => void;
}

/** Locked type chip for an existing drink, or type chips, subtype picker and conflict offer for a new one. */
export function DrinkTypeField({
  drink,
  type,
  conflict,
  subtypesById,
  subtype,
  onChooseType,
  onPick,
}: Props) {
  return (
    <section className="flex flex-col gap-2">
      <p className="text-sm text-neutral-400">{s.type}</p>
      {drink ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className={chipClass(true)}>
            {drinkTypeLabel(drink, subtypesById)}
          </span>
          <span className="text-xs text-neutral-500">{s.typeLocked}</span>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2" role="group" aria-label={s.type}>
          {DRINK_TYPES.map((t) => (
            <Chip key={t} selected={type === t} onClick={() => onChooseType(t)}>
              {typeLabels[t]}
            </Chip>
          ))}
        </div>
      )}
      {!drink && type === "other" && (
        <SubtypePicker
          value={subtype.value}
          onChange={subtype.change}
          showRequired={subtype.required}
          notice={subtype.notice}
        />
      )}
      {conflict && <ConflictOffer conflict={conflict} onUse={onPick} />}
    </section>
  );
}
