import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useSession } from "#modules/auth/index.js";
import { useSubtypesById } from "#modules/subtypes/index.js";
import { groupOf } from "#shared/config/criteria.js";
import { useDrinks, useReviews } from "#shared/api/queries.js";
import { evaluateReview } from "#shared/lib/review.js";
import { computeTotal } from "#shared/lib/score.js";
import type { Drink } from "#contract/domain.js";
import type { StageName } from "./drafts.js";
import { canSubmit, withNote, withScore } from "./reviewForm.js";
import { useDraftResume } from "./useDraftResume.js";
import { useDrinkPicker } from "./useDrinkPicker.js";
import { useReviewDraft } from "./useReviewDraft.js";
import { useSubmitReview } from "./useSubmitReview.js";

/** All state and actions of the review form page; the page itself only renders. */
export function useReviewForm() {
  const { drinkId } = useParams();
  const [searchParams] = useSearchParams();
  const draftParam = searchParams.get("draft");
  const navigate = useNavigate();
  const { profile } = useSession();
  const userId = profile?.id;
  const drinksQ = useDrinks();
  const reviewsQ = useReviews();
  const ready = drinksQ.isSuccess && reviewsQ.isSuccess;
  const subtypesById = useSubtypesById();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const picker = useDrinkPicker(drinksQ.data, drinkId);
  const { drink, effectiveType, group, context, name } = picker;

  const myReview = useMemo(
    () =>
      drink && userId
        ? reviewsQ.data?.find(
            (r) => r.drink_id === drink.id && r.author_id === userId,
          )
        : undefined,
    [drink, userId, reviewsQ.data],
  );

  useDraftResume({
    userId,
    draftParam,
    drinkId,
    drink,
    apply: picker.applyPrefill,
  });

  const form = useReviewDraft({
    ready,
    userId,
    context,
    myReview,
    saving,
    draftName: (drink?.name ?? name).trim(),
    effectiveType,
    subtype: picker.subtype.value,
  });
  const { draft, stage } = form;

  const state = useMemo(
    () => (group ? evaluateReview(group, draft) : null),
    [group, draft],
  );

  const { onSave, forgetCreated } = useSubmitReview({
    userId,
    context,
    name,
    drink,
    group,
    effectiveType,
    state,
    draft,
    myReview,
    subtype: picker.subtype,
    setSaving,
    setError,
    setConflict: picker.setConflict,
  });

  function changeName(next: string) {
    picker.changeName(next);
    setError(null);
  }

  function chooseType(t: Parameters<typeof picker.chooseType>[0]) {
    picker.chooseType(t);
    form.pruneTo(groupOf(t));
  }

  function pickDrink(d: Drink) {
    picker.pick(d);
    forgetCreated();
    setError(null);
    form.pruneTo(groupOf(d.type));
  }

  function changeDrink() {
    picker.clear();
    forgetCreated();
    setError(null);
    form.reset();
    if (drinkId) navigate("/add");
  }

  function setScore(st: StageName, key: string, v: number | undefined) {
    form.edit((prev) => withScore(prev, st, key, v));
    setError(null);
  }

  function setNote(st: StageName, note: string) {
    form.edit((prev) => withNote(prev, st, note));
    setError(null);
  }

  return {
    isLoading: drinksQ.isLoading || reviewsQ.isLoading,
    isError: drinksQ.isError || reviewsQ.isError,
    notFound: Boolean(drinkId && !picker.routeDrink && !picker.picked),
    picker,
    subtypesById,
    myReview,
    state,
    stage: form.stage,
    setStage: form.setStage,
    draft,
    total: group ? computeTotal(group, draft[stage].scores) : null,
    saving,
    error,
    canSubmit: canSubmit({
      canSave: Boolean(state?.canSave),
      saving,
      exactMatch: picker.exactMatch,
      effectiveType,
      hasDrink: Boolean(drink),
      name,
    }),
    changeName,
    chooseType,
    pickDrink,
    changeDrink,
    setScore,
    setNote,
    onSave,
  };
}
