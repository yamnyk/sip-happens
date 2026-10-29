import { Link } from "react-router";
import { cardClass } from "#shared/ui/Card.js";
import { ScoreBadge } from "#shared/ui/ScoreBadge.js";
import { drinkTypeLabel } from "#shared/lib/subtype.js";
import type { Drink } from "#contract/domain.js";
import { catalogStrings as t } from "./strings.js";
import type { CatalogRow } from "./catalogRows.js";

/** One catalog list entry linking to the drink page. */
export function DrinkListItem({
  drink,
  stats,
  subtypesById,
}: {
  drink: Drink;
  stats: CatalogRow["stats"];
  subtypesById: Parameters<typeof drinkTypeLabel>[1];
}) {
  return (
    <li>
      <Link
        to={`/drink/${drink.id}`}
        className={cardClass(
          {},
          "flex min-h-16 items-center justify-between gap-3 px-4 py-3 active:bg-neutral-800",
        )}
      >
        <div className="min-w-0">
          <p className="truncate font-medium">{drink.name}</p>
          <p className="text-sm text-neutral-400">
            {drinkTypeLabel(drink, subtypesById)} {t.catalog.separator}{" "}
            {t.catalog.reviewsCount(stats.count)}
          </p>
        </div>
        <ScoreBadge score={stats.average} size="lg" />
      </Link>
    </li>
  );
}
