import { Button } from "#shared/ui/Button.js";
import { cardClass } from "#shared/ui/Card.js";
import { formatDate } from "#shared/lib/date.js";
import type { InviteLink } from "#contract/domain.js";
import type { InviteState } from "./inviteState.js";
import { inviteStrings as s } from "./strings.js";

interface InviteListItemProps {
  link: InviteLink;
  state: InviteState;
  copied: boolean;
  onCopy: () => void;
}

/** One invite link row with its state and a copy button while active. */
export function InviteListItem({
  link,
  state,
  copied,
  onCopy,
}: InviteListItemProps) {
  return (
    <li
      className={cardClass({}, "flex items-center justify-between gap-3 p-3")}
    >
      <div className="min-w-0">
        <p className={`text-sm ${state.tone}`}>{state.text}</p>
        <p className="truncate text-xs text-neutral-500">
          {formatDate(link.created_at)}
        </p>
      </div>
      {state.active && (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={onCopy}
        >
          {copied ? s.copied : s.copy}
        </Button>
      )}
    </li>
  );
}
