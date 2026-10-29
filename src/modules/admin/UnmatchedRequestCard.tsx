import { Button } from "#shared/ui/Button.js";
import { cardClass } from "#shared/ui/Card.js";
import { formatDateTime } from "#shared/lib/date.js";
import type { ResetRequest } from "#contract/domain.js";
import { adminStrings as t } from "./strings.js";

interface UnmatchedRequestCardProps {
  request: ResetRequest;
  dismissing: boolean;
  onDismiss: (id: string) => void;
}

/** Reset request that could not be matched to a user. */
export function UnmatchedRequestCard({
  request: r,
  dismissing,
  onDismiss,
}: UnmatchedRequestCardProps) {
  return (
    <li className={cardClass({}, "flex flex-col gap-2 p-4 text-sm")}>
      <p>
        <span className="text-neutral-400">{t.requestNick}:</span> {r.nick}
      </p>
      <p>
        <span className="text-neutral-400">{t.requestInviter}:</span>{" "}
        {r.inviter_nick}
      </p>
      <p>
        <span className="text-neutral-400">{t.inviterMatches}:</span>{" "}
        {r.inviter_matches ? t.yes : t.no}
      </p>
      <p className="text-xs text-neutral-500">{formatDateTime(r.created_at)}</p>
      <Button
        variant="secondary"
        size="sm"
        className="self-start"
        disabled={dismissing}
        onClick={() => onDismiss(r.id)}
      >
        {t.dismiss}
      </Button>
    </li>
  );
}
