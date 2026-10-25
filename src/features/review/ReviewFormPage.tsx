import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../app/session';
import { CRITERIA, criteriaFor, groupOf } from '../../config/criteria';
import { queryKeys, useDrinks, useReviews } from '../../data/queries';
import { normalizeNick } from '../../lib/nick';
import {
  FINAL_NOTE_MIN,
  emptyDraft,
  emptyStage,
  evaluateReview,
  toReviewRow,
  type ReviewDraft,
  type StageDraft,
} from '../../lib/review';
import { computeTotal } from '../../lib/score';
import { supabase } from '../../lib/supabase';
import { reviewErrors, strings, subtypeStrings, typeLabels } from '../../strings';
import { drinkTypeLabel } from '../../lib/subtype';
import { SubtypePicker } from '../subtypes/SubtypePicker';
import { EMPTY_SUBTYPE, hasSubtype, useEnsureSubtype, type SubtypeValue } from '../subtypes/useEnsureSubtype';
import { useSubtypesById } from '../subtypes/useSubtypesById';
import { DRINK_TYPES, type Drink, type DrinkGroup, type DrinkType, type Review } from '../../types/domain';
import {
  STAGES,
  clearDrafts,
  draftContext,
  fold,
  hasInput,
  loadDraftMeta,
  loadStageDraft,
  saveDraftMeta,
  saveStageDraft,
  type StageName,
} from './drafts';
import { ScoreRow } from './ScoreRow';
import { reviewStrings as s } from './strings';

const inputCls =
  'min-h-11 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-base text-neutral-100 placeholder:text-neutral-500 focus:border-amber-400 focus:outline-none';
const stageLabel: Record<StageName, string> = { first: strings.stage.first, final: strings.stage.final };
const NEW_KEY_RE = new RegExp(`\\+(${DRINK_TYPES.join('|')})$`);
const DEBOUNCE_MS = 500;

function stageFromReview(review: Review | undefined, stage: StageName): StageDraft | null {
  if (!review) return null;
  const d: StageDraft =
    stage === 'first'
      ? { scores: { ...(review.first_scores ?? {}) }, note: review.first_note ?? '' }
      : { scores: { ...(review.final_scores ?? {}) }, note: review.final_note ?? '' };
  return hasInput(d) ? d : null;
}

/** Persists both stages plus the per-context meta (so the draft is listed and resumable). Never throws. */
async function persistDrafts(
  userId: string,
  context: string,
  draft: ReviewDraft,
  meta: { name: string; type: DrinkType | null; subtype: SubtypeValue },
): Promise<void> {
  await Promise.all(STAGES.map((st) => saveStageDraft(userId, context, st, draft[st])));
  if (STAGES.some((st) => hasInput(draft[st]))) await saveDraftMeta(userId, context, { ...meta, updatedAt: Date.now() });
  else await clearDrafts(userId, context);
}

/** Drops scores whose criterion does not exist in the group (criteria differ between wine and gin). */
function pruneToGroup(group: DrinkGroup, draft: ReviewDraft): ReviewDraft {
  const allowed = new Set(CRITERIA[group].map((c) => c.key));
  const prune = (d: StageDraft): StageDraft => ({
    ...d,
    scores: Object.fromEntries(Object.entries(d.scores).filter(([k]) => allowed.has(k))),
  });
  return { first: prune(draft.first), final: prune(draft.final) };
}

export default function ReviewFormPage() {
  const { drinkId } = useParams();
  const [searchParams] = useSearchParams();
  const draftParam = searchParams.get('draft');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useSession();
  const userId = profile?.id;
  const drinksQ = useDrinks();
  const reviewsQ = useReviews();
  const drinks = drinksQ.data;
  const ready = drinksQ.isSuccess && reviewsQ.isSuccess;

  const [name, setName] = useState('');
  const [picked, setPicked] = useState<Drink | null>(null);
  const [type, setType] = useState<DrinkType | null>(null);
  const [stage, setStage] = useState<StageName>('first');
  const [draft, setDraft] = useState<ReviewDraft>(emptyDraft);
  const [dirty, setDirty] = useState(false);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Drink | null>(null);
  const [subtype, setSubtype] = useState<SubtypeValue>(EMPTY_SUBTYPE);
  const [subtypeRequired, setSubtypeRequired] = useState(false);
  const [subtypeNotice, setSubtypeNotice] = useState<string | null>(null);
  const subtypesById = useSubtypesById();
  const ensureSubtype = useEnsureSubtype();

  const routeDrink = drinkId ? drinks?.find((d) => d.id === drinkId) : undefined;
  const drink = routeDrink ?? picked;
  const effectiveType = drink?.type ?? type;
  const group = effectiveType ? groupOf(effectiveType) : null;
  const context = draftContext(drink?.id ?? null, name, effectiveType);

  const myReview = useMemo(
    () => (drink && userId ? reviewsQ.data?.find((r) => r.drink_id === drink.id && r.author_id === userId) : undefined),
    [drink, userId, reviewsQ.data],
  );

  const state = useMemo(() => (group ? evaluateReview(group, draft) : null), [group, draft]);

  const createdRef = useRef<Record<string, string>>({});
  const myReviewRef = useRef<Review | undefined>(undefined);
  const prevContextRef = useRef<string | null>(null);
  const stageInitRef = useRef(false);
  const prefilledRef = useRef(false);

  useEffect(() => {
    myReviewRef.current = myReview;
  }, [myReview]);

  // Resume an unsaved new-drink draft from /add?draft=<context>: prefill name/type/subtype, then normal hydration restores the stages.
  useEffect(() => {
    if (!userId || !draftParam || drinkId || drink || prefilledRef.current) return;
    prefilledRef.current = true;
    void (async () => {
      const meta = await loadDraftMeta(userId, draftParam);
      let nextName: string;
      let nextType: DrinkType | null;
      let nextSubtype: SubtypeValue = EMPTY_SUBTYPE;
      if (meta) {
        nextName = meta.name;
        nextType = meta.type;
        nextSubtype = meta.subtype;
      } else {
        const idx = draftParam.lastIndexOf('+');
        const t = idx >= 0 ? draftParam.slice(idx + 1) : '';
        nextName = idx >= 0 ? draftParam.slice(0, idx) : draftParam;
        nextType = (DRINK_TYPES as readonly string[]).includes(t) ? (t as DrinkType) : null;
      }
      setName((prev) => prev || nextName);
      setType((prev) => prev ?? nextType);
      if (nextType === 'other') setSubtype((prev) => (hasSubtype(prev) ? prev : nextSubtype));
    })();
  }, [userId, draftParam, drinkId, drink]);

  // Hydrate: stored drafts beat the saved review; input already in memory beats both (never lose typing).
  useEffect(() => {
    if (!ready || !userId || !context) return;
    let cancelled = false;
    void (async () => {
      const [f, fi] = await Promise.all(STAGES.map((st) => loadStageDraft(userId, context, st)));
      if (cancelled) return;
      const rv = myReviewRef.current;
      setDraft((prev) => ({
        first: hasInput(prev.first) ? prev.first : (f ?? stageFromReview(rv, 'first') ?? emptyStage()),
        final: hasInput(prev.final) ? prev.final : (fi ?? stageFromReview(rv, 'final') ?? emptyStage()),
      }));
      if (!stageInitRef.current && rv?.first_scores && !rv.final_note) setStage('final');
      stageInitRef.current = true;
      const prevCtx = prevContextRef.current;
      if (prevCtx && prevCtx !== context && NEW_KEY_RE.test(prevCtx)) void clearDrafts(userId, prevCtx);
      prevContextRef.current = context;
      setHydratedKey(context);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, userId, context]);

  const writeOk = dirty && !saving && hydratedKey !== null && hydratedKey === context;

  const draftName = (drink?.name ?? name).trim();

  // Debounced draft persistence.
  useEffect(() => {
    if (!writeOk || !userId || !context) return;
    const t = setTimeout(() => {
      void persistDrafts(userId, context, draft, { name: draftName, type: effectiveType, subtype });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [writeOk, userId, context, draft, draftName, effectiveType, subtype]);

  // Flush a pending write when leaving the page.
  const latest = useRef({ writeOk, userId, context, draft, draftName, effectiveType, subtype });
  useEffect(() => {
    latest.current = { writeOk, userId, context, draft, draftName, effectiveType, subtype };
  });
  useEffect(
    () => () => {
      const l = latest.current;
      if (l.writeOk && l.userId && l.context) {
        void persistDrafts(l.userId, l.context, l.draft, { name: l.draftName, type: l.effectiveType, subtype: l.subtype });
      }
    },
    [],
  );

  function edit(fn: (prev: ReviewDraft) => ReviewDraft) {
    setDraft(fn);
    setDirty(true);
    setError(null);
  }

  function setScore(st: StageName, key: string, v: number | undefined) {
    edit((prev) => {
      const scores = { ...prev[st].scores };
      if (v === undefined) delete scores[key];
      else scores[key] = v;
      return { ...prev, [st]: { ...prev[st], scores } };
    });
  }

  function setNote(st: StageName, note: string) {
    edit((prev) => ({ ...prev, [st]: { ...prev[st], note } }));
  }

  function changeSubtype(next: SubtypeValue) {
    setSubtype(next);
    setSubtypeRequired(false);
    setSubtypeNotice(null);
  }

  function chooseType(t: DrinkType) {
    setType(t);
    setConflict(null);
    if (t !== 'other') changeSubtype(EMPTY_SUBTYPE);
    setDraft((prev) => pruneToGroup(groupOf(t), prev));
  }

  function pickDrink(d: Drink) {
    setPicked(d);
    setName(d.name);
    setType(d.type);
    changeSubtype(EMPTY_SUBTYPE);
    setConflict(null);
    setError(null);
    setDraft((prev) => pruneToGroup(groupOf(d.type), prev));
  }

  function changeDrink() {
    setPicked(null);
    setName('');
    setType(null);
    changeSubtype(EMPTY_SUBTYPE);
    setConflict(null);
    setError(null);
    setDraft(emptyDraft());
    setDirty(false);
    setHydratedKey(null);
    setStage('first');
    prevContextRef.current = null;
    if (drinkId) navigate('/add');
  }

  const q = fold(name);
  const suggestions = useMemo(() => {
    if (drink || !q || !drinks) return [];
    return drinks.filter((d) => fold(d.name).includes(q)).slice(0, 6);
  }, [drink, q, drinks]);
  const exactMatch = !drink && name.trim() ? drinks?.find((d) => normalizeNick(d.name.trim()) === normalizeNick(name.trim())) : undefined;

  async function resolveConflict() {
    await queryClient.refetchQueries({ queryKey: queryKeys.drinks });
    const list = queryClient.getQueryData<Drink[]>(queryKeys.drinks) ?? [];
    const target = normalizeNick(name.trim());
    const existing = list.find((d) => normalizeNick(d.name.trim()) === target) ?? list.find((d) => fold(d.name) === fold(name));
    if (existing) setConflict(existing);
    else setError(s.duplicateDrink);
  }

  async function onSave() {
    if (!state?.canSave || !group || !effectiveType || !userId || !context) return;
    const needsSubtype = !drink && !createdRef.current[context] && effectiveType === 'other';
    if (needsSubtype && !hasSubtype(subtype)) {
      setSubtypeRequired(true);
      return;
    }
    setSaving(true);
    setError(null);
    setConflict(null);
    try {
      let targetId = drink?.id ?? createdRef.current[context];
      if (!targetId) {
        let subtypeId: string | null = null;
        if (effectiveType === 'other') {
          const ensured = await ensureSubtype(subtype);
          if ('duplicateOf' in ensured) {
            setSubtype({ subtypeId: ensured.duplicateOf.id, newName: null });
            setSubtypeNotice(subtypeStrings.duplicate(ensured.duplicateOf.name));
            setSaving(false);
            return;
          }
          subtypeId = ensured.id;
          // Keep the saved id so a retry after a failed drink insert does not re-create the subtype.
          setSubtype({ subtypeId, newName: null });
        }
        const { data, error: dErr } = await supabase
          .from('drinks')
          .insert({ name: name.trim(), type: effectiveType, subtype_id: subtypeId })
          .select('id')
          .single();
        if (dErr) {
          if ((dErr as { code?: string }).code === '23505') {
            await resolveConflict();
            setSaving(false);
            return;
          }
          throw dErr;
        }
        targetId = (data as { id: string }).id;
        createdRef.current[context] = targetId;
      }
      const row = toReviewRow(group, draft, state);
      const { error: rErr } = myReview
        ? await supabase.from('reviews').update(row).eq('id', myReview.id)
        : await supabase.from('reviews').insert({ drink_id: targetId, ...row });
      if (rErr) throw rErr;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.drinks }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reviews }),
      ]);
      await clearDrafts(userId, context);
      navigate(`/drink/${targetId}`);
    } catch {
      setError(s.saveFailed);
      setSaving(false);
    }
  }

  if (drinksQ.isLoading || reviewsQ.isLoading) return <p className="py-4 text-neutral-400">{strings.common.loading}</p>;
  if (drinksQ.isError || reviewsQ.isError) return <p className="py-4 text-red-400">{strings.common.error}</p>;
  if (drinkId && !routeDrink && !picked) {
    return (
      <div className="flex flex-col gap-3 py-4">
        <p className="text-neutral-200">{s.drinkNotFound}</p>
        <Link to="/add" className="inline-flex min-h-11 items-center text-amber-400">
          {s.toAdd}
        </Link>
      </div>
    );
  }

  const otherStage: StageName = stage === 'first' ? 'final' : 'first';
  const stageState = state?.[stage];
  const total = group ? computeTotal(group, draft[stage].scores) : null;
  const noteLen = draft[stage].note.trim().length;
  const canSubmit =
    Boolean(state?.canSave) && !saving && !exactMatch && Boolean(effectiveType) && (Boolean(drink) || name.trim().length > 0);

  return (
    <div className="flex flex-col gap-5 py-2">
      <h1 className="text-xl font-semibold">{myReview ? s.editTitle : s.addTitle}</h1>

      <section className="flex flex-col gap-2">
        <label htmlFor="drink-name" className="text-sm text-neutral-400">
          {s.name}
        </label>
        {drink ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-700 bg-neutral-900 p-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-neutral-100">{drink.name}</p>
              <p className="text-xs text-neutral-500">{s.pickedHint}</p>
            </div>
            <button
              type="button"
              onClick={changeDrink}
              className="min-h-11 shrink-0 rounded-lg border border-neutral-700 px-3 text-sm text-neutral-200"
            >
              {s.changeDrink}
            </button>
          </div>
        ) : (
          <>
            <input
              id="drink-name"
              className={inputCls}
              placeholder={s.namePlaceholder}
              value={name}
              autoComplete="off"
              onChange={(e) => {
                setName(e.target.value);
                setConflict(null);
                setError(null);
              }}
            />
            {suggestions.length > 0 && (
              <ul className="flex flex-col overflow-hidden rounded-lg border border-neutral-800" aria-label={s.suggestions}>
                {suggestions.map((d) => (
                  <li key={d.id} className="border-b border-neutral-800 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => pickDrink(d)}
                      className="flex min-h-11 w-full items-center justify-between gap-3 bg-neutral-900 px-3 text-left text-neutral-100"
                    >
                      <span className="truncate">{d.name}</span>
                      <span className="shrink-0 text-xs text-neutral-500">{drinkTypeLabel(d, subtypesById)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {exactMatch ? (
              <p className="text-sm text-amber-400">{s.existsHint}</p>
            ) : (
              name.trim() && <p className="text-xs text-neutral-500">{s.newDrink}</p>
            )}
          </>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-sm text-neutral-400">{s.type}</p>
        {drink ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-11 items-center rounded-full border border-amber-400 bg-amber-400 px-4 text-sm font-medium text-neutral-950">
              {drinkTypeLabel(drink, subtypesById)}
            </span>
            <span className="text-xs text-neutral-500">{s.typeLocked}</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2" role="group" aria-label={s.type}>
            {DRINK_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={type === t}
                onClick={() => chooseType(t)}
                className={`min-h-11 rounded-full border px-4 text-sm font-medium ${
                  type === t
                    ? 'border-amber-400 bg-amber-400 text-neutral-950'
                    : 'border-neutral-700 bg-neutral-900 text-neutral-200'
                }`}
              >
                {typeLabels[t]}
              </button>
            ))}
          </div>
        )}
        {!drink && type === 'other' && (
          <SubtypePicker value={subtype} onChange={changeSubtype} showRequired={subtypeRequired} notice={subtypeNotice} />
        )}
        {conflict && (
          <div className="flex flex-col gap-2 rounded-lg border border-amber-400/60 bg-neutral-900 p-3">
            <p className="text-sm text-neutral-100">{s.conflictOffer(conflict.name)}</p>
            <button
              type="button"
              onClick={() => pickDrink(conflict)}
              className="min-h-11 rounded-lg bg-amber-400 px-4 font-semibold text-neutral-950"
            >
              {s.conflictUse}
            </button>
          </div>
        )}
      </section>

      {!effectiveType || !group || !state ? (
        <p className="text-sm text-neutral-500">{s.chooseTypeFirst}</p>
      ) : (
        <>
          <div role="tablist" className="grid grid-cols-2 gap-1 rounded-lg bg-neutral-900 p-1">
            {STAGES.map((st) => {
              const active = st === stage;
              const status = state[st].status;
              return (
                <button
                  key={st}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStage(st)}
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-md text-sm font-medium ${
                    active ? 'bg-neutral-800 text-amber-400' : 'text-neutral-400'
                  }`}
                >
                  {stageLabel[st]}
                  {status === 'valid' && <span className="size-2 rounded-full bg-emerald-400" aria-hidden />}
                  {status === 'invalid' && <span className="size-2 rounded-full bg-red-400" aria-hidden />}
                </button>
              );
            })}
          </div>

          <section className="flex flex-col gap-5" role="tabpanel">
            {criteriaFor(effectiveType).map((c) => (
              <ScoreRow key={c.key} criterion={c} value={draft[stage].scores[c.key]} onChange={(v) => setScore(stage, c.key, v)} />
            ))}
            <p className="text-xs text-neutral-500">{s.clearHint}</p>

            {total !== null && (
              <p className="text-lg">
                <span className="text-neutral-400">{s.total}: </span>
                <span className="font-semibold text-amber-400">{total.toFixed(1)}</span>
              </p>
            )}

            <div className="flex flex-col gap-1">
              <label htmlFor="stage-note" className="text-sm text-neutral-400">
                {stage === 'first' ? s.noteFirst : s.noteFinal}
              </label>
              <textarea
                id="stage-note"
                rows={4}
                className={`${inputCls} py-2`}
                placeholder={stage === 'first' ? s.notePlaceholderFirst : s.notePlaceholderFinal}
                value={draft[stage].note}
                onChange={(e) => setNote(stage, e.target.value)}
              />
              {stage === 'final' && (
                <p className={`text-right text-xs ${noteLen >= FINAL_NOTE_MIN ? 'text-emerald-400' : 'text-neutral-500'}`}>
                  {s.noteCount(noteLen, FINAL_NOTE_MIN)}
                </p>
              )}
            </div>

            {stageState && stageState.errors.length > 0 && (
              <ul className="flex flex-col gap-1 text-sm text-red-400">
                {stageState.errors.map((code) => (
                  <li key={code}>{reviewErrors[code]}</li>
                ))}
              </ul>
            )}
          </section>

          {state[otherStage].status === 'invalid' && (
            <button type="button" onClick={() => setStage(otherStage)} className="min-h-11 text-left text-sm text-red-400 underline">
              {s.otherStageInvalid(stageLabel[otherStage])}
            </button>
          )}
        </>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] -mx-4 border-t border-neutral-800 bg-neutral-950/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={!canSubmit}
          className="min-h-12 w-full rounded-lg bg-amber-400 px-4 font-semibold text-neutral-950 disabled:opacity-40"
        >
          {saving ? s.saving : strings.common.save}
        </button>
      </div>
    </div>
  );
}
