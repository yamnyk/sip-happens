import { useMemo } from "react";
import { useSubtypes } from "#shared/api/queries.js";
import type { DrinkSubtype } from "#contract/domain.js";

/** Lookup for drinkTypeLabel. Empty while loading: labels then fall back to the generic "Інше". */
export function useSubtypesById(): ReadonlyMap<string, DrinkSubtype> {
  const { data } = useSubtypes();
  return useMemo(() => new Map((data ?? []).map((s) => [s.id, s])), [data]);
}
