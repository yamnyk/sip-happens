import { useCallback, useMemo, useState } from "react";
import { groupOf } from "#shared/config/criteria.js";
import {
  EMPTY_SUBTYPE,
  hasSubtype,
  useSubtypeField,
  type SubtypeValue,
} from "#modules/subtypes/index.js";
import type { Drink, DrinkType } from "#contract/domain.js";
import { draftContext } from "./drafts.js";
import { filterSuggestions, findExactMatch } from "./reviewForm.js";

interface Prefill {
  name: string;
  type: DrinkType | null;
  subtype: SubtypeValue;
}

/** Which drink the form is about: a route drink, a picked existing one, or a new name plus type. */
export function useDrinkPicker(
  drinks: Drink[] | undefined,
  drinkId: string | undefined,
) {
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<Drink | null>(null);
  const [type, setType] = useState<DrinkType | null>(null);
  const [conflict, setConflict] = useState<Drink | null>(null);
  const subtype = useSubtypeField();
  const { change: changeSubtype, setValue: setSubtypeValue } = subtype;

  const routeDrink = drinkId
    ? drinks?.find((d) => d.id === drinkId)
    : undefined;
  const drink = routeDrink ?? picked;
  const effectiveType = drink?.type ?? type;
  const group = effectiveType ? groupOf(effectiveType) : null;
  const context = draftContext(drink?.id ?? null, name, effectiveType);

  const suggestions = useMemo(
    () => filterSuggestions(drinks, name, Boolean(drink)),
    [drink, name, drinks],
  );
  const exactMatch = findExactMatch(drinks, name, Boolean(drink));

  /** Typing in the name input. */
  function changeName(next: string) {
    setName(next);
    setConflict(null);
  }

  function chooseType(t: DrinkType) {
    setType(t);
    setConflict(null);
    if (t !== "other") changeSubtype(EMPTY_SUBTYPE);
  }

  function pick(d: Drink) {
    setPicked(d);
    setName(d.name);
    setType(d.type);
    changeSubtype(EMPTY_SUBTYPE);
    setConflict(null);
  }

  function clear() {
    setPicked(null);
    setName("");
    setType(null);
    changeSubtype(EMPTY_SUBTYPE);
    setConflict(null);
  }

  /** Applies a resumed draft without overwriting what the user already typed. */
  const applyPrefill = useCallback(
    (p: Prefill) => {
      setName((prev) => prev || p.name);
      setType((prev) => prev ?? p.type);
      if (p.type === "other")
        setSubtypeValue((prev) => (hasSubtype(prev) ? prev : p.subtype));
    },
    [setSubtypeValue],
  );

  return {
    name,
    type,
    conflict,
    setConflict,
    subtype,
    routeDrink,
    picked,
    drink,
    effectiveType,
    group,
    context,
    suggestions,
    exactMatch,
    changeName,
    chooseType,
    pick,
    clear,
    applyPrefill,
  };
}
