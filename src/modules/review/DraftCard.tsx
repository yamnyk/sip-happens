import { Link } from "react-router";
import type { Drink } from "#contract/domain.js";
import { strings } from "#shared/strings.js";
import { Button, buttonClass } from "#shared/ui/Button.js";
import { cardClass } from "#shared/ui/Card.js";
import { Tag } from "#shared/ui/Tag.js";
import { ConfirmRow } from "./ConfirmRow.js";
import {
  isNewDrinkContext,
  type DraftEntry,
  type StageName,
} from "./drafts.js";
import { draftTitle } from "./myReviews.js";
import { reviewStrings } from "./strings.js";

const s = reviewStrings.mine;
const stageLabel: Record<StageName, string> = {
  first: strings.stage.first,
  final: strings.stage.final,
};

interface DraftCardProps {
  entry: DraftEntry;
  /** The drink this draft belongs to, if it still exists. */
  drink: Drink | undefined;
  /** Precomputed type text, or null when unknown. */
  typeText: string | null;
  confirming: boolean;
  onAskDelete: () => void;
  onCancel: () => void;
  onConfirmDelete: () => void;
}

/** One local draft row with continue / delete / confirm. */
export function DraftCard({
  entry,
  drink,
  typeText,
  confirming,
  onAskDelete,
  onCancel,
  onConfirmDelete,
}: DraftCardProps) {
  const gone = !drink && !isNewDrinkContext(entry.context);
  return (
    <li className={cardClass({}, "flex flex-col gap-2 p-3")}>
      <div className="min-w-0">
        <p className="truncate font-medium text-neutral-100">
          {draftTitle(drink, entry.meta, gone)}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {typeText && <Tag tone="neutral">{typeText}</Tag>}
          {gone && <Tag tone="danger">{s.draftDrinkGone}</Tag>}
          {entry.stages.map((st) => (
            <Tag key={st} tone="accent">
              {stageLabel[st]}
            </Tag>
          ))}
        </div>
      </div>
      {confirming ? (
        <ConfirmRow
          message={s.draftConfirmDelete}
          yesLabel={s.yes}
          noLabel={s.no}
          onYes={onConfirmDelete}
          onNo={onCancel}
        />
      ) : (
        <div
          className={
            gone ? "grid grid-cols-1 gap-2" : "grid grid-cols-[1fr_auto] gap-2"
          }
        >
          {!gone && (
            <Link
              to={
                drink
                  ? `/add/${drink.id}`
                  : `/add?draft=${encodeURIComponent(entry.context)}`
              }
              className={buttonClass({ variant: "accent", size: "sm" })}
            >
              {s.draftContinue}
            </Link>
          )}
          <Button variant="outline" size="sm" onClick={onAskDelete}>
            {s.draftDelete}
          </Button>
        </div>
      )}
    </li>
  );
}
