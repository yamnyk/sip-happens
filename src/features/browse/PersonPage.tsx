import { useMemo } from "react";
import { Link, useParams } from "react-router";
import { groupOf } from "../../config/criteria";
import { authorScore } from "../../lib/score";
import { useDrinks, useProfiles, useReviews } from "../../data/queries";
import { drinkTypeLabel } from "../../lib/subtype";
import { strings } from "../../strings";
import { DRINK_TYPES } from "../../types/domain";
import { useSubtypesById } from "../subtypes/useSubtypesById";
import { browseStrings as t } from "./strings";
import { ScoreBadge } from "./ScoreBadge";

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const profiles = useProfiles();
  const drinks = useDrinks();
  const reviews = useReviews();
  const subtypesById = useSubtypesById();

  const data = useMemo(() => {
    const drinkMap = new Map((drinks.data ?? []).map((d) => [d.id, d]));
    const mine = (reviews.data ?? [])
      .filter((r) => r.author_id === id)
      .flatMap((r) => {
        const drink = drinkMap.get(r.drink_id);
        return drink
          ? [{ review: r, drink, score: authorScore(groupOf(drink.type), r) }]
          : [];
      });
    // Group by displayed type: fixed types in their usual order, custom 'other' subtypes after, alphabetically.
    const sums = new Map<
      string,
      { label: string; order: number; sum: number; n: number }
    >();
    for (const m of mine) {
      if (m.score === null) continue;
      const custom = m.drink.type === "other" && m.drink.subtype_id;
      const key = custom ? `s:${m.drink.subtype_id}` : m.drink.type;
      const cur = sums.get(key) ?? {
        label: drinkTypeLabel(m.drink, subtypesById),
        order: custom ? DRINK_TYPES.length : DRINK_TYPES.indexOf(m.drink.type),
        sum: 0,
        n: 0,
      };
      cur.sum += m.score;
      cur.n += 1;
      sums.set(key, cur);
    }
    const perType = [...sums.entries()]
      .map(([key, v]) => ({
        key,
        label: v.label,
        order: v.order,
        avg: Math.round((v.sum / v.n) * 10) / 10,
        n: v.n,
      }))
      .sort(
        (a, b) => a.order - b.order || a.label.localeCompare(b.label, "uk"),
      );
    return { mine, perType };
  }, [drinks.data, reviews.data, id, subtypesById]);

  if (profiles.isLoading || drinks.isLoading || reviews.isLoading)
    return <p className="py-4 text-neutral-400">{strings.common.loading}</p>;
  if (profiles.isError || drinks.isError || reviews.isError)
    return <p className="py-4 text-rose-300">{strings.common.error}</p>;

  const person = profiles.data?.find((p) => p.id === id);
  if (!person)
    return <p className="py-4 text-neutral-400">{t.people.notFound}</p>;

  return (
    <div className="flex flex-col gap-5 py-2">
      <h1 className="text-xl font-semibold">{person.nick}</h1>

      {data.perType.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm text-neutral-400">{t.people.byType}</h2>
          <ul className="grid grid-cols-2 gap-2">
            {data.perType.map((p) => (
              <li
                key={p.key}
                className="flex items-center justify-between rounded-xl bg-neutral-900 px-3 py-3"
              >
                <span>
                  {p.label}
                  <span className="ml-1 text-xs text-neutral-500">({p.n})</span>
                </span>
                <ScoreBadge score={p.avg} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm text-neutral-400">{t.people.reviews}</h2>
        {data.mine.length === 0 ? (
          <p className="text-neutral-500">{t.people.noReviews}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.mine.map(({ review, drink, score }) => (
              <li key={review.id}>
                <Link
                  to={`/drink/${drink.id}`}
                  className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-neutral-900 px-4 py-3 active:bg-neutral-800"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{drink.name}</p>
                    <p className="text-sm text-neutral-400">
                      {drinkTypeLabel(drink, subtypesById)}
                    </p>
                  </div>
                  <ScoreBadge score={score} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
