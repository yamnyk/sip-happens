import { Link } from "react-router";
import type { DrinkType } from "#contract/domain.js";
import { strings } from "#shared/strings.js";
import { cardClass } from "#shared/ui/Card.js";
import { ScoreBadge } from "#shared/ui/ScoreBadge.js";
import { Tag } from "#shared/ui/Tag.js";
import type { DrinkReviewRow } from "./drinkReviews.js";
import { StageBlock } from "./StageBlock.js";
import { catalogStrings as t } from "./strings.js";

/** One review of a drink: author link, score and both stages. */
export function DrinkReviewCard({
  row: { review, nick, disabled, score },
  type,
}: {
  row: DrinkReviewRow;
  type: DrinkType;
}) {
  return (
    <li className={cardClass({}, "flex flex-col gap-3 p-4")}>
      <div className="flex items-center justify-between gap-3">
        <Link
          to={`/people/${review.author_id}`}
          className="flex min-h-11 items-center gap-2 font-medium text-amber-400"
        >
          {nick}
          {disabled && <Tag tone="danger">{t.drink.banned}</Tag>}
        </Link>
        <ScoreBadge score={score} />
      </div>
      <StageBlock
        label={strings.stage.first}
        type={type}
        scores={review.first_scores}
        note={review.first_note}
      />
      <StageBlock
        label={strings.stage.final}
        type={type}
        scores={review.final_scores}
        note={review.final_note}
      />
    </li>
  );
}
