import { useMemo } from "react";
import { useParams } from "react-router";
import { groupOf } from "#shared/config/criteria.js";
import { drinkStats } from "#shared/lib/score.js";
import { useDrinks, useProfiles, useReviews } from "#shared/api/queries.js";
import { useSession } from "#modules/auth/index.js";
import { useSubtypesById } from "#modules/subtypes/index.js";
import { strings } from "#shared/strings.js";
import { ScoreBadge } from "#shared/ui/ScoreBadge.js";
import { PageStatus } from "#shared/ui/Status.js";
import { AdminActions } from "./AdminActions.js";
import { DrinkHeader } from "./DrinkHeader.js";
import { DrinkReviewCard } from "./DrinkReviewCard.js";
import { buildDrinkReviewRows } from "./drinkReviews.js";
import { catalogStrings as t } from "./strings.js";

/** Drink detail page: stats, per-author review cards and owner/admin actions. */
export function DrinkPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useSession();
  const drinks = useDrinks();
  const reviews = useReviews();
  const profiles = useProfiles();
  const subtypesById = useSubtypesById();

  const drink = drinks.data?.find((d) => d.id === id);

  const rows = useMemo(
    () =>
      drink
        ? buildDrinkReviewRows(
            drink,
            reviews.data ?? [],
            profiles.data ?? [],
            t.drink.unknownNick,
          )
        : [],
    [drink, reviews.data, profiles.data],
  );

  if (drinks.isLoading || reviews.isLoading || profiles.isLoading)
    return <PageStatus>{strings.common.loading}</PageStatus>;
  if (drinks.isError || reviews.isError || profiles.isError)
    return <PageStatus tone="error">{strings.common.error}</PageStatus>;
  if (!drink) return <PageStatus>{t.drink.notFound}</PageStatus>;

  const stats = drinkStats(
    groupOf(drink.type),
    rows.map((r) => r.review),
  );
  const mine = rows.find((r) => r.review.author_id === profile?.id);
  const isAdmin = Boolean(profile?.is_admin);
  const canEdit =
    isAdmin || (profile !== null && drink.created_by === profile.id);

  return (
    <div className="flex flex-col gap-5 py-2">
      <DrinkHeader
        drink={drink}
        subtypesById={subtypesById}
        count={stats.count}
        average={stats.average}
        hasMine={Boolean(mine)}
      />

      {rows.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm text-neutral-400">{t.drink.spread}</h2>
          <ul className="flex flex-wrap gap-2">
            {rows.map(({ review, nick, score }) => (
              <li
                key={review.id}
                className="flex items-center gap-2 rounded-lg bg-neutral-900 py-1 pr-1 pl-3"
              >
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
          {rows.map((row) => (
            <DrinkReviewCard key={row.review.id} row={row} type={drink.type} />
          ))}
        </ul>
      )}

      {canEdit && (
        <AdminActions
          drink={drink}
          hasReviews={rows.length > 0}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
