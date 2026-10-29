import { useEffect, useRef } from "react";
import { EMPTY_SUBTYPE, type SubtypeValue } from "#modules/subtypes/index.js";
import type { Drink, DrinkType } from "#contract/domain.js";
import { loadDraftMeta } from "./drafts.js";
import { parseDraftContext } from "./reviewForm.js";

interface Args {
  userId: string | undefined;
  draftParam: string | null;
  drinkId: string | undefined;
  drink: Drink | null | undefined;
  apply: (p: {
    name: string;
    type: DrinkType | null;
    subtype: SubtypeValue;
  }) => void;
}

/** Resume an unsaved new-drink draft from /add?draft=<context>: prefill name/type/subtype, then normal hydration restores the stages. */
export function useDraftResume({
  userId,
  draftParam,
  drinkId,
  drink,
  apply,
}: Args) {
  const prefilledRef = useRef(false);

  useEffect(() => {
    if (!userId || !draftParam || drinkId || drink || prefilledRef.current)
      return;
    prefilledRef.current = true;
    void (async () => {
      const meta = await loadDraftMeta(userId, draftParam);
      apply(
        meta
          ? { name: meta.name, type: meta.type, subtype: meta.subtype }
          : { ...parseDraftContext(draftParam), subtype: EMPTY_SUBTYPE },
      );
    })();
  }, [userId, draftParam, drinkId, drink, apply]);
}
