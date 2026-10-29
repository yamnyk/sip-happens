import { useMemo } from "react";
import { Link, useParams } from "react-router";
import { useDrinks, useProfiles, useReviews } from "#shared/api/queries.js";
import { drinkTypeLabel } from "#shared/lib/subtype.js";
import { strings } from "#shared/strings.js";
import { useSubtypesById } from "#modules/subtypes/index.js";
import { buildPersonStats } from "./personStats.js";
import { peopleStrings as t } from "./strings.js";
import { ScoreBadge } from "#shared/ui/ScoreBadge.js";
import { cardClass } from "#shared/ui/Card.js";
import { PageStatus, PageTitle } from "#shared/ui/Status.js";

export function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const profiles = useProfiles();
  const drinks = useDrinks();
  const reviews = useReviews();
  const subtypesById = useSubtypesById();

  const data = useMemo(
    () =>
      buildPersonStats(id, reviews.data ?? [], drinks.data ?? [], subtypesById),
    [drinks.data, reviews.data, id, subtypesById],
  );

  if (profiles.isLoading || drinks.isLoading || reviews.isLoading)
    return <PageStatus>{strings.common.loading}</PageStatus>;
  if (profiles.isError || drinks.isError || reviews.isError)
    return <PageStatus tone="error">{strings.common.error}</PageStatus>;

  const person = profiles.data?.find((p) => p.id === id);
  if (!person) return <PageStatus>{t.people.notFound}</PageStatus>;

  return (
    <div className="flex flex-col gap-5 py-2">
      <PageTitle>{person.nick}</PageTitle>

      {data.perType.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm text-neutral-400">{t.people.byType}</h2>
          <ul className="grid grid-cols-2 gap-2">
            {data.perType.map((p) => (
              <li
                key={p.key}
                className={cardClass(
                  {},
                  "flex items-center justify-between px-3 py-3",
                )}
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
                  className={cardClass(
                    {},
                    "flex min-h-14 items-center justify-between gap-3 px-4 py-3 active:bg-neutral-800",
                  )}
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
