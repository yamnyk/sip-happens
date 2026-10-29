import { useRef } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "#shared/api/queries.js";
import {
  toReviewRow,
  type evaluateReview,
  type ReviewDraft,
} from "#shared/lib/review.js";
import {
  hasSubtype,
  subtypeStrings,
  useEnsureSubtype,
  type SubtypeValue,
} from "#modules/subtypes/index.js";
import type { Drink, DrinkGroup, DrinkType, Review } from "#contract/domain.js";
import { clearDrafts } from "./drafts.js";
import { createDrink, insertReview, updateReview } from "./queries.js";
import { findConflict } from "./reviewForm.js";
import { reviewStrings as s } from "./strings.js";

interface SubtypeField {
  value: SubtypeValue;
  setValue: (v: SubtypeValue) => void;
  setRequired: (v: boolean) => void;
  setNotice: (v: string | null) => void;
}

interface Args {
  userId: string | undefined;
  context: string | null;
  name: string;
  drink: Drink | null | undefined;
  group: DrinkGroup | null;
  effectiveType: DrinkType | null;
  state: ReturnType<typeof evaluateReview> | null;
  draft: ReviewDraft;
  myReview: Review | undefined;
  subtype: SubtypeField;
  setSaving: (v: boolean) => void;
  setError: (v: string | null) => void;
  setConflict: (d: Drink | null) => void;
}

/** Creates the drink if needed, then inserts or updates the review. Returns the save handler. */
export function useSubmitReview(a: Args) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ensureSubtype = useEnsureSubtype();
  const createdRef = useRef<Record<string, string>>({});

  async function resolveConflict() {
    await queryClient.refetchQueries({ queryKey: queryKeys.drinks });
    const list = queryClient.getQueryData<Drink[]>(queryKeys.drinks) ?? [];
    const existing = findConflict(list, a.name);
    if (existing) a.setConflict(existing);
    else a.setError(s.duplicateDrink);
  }

  async function onSave() {
    const { state, group, effectiveType, userId, context, drink, subtype } = a;
    if (!state?.canSave || !group || !effectiveType || !userId || !context)
      return;
    const needsSubtype =
      !drink && !createdRef.current[context] && effectiveType === "other";
    if (needsSubtype && !hasSubtype(subtype.value)) {
      subtype.setRequired(true);
      return;
    }
    a.setSaving(true);
    a.setError(null);
    a.setConflict(null);
    try {
      let targetId = drink?.id ?? createdRef.current[context];
      if (!targetId) {
        let subtypeId: string | null = null;
        if (effectiveType === "other") {
          const ensured = await ensureSubtype(subtype.value);
          if ("duplicateOf" in ensured) {
            subtype.setValue({
              subtypeId: ensured.duplicateOf.id,
              newName: null,
            });
            subtype.setNotice(
              subtypeStrings.duplicate(ensured.duplicateOf.name),
            );
            a.setSaving(false);
            return;
          }
          subtypeId = ensured.id;
          // Keep the saved id so a retry after a failed drink insert does not re-create the subtype.
          subtype.setValue({ subtypeId, newName: null });
        }
        const created = await createDrink({
          name: a.name.trim(),
          type: effectiveType,
          subtypeId,
        });
        if ("duplicate" in created) {
          await resolveConflict();
          a.setSaving(false);
          return;
        }
        targetId = created.id;
        createdRef.current[context] = targetId;
      }
      const row = toReviewRow(group, a.draft, state);
      if (a.myReview) {
        const updated = await updateReview(a.myReview.id, row);
        // RLS or a delete on another device turns the update into a silent no-op. Refetch so a retry inserts.
        if (!updated) {
          await queryClient.invalidateQueries({ queryKey: queryKeys.reviews });
          throw new Error("review_not_updated");
        }
      } else {
        await insertReview(targetId, row);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.drinks }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reviews }),
      ]);
      await clearDrafts(userId, context);
      navigate(`/drink/${targetId}`);
    } catch {
      a.setError(s.saveFailed);
      a.setSaving(false);
    }
  }

  return onSave;
}
