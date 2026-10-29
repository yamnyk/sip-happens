import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { criteriaFor, groupOf } from '../../config/criteria';
import { authorScore, drinkStats } from '../../lib/score';
import { supabase } from '../../lib/supabase';
import { queryKeys, useDrinks, useProfiles, useReviews } from '../../data/queries';
import { useSession } from '../../app/session';
import { drinkTypeLabel } from '../../lib/subtype';
import { strings, subtypeStrings, typeLabels } from '../../strings';
import { SubtypePicker } from '../subtypes/SubtypePicker';
import { EMPTY_SUBTYPE, hasSubtype, useEnsureSubtype, type SubtypeValue } from '../subtypes/useEnsureSubtype';
import { useSubtypesById } from '../subtypes/useSubtypesById';
import { DRINK_TYPES, type Drink, type DrinkType, type Scores } from '../../types/domain';
import { browseStrings as t } from './strings';
import { ScoreBadge } from './ScoreBadge';

function StageBlock({
  label,
  type,
  scores,
  note,
}: {
  label: string;
  type: DrinkType;
  scores: Scores | null;
  note: string | null;
}) {
  if (!scores && !note) return null;
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-neutral-950/60 p-3">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      {scores && (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {criteriaFor(type).map((c) => (
            <li key={c.key} className="flex items-baseline justify-between gap-2">
              <span className="text-neutral-400">{c.label}</span>
              <span className="font-medium tabular-nums">{scores[c.key] ?? '-'}</span>
            </li>
          ))}
        </ul>
      )}
      {note && <p className="whitespace-pre-wrap text-sm text-neutral-200">{note}</p>}
    </div>
  );
}

function EditForm({ drink, hasReviews, onDone }: { drink: Drink; hasReviews: boolean; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(drink.name);
  const [type, setType] = useState<DrinkType>(drink.type);
  const [error, setError] = useState<string | null>(null);
  const [subtype, setSubtype] = useState<SubtypeValue>({ subtypeId: drink.subtype_id, newName: null });
  const [subtypeRequired, setSubtypeRequired] = useState(false);
  const [subtypeNotice, setSubtypeNotice] = useState<string | null>(null);
  const ensureSubtype = useEnsureSubtype();

  const allowed = DRINK_TYPES.filter((ty) => !hasReviews || groupOf(ty) === groupOf(drink.type));

  function changeSubtype(next: SubtypeValue) {
    setSubtype(next);
    setSubtypeRequired(false);
    setSubtypeNotice(null);
  }

  const save = useMutation({
    mutationFn: async (): Promise<boolean> => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error(t.drink.nameRequired);
      let subtypeId: string | null = null;
      if (type === 'other') {
        if (!hasSubtype(subtype)) {
          setSubtypeRequired(true);
          return false;
        }
        const ensured = await ensureSubtype(subtype);
        if ('duplicateOf' in ensured) {
          setSubtype({ subtypeId: ensured.duplicateOf.id, newName: null });
          setSubtypeNotice(subtypeStrings.duplicate(ensured.duplicateOf.name));
          return false;
        }
        subtypeId = ensured.id;
        setSubtype({ subtypeId, newName: null });
      }
      const { data, error: err } = await supabase
        .from('drinks')
        .update({ name: trimmed, type, subtype_id: subtypeId })
        .eq('id', drink.id)
        .select('id');
      if (err) throw err;
      // RLS denies silently (0 rows) once someone else has reviewed the drink.
      if (!data?.length) throw new Error('drink_not_updated');
      return true;
    },
    onSuccess: async (saved) => {
      if (!saved) return;
      await queryClient.invalidateQueries({ queryKey: queryKeys.drinks });
      onDone();
    },
    onError: (e: unknown) => setError(e instanceof Error && e.message === t.drink.nameRequired ? e.message : t.drink.saveError),
  });

  return (
    <form
      className="flex flex-col gap-3 rounded-xl bg-neutral-900 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        save.mutate();
      }}
    >
      <label className="flex flex-col gap-1 text-sm text-neutral-400">
        {t.drink.name}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          className="min-h-11 rounded-lg bg-neutral-950 px-3 text-base text-neutral-100 outline-none focus:ring-2 focus:ring-amber-400"
        />
      </label>
      <div className="flex flex-col gap-1 text-sm text-neutral-400">
        {t.drink.type}
        <div className="flex flex-wrap gap-2">
          {allowed.map((ty) => (
            <button
              key={ty}
              type="button"
              onClick={() => {
                setType(ty);
                if (ty !== 'other') changeSubtype(EMPTY_SUBTYPE);
              }}
              aria-pressed={type === ty}
              className={`min-h-11 rounded-full px-4 text-sm ${
                type === ty ? 'bg-amber-400 font-medium text-neutral-950' : 'bg-neutral-950 text-neutral-300'
              }`}
            >
              {typeLabels[ty]}
            </button>
          ))}
        </div>
        {hasReviews && <p className="text-xs text-neutral-500">{t.drink.typeLimited}</p>}
      </div>
      {type === 'other' && (
        <SubtypePicker value={subtype} onChange={changeSubtype} showRequired={subtypeRequired} notice={subtypeNotice} />
      )}
      {error && <p className="text-sm text-rose-300">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={save.isPending}
          className="min-h-11 flex-1 rounded-lg bg-amber-400 font-medium text-neutral-950 disabled:opacity-50"
        >
          {strings.common.save}
        </button>
        <button type="button" onClick={onDone} className="min-h-11 flex-1 rounded-lg bg-neutral-800 text-neutral-200">
          {strings.common.cancel}
        </button>
      </div>
    </form>
  );
}

export default function DrinkPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useSession();
  const drinks = useDrinks();
  const reviews = useReviews();
  const profiles = useProfiles();
  const subtypesById = useSubtypesById();
  const [editing, setEditing] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const drink = drinks.data?.find((d) => d.id === id);

  const rows = useMemo(() => {
    if (!drink) return [];
    const nicks = new Map((profiles.data ?? []).map((p) => [p.id, p.nick]));
    const group = groupOf(drink.type);
    return (reviews.data ?? [])
      .filter((r) => r.drink_id === drink.id)
      .map((r) => ({ review: r, nick: nicks.get(r.author_id) ?? '?', score: authorScore(group, r) }))
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  }, [drink, reviews.data, profiles.data]);

  const del = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from('drinks').delete().eq('id', id!).select('id');
      if (error) throw error;
      // RLS denies silently (0 rows) once someone else has reviewed the drink.
      if (!data?.length) throw new Error('drink_not_deleted');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.drinks }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reviews }),
      ]);
      navigate('/', { replace: true });
    },
    onError: () => setDeleteError(true),
  });

  if (drinks.isLoading || reviews.isLoading || profiles.isLoading)
    return <p className="py-4 text-neutral-400">{strings.common.loading}</p>;
  if (drinks.isError || reviews.isError || profiles.isError)
    return <p className="py-4 text-rose-300">{strings.common.error}</p>;
  if (!drink) return <p className="py-4 text-neutral-400">{t.drink.notFound}</p>;

  const stats = drinkStats(
    groupOf(drink.type),
    rows.map((r) => r.review),
  );
  const mine = rows.find((r) => r.review.author_id === profile?.id);
  const isAdmin = Boolean(profile?.is_admin);
  const canEdit = isAdmin || (profile !== null && drink.created_by === profile.id);

  return (
    <div className="flex flex-col gap-5 py-2">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{drink.name}</h1>
          <p className="text-sm text-neutral-400">
            {drinkTypeLabel(drink, subtypesById)} · {t.people.reviewsCount(stats.count)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <ScoreBadge score={stats.average} size="lg" />
          <span className="text-xs text-neutral-500">{t.drink.average}</span>
        </div>
      </header>

      <Link
        to={`/add/${drink.id}`}
        className="flex min-h-12 items-center justify-center rounded-xl bg-amber-400 font-medium text-neutral-950"
      >
        {mine ? t.drink.editMyReview : t.drink.myReview}
      </Link>

      {rows.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm text-neutral-400">{t.drink.spread}</h2>
          <ul className="flex flex-wrap gap-2">
            {rows.map(({ review, nick, score }) => (
              <li key={review.id} className="flex items-center gap-2 rounded-lg bg-neutral-900 py-1 pl-3 pr-1">
                <span className="max-w-28 truncate text-sm">{nick}</span>
                <ScoreBadge score={score} size="sm" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {rows.length === 0 ? (
        <p className="text-neutral-500">{t.drink.noReviews}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map(({ review, nick, score }) => (
            <li key={review.id} className="flex flex-col gap-3 rounded-xl bg-neutral-900 p-4">
              <div className="flex items-center justify-between gap-3">
                <Link to={`/people/${review.author_id}`} className="flex min-h-11 items-center font-medium text-amber-400">
                  {nick}
                </Link>
                <ScoreBadge score={score} />
              </div>
              <StageBlock
                label={strings.stage.first}
                type={drink.type}
                scores={review.first_scores}
                note={review.first_note}
              />
              <StageBlock
                label={strings.stage.final}
                type={drink.type}
                scores={review.final_scores}
                note={review.final_note}
              />
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <section className="flex flex-col gap-3 border-t border-neutral-800 pt-4">
          {editing ? (
            <EditForm drink={drink} hasReviews={rows.length > 0} onDone={() => setEditing(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="min-h-11 rounded-lg bg-neutral-800 text-neutral-200"
            >
              {t.drink.edit}
            </button>
          )}
          {isAdmin && (
            <>
              <button
                type="button"
                disabled={del.isPending}
                onClick={() => {
                  setDeleteError(false);
                  if (window.confirm(t.drink.deleteConfirm)) del.mutate();
                }}
                className="min-h-11 rounded-lg bg-rose-500/20 text-rose-300 disabled:opacity-50"
              >
                {t.drink.deleteDrink}
              </button>
              {deleteError && <p className="text-sm text-rose-300">{strings.common.error}</p>}
            </>
          )}
        </section>
      )}
    </div>
  );
}
