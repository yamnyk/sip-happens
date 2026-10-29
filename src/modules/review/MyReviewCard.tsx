import { Link } from "react-router";
import type { Drink, DrinkSubtype, Review } from "#contract/domain.js";
import { groupOf } from "#shared/config/criteria.js";
import { authorScore } from "#shared/lib/score.js";
import { drinkTypeLabel } from "#shared/lib/subtype.js";
import { Button, buttonClass } from "#shared/ui/Button.js";
import { cardClass } from "#shared/ui/Card.js";
import { ErrorText } from "#shared/ui/Status.js";
import { Tag } from "#shared/ui/Tag.js";
import { ConfirmRow } from "./ConfirmRow.js";
import { reviewStatusLabel } from "./myReviews.js";
import { reviewStrings } from "./strings.js";

const s = reviewStrings.mine;

interface MyReviewCardProps {
  review: Review;
  drink: Drink;
  subtypesById: ReadonlyMap<string, DrinkSubtype>;
  confirming: boolean;
  deleting: boolean;
  deleteFailed: boolean;
  onAskDelete: () => void;
  onCancel: () => void;
  onConfirmDelete: () => void;
}

/** One of the user's reviews with open / delete / confirm. */
export function MyReviewCard({
  review,
  drink,
  subtypesById,
  confirming,
  deleting,
  deleteFailed,
  onAskDelete,
  onCancel,
  onConfirmDelete,
}: MyReviewCardProps) {
  const score = authorScore(groupOf(drink.type), review);
  const note = review.final_note || review.first_note || "";
  return (
    <li className={cardClass({}, "flex flex-col gap-2 p-3")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/drink/${drink.id}`}
            className="block truncate font-medium text-neutral-100"
          >
            {drink.name}
          </Link>
          <Tag tone="neutral" className="mt-1">
            {drinkTypeLabel(drink, subtypesById)}
          </Tag>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={`text-xl font-semibold ${score === null ? "text-neutral-500" : "text-amber-400"}`}
          >
            {score === null ? s.scoreEmpty : score.toFixed(1)}
          </p>
          <p className="text-xs text-neutral-500">
            {reviewStatusLabel(score, review)}
          </p>
        </div>
      </div>
      {note && <p className="line-clamp-2 text-sm text-neutral-400">{note}</p>}
      {confirming ? (
        <ConfirmRow
          message={s.confirmDelete}
          yesLabel={deleting ? s.deleting : s.yes}
          noLabel={s.no}
          yesDisabled={deleting}
          onYes={onConfirmDelete}
          onNo={onCancel}
        >
          {deleteFailed && <ErrorText>{s.deleteFailed}</ErrorText>}
        </ConfirmRow>
      ) : (
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Link
            to={`/add/${drink.id}`}
            className={buttonClass({ variant: "accent", size: "sm" })}
          >
            {s.openEdit}
          </Link>
          <Button variant="outline" size="sm" onClick={onAskDelete}>
            {s.delete}
          </Button>
        </div>
      )}
    </li>
  );
}
