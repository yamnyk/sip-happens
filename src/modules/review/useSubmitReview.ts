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
import {
  createDrink,
  insertReview,
  updateDrink,
  updateReview,
} from "./queries.js";
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
  // The drink this form already created. It stays bound across name/type edits so a retry
  // updates it instead of creating a second one and orphaning the first.
  const createdRef = useRef<{
    id: string;
    name: string;
    type: DrinkType;
  } | null>(null);

  function forgetCreated() {
    createdRef.current = null;
  }

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
    const created = createdRef.current;
    const name = a.name.trim();
    const needsDrinkWrite =
      !drink &&
      (!created || created.name !== name || created.type !== effectiveType);
    const needsSubtype =
      needsDrinkWrite && effectiveType === "other" && !created;
    if (needsSubtype && !hasSubtype(subtype.value)) {
      subtype.setRequired(true);
      return;
    }
    a.setSaving(true);
    a.setError(null);
    a.setConflict(null);
    try {
      let targetId = drink?.id ?? created?.id;
      if (needsDrinkWrite) {
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
        const input = { name, type: effectiveType, subtypeId };
        const written = created
          ? await updateDrink(created.id, input)
          : await createDrink(input);
        if ("duplicate" in written) {
          await resolveConflict();
          a.setSaving(false);
          return;
        }
        targetId = written.id;
        createdRef.current = { id: targetId, name, type: effectiveType };
      }
      if (!targetId) return;
      const row = toReviewRow(group, a.draft, state);
      if (a.myReview) {
        const updated = await updateReview(a.myReview.id, row);
        // RLS or a delete on another device turns the update into a silent no-op. Refetch so a retry inserts.
        if (!updated) {
          await queryClient.invalidateQueries({ queryKey: queryKeys.reviews });
          throw new Error("review_not_updated");
        }
      } else {
        const inserted = await insertReview(targetId, row);
        if (inserted) {
          // A review already exists on the server (stale cache): update it instead.
          await queryClient.refetchQueries({ queryKey: queryKeys.reviews });
          const existing = queryClient
            .getQueryData<Review[]>(queryKeys.reviews)
            ?.find((r) => r.drink_id === targetId && r.author_id === userId);
          if (!existing || !(await updateReview(existing.id, row)))
            throw new Error("review_not_updated");
        }
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

  return { onSave, forgetCreated };
}
