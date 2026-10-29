import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../app/session';
import { groupOf } from '../../config/criteria';
import { queryKeys, useDrinks, useReviews } from '../../data/queries';
import { authorScore } from '../../lib/score';
import { supabase } from '../../lib/supabase';
import { drinkTypeLabel } from '../../lib/subtype';
import { strings, typeLabels } from '../../strings';
import { useSubtypesById } from '../subtypes/useSubtypesById';
import { clearDrafts, listDrafts, type DraftEntry, type StageName } from './drafts';
import { reviewStrings } from './strings';

const s = reviewStrings.mine;
const stageLabel: Record<StageName, string> = { first: strings.stage.first, final: strings.stage.final };

export default function MyReviewsPage() {
  const { profile } = useSession();
  const queryClient = useQueryClient();
  const drinksQ = useDrinks();
  const reviewsQ = useReviews();
  const subtypesById = useSubtypesById();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const userId = profile?.id;
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [confirmDraft, setConfirmDraft] = useState<string | null>(null);

  const refreshDrafts = useCallback(async () => {
    if (!userId) return [];
    return listDrafts(userId);
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    void refreshDrafts().then((list) => {
      if (!cancelled) setDrafts(list);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshDrafts]);

  async function deleteDraft(context: string) {
    if (!userId) return;
    await clearDrafts(userId, context);
    setConfirmDraft(null);
    setDrafts(await refreshDrafts());
  }

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('reviews').delete().eq('id', id).select('id');
      if (error) throw error;
      // RLS denies silently (0 rows), e.g. after a ban.
      if (!data?.length) throw new Error('review_not_deleted');
    },
    onSuccess: async () => {
      setConfirmId(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.reviews });
    },
  });

  const items = useMemo(() => {
    if (!profile || !drinksQ.data || !reviewsQ.data) return [];
    return reviewsQ.data
      .filter((r) => r.author_id === profile.id)
      .flatMap((r) => {
        const drink = drinksQ.data.find((d) => d.id === r.drink_id);
        return drink ? [{ review: r, drink }] : [];
      });
  }, [profile, drinksQ.data, reviewsQ.data]);

  if (drinksQ.isLoading || reviewsQ.isLoading) return <p className="py-4 text-neutral-400">{strings.common.loading}</p>;
  if (drinksQ.isError || reviewsQ.isError) return <p className="py-4 text-red-400">{s.loadFailed}</p>;

  return (
    <div className="flex flex-col gap-4 py-2">
      <h1 className="text-xl font-semibold">{s.title}</h1>
      {items.length === 0 && drafts.length === 0 && <p className="text-neutral-500">{s.empty}</p>}
      {drafts.length > 0 && (
        <section className="flex flex-col gap-3" aria-label={s.draftsTitle}>
          <h2 className="text-sm font-medium text-neutral-400">{s.draftsTitle}</h2>
          <ul className="flex flex-col gap-3">
            {drafts.map((entry) => {
              const drink = drinksQ.data?.find((d) => d.id === entry.context);
              const isNew = entry.context.includes('+');
              const gone = !drink && !isNew;
              const meta = entry.meta;
              const title = drink?.name ?? (gone ? s.draftUnnamed : meta?.name || s.draftUnnamed);
              const typeText = drink
                ? drinkTypeLabel(drink, subtypesById)
                : meta?.type
                  ? meta.type === 'other' && meta.subtype.subtypeId
                    ? (subtypesById.get(meta.subtype.subtypeId)?.name ?? typeLabels.other)
                    : meta.type === 'other' && meta.subtype.newName
                      ? s.draftNewSubtype(meta.subtype.newName)
                      : typeLabels[meta.type]
                  : null;
              const confirming = confirmDraft === entry.context;
              return (
                <li key={entry.context} className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-100">{title}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {typeText && (
                        <span className="inline-block rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-300">
                          {typeText}
                        </span>
                      )}
                      {gone && (
                        <span className="inline-block rounded-full border border-red-400/60 px-2 py-0.5 text-xs text-red-400">
                          {s.draftDrinkGone}
                        </span>
                      )}
                      {entry.stages.map((st) => (
                        <span key={st} className="inline-block rounded-full bg-amber-400/15 px-2 py-0.5 text-xs text-amber-400">
                          {stageLabel[st]}
                        </span>
                      ))}
                    </div>
                  </div>
                  {confirming ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-neutral-200">{s.draftConfirmDelete}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => void deleteDraft(entry.context)}
                          className="min-h-11 rounded-lg bg-red-500 px-3 font-medium text-white"
                        >
                          {s.yes}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDraft(null)}
                          className="min-h-11 rounded-lg border border-neutral-700 px-3 text-neutral-200"
                        >
                          {s.no}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={gone ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-[1fr_auto] gap-2'}>
                      {!gone && (
                        <Link
                          to={drink ? `/add/${drink.id}` : `/add?draft=${encodeURIComponent(entry.context)}`}
                          className="flex min-h-11 items-center justify-center rounded-lg border border-amber-400 px-3 text-sm text-amber-400"
                        >
                          {s.draftContinue}
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => setConfirmDraft(entry.context)}
                        className="min-h-11 rounded-lg border border-neutral-700 px-3 text-sm text-neutral-300"
                      >
                        {s.draftDelete}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {drafts.length > 0 && items.length > 0 && <h2 className="text-sm font-medium text-neutral-400">{s.reviewsTitle}</h2>}
      <ul className="flex flex-col gap-3">
        {items.map(({ review, drink }) => {
          const score = authorScore(groupOf(drink.type), review);
          const note = review.final_note || review.first_note || '';
          const confirming = confirmId === review.id;
          return (
            <li key={review.id} className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/drink/${drink.id}`} className="block truncate font-medium text-neutral-100">
                    {drink.name}
                  </Link>
                  <span className="mt-1 inline-block rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-300">
                    {drinkTypeLabel(drink, subtypesById)}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-xl font-semibold ${score === null ? 'text-neutral-500' : 'text-amber-400'}`}>
                    {score === null ? '-' : score.toFixed(1)}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {score === null ? s.noScore : review.final_scores && review.final_note ? s.hasFinal : s.onlyFirst}
                  </p>
                </div>
              </div>
              {note && <p className="line-clamp-2 text-sm text-neutral-400">{note}</p>}
              {confirming ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-neutral-200">{s.confirmDelete}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(review.id)}
                      className="min-h-11 rounded-lg bg-red-500 px-3 font-medium text-white disabled:opacity-50"
                    >
                      {remove.isPending ? s.deleting : s.yes}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="min-h-11 rounded-lg border border-neutral-700 px-3 text-neutral-200"
                    >
                      {s.no}
                    </button>
                  </div>
                  {remove.isError && <p className="text-sm text-red-400">{s.deleteFailed}</p>}
                </div>
              ) : (
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Link
                    to={`/add/${drink.id}`}
                    className="flex min-h-11 items-center justify-center rounded-lg border border-amber-400 px-3 text-sm text-amber-400"
                  >
                    {s.openEdit}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      remove.reset();
                      setConfirmId(review.id);
                    }}
                    className="min-h-11 rounded-lg border border-neutral-700 px-3 text-sm text-neutral-300"
                  >
                    {s.delete}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
