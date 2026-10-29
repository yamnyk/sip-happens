import { Button } from "#shared/ui/Button.js";
import { cardClass } from "#shared/ui/Card.js";
import type { Drink } from "#contract/domain.js";
import { reviewStrings as s } from "./strings.js";

interface Props {
  conflict: Drink;
  onUse: (d: Drink) => void;
}

/** Offer to switch to the existing drink that blocked creating a duplicate. */
export function ConflictOffer({ conflict, onUse }: Props) {
  return (
    <div className={cardClass({ highlight: true }, "flex flex-col gap-2 p-3")}>
      <p className="text-sm text-neutral-100">
        {s.conflictOffer(conflict.name)}
      </p>
      <Button variant="primary" onClick={() => onUse(conflict)}>
        {s.conflictUse}
      </Button>
    </div>
  );
}
