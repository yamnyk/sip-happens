import { useMemo } from "react";
import { useSubtypes } from "../../data/queries";
import type { DrinkSubtype } from "../../types/domain";

/** Lookup for drinkTypeLabel. Empty while loading: labels then fall back to the generic "Інше". */
export function useSubtypesById(): ReadonlyMap<string, DrinkSubtype> {
  const { data } = useSubtypes();
  return useMemo(() => new Map((data ?? []).map((s) => [s.id, s])), [data]);
}
