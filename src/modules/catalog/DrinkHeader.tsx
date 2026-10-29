import { Link } from "react-router";
import type { Drink } from "#contract/domain.js";
import { drinkTypeLabel } from "#shared/lib/subtype.js";
import { buttonClass } from "#shared/ui/Button.js";
import { ScoreBadge } from "#shared/ui/ScoreBadge.js";
import { PageTitle } from "#shared/ui/Status.js";
import { catalogStrings as t } from "./strings.js";

/** Drink title, type line, average score and the rate / edit-my-review button. */
export function DrinkHeader({
  drink,
  subtypesById,
  count,
  average,
  hasMine,
}: {
  drink: Drink;
  subtypesById: Parameters<typeof drinkTypeLabel>[1];
  count: number;
  average: number | null;
  hasMine: boolean;
}) {
  return (
    <>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <PageTitle>{drink.name}</PageTitle>
          <p className="text-sm text-neutral-400">
            {drinkTypeLabel(drink, subtypesById)} {t.catalog.separator}{" "}
            {t.catalog.reviewsCount(count)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <ScoreBadge score={average} size="lg" />
          <span className="text-xs text-neutral-500">{t.drink.average}</span>
        </div>
      </header>

      <Link
        to={`/add/${drink.id}`}
        className={buttonClass({
          variant: "primary",
          size: "lg",
          className: "w-full",
        })}
      >
        {hasMine ? t.drink.editMyReview : t.drink.myReview}
      </Link>
    </>
  );
}
