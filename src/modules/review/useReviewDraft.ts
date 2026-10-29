import { useEffect, useRef, useState } from "react";
import {
  emptyDraft,
  emptyStage,
  type ReviewDraft,
} from "#shared/lib/review.js";
import type { SubtypeValue } from "#modules/subtypes/index.js";
import type { DrinkGroup, DrinkType, Review } from "#contract/domain.js";
import {
  STAGES,
  clearDrafts,
  hasInput,
  isNewDrinkContext,
  loadStageDraft,
  persistDrafts,
  type StageName,
} from "./drafts.js";
import { pruneToGroup, stageFromReview } from "./reviewForm.js";

const DEBOUNCE_MS = 500;

interface Args {
  ready: boolean;
  userId: string | undefined;
  context: string | null;
  myReview: Review | undefined;
  saving: boolean;
  draftName: string;
  effectiveType: DrinkType | null;
  subtype: SubtypeValue;
}

/**
 * Draft state plus its persistence: hydration from storage or the saved review, debounced writes
 * and a flush on unmount. The effects live together so their ordering and shared refs stay intact.
 */
export function useReviewDraft({
  ready,
  userId,
  context,
  myReview,
  saving,
  draftName,
  effectiveType,
  subtype,
}: Args) {
  const [stage, setStage] = useState<StageName>("first");
  const [draft, setDraft] = useState<ReviewDraft>(emptyDraft);
  const [dirty, setDirty] = useState(false);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  const myReviewRef = useRef<Review | undefined>(undefined);
  const prevContextRef = useRef<string | null>(null);
  const stageInitRef = useRef(false);

  useEffect(() => {
    myReviewRef.current = myReview;
  }, [myReview]);

  // Hydrate: stored drafts beat the saved review; input already in memory beats both (never lose typing).
  useEffect(() => {
    if (!ready || !userId || !context) return;
    let cancelled = false;
    void (async () => {
      const [f, fi] = await Promise.all(
        STAGES.map((st) => loadStageDraft(userId, context, st)),
      );
      if (cancelled) return;
      const rv = myReviewRef.current;
      setDraft((prev) => ({
        first: hasInput(prev.first)
          ? prev.first
          : (f ?? stageFromReview(rv, "first") ?? emptyStage()),
        final: hasInput(prev.final)
          ? prev.final
          : (fi ?? stageFromReview(rv, "final") ?? emptyStage()),
      }));
      if (!stageInitRef.current && rv?.first_scores && !rv.final_note)
        setStage("final");
      stageInitRef.current = true;
      const prevCtx = prevContextRef.current;
      if (prevCtx && prevCtx !== context && isNewDrinkContext(prevCtx))
        void clearDrafts(userId, prevCtx);
      prevContextRef.current = context;
      setHydratedKey(context);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, userId, context]);

  const writeOk =
    dirty && !saving && hydratedKey !== null && hydratedKey === context;

  // Debounced draft persistence.
  useEffect(() => {
    if (!writeOk || !userId || !context) return;
    const t = setTimeout(() => {
      void persistDrafts(userId, context, draft, {
        name: draftName,
        type: effectiveType,
        subtype,
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [writeOk, userId, context, draft, draftName, effectiveType, subtype]);

  // Flush a pending write when leaving the page.
  const latest = useRef({
    writeOk,
    userId,
    context,
    draft,
    draftName,
    effectiveType,
    subtype,
  });
  useEffect(() => {
    latest.current = {
      writeOk,
      userId,
      context,
      draft,
      draftName,
      effectiveType,
      subtype,
    };
  });
  useEffect(
    () => () => {
      const l = latest.current;
      if (l.writeOk && l.userId && l.context) {
        void persistDrafts(l.userId, l.context, l.draft, {
          name: l.draftName,
          type: l.effectiveType,
          subtype: l.subtype,
        });
      }
    },
    [],
  );

  /** User edit: updates the draft and marks it dirty so it gets persisted. */
  function edit(fn: (prev: ReviewDraft) => ReviewDraft) {
    setDraft(fn);
    setDirty(true);
  }

  /** Drops scores that do not exist in the new group (not an edit, so not dirty). */
  function pruneTo(group: DrinkGroup) {
    setDraft((prev) => pruneToGroup(group, prev));
  }

  /** Back to a blank form (drink changed): clears draft, dirty, hydration and stage. */
  function reset() {
    setDraft(emptyDraft());
    setDirty(false);
    setHydratedKey(null);
    setStage("first");
    prevContextRef.current = null;
    stageInitRef.current = false;
  }

  return { draft, stage, setStage, edit, pruneTo, reset };
}
