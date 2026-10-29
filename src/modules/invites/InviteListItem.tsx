import { useState } from "react";
import { Button } from "#shared/ui/Button.js";
import { cardClass } from "#shared/ui/Card.js";
import { ErrorText } from "#shared/ui/Status.js";
import { formatDate } from "#shared/lib/date.js";
import type { InviteLink } from "#contract/domain.js";
import type { InviteState } from "./inviteState.js";
import { inviteStrings as s } from "./strings.js";

interface InviteListItemProps {
  link: InviteLink;
  state: InviteState;
  copied: boolean;
  onCopy: () => void;
  onRevoke: () => void;
  revoking: boolean;
  revokeFailed: boolean;
}

/** One invite link row with its state, a copy button and a two-step revoke while active. */
export function InviteListItem({
  link,
  state,
  copied,
  onCopy,
  onRevoke,
  revoking,
  revokeFailed,
}: InviteListItemProps) {
  const [confirming, setConfirming] = useState(false);
  return (
    <li className={cardClass({}, "flex flex-col gap-3 p-3")}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-sm ${state.tone}`}>{state.text}</p>
          <p className="truncate text-xs text-neutral-500">
            {formatDate(link.created_at)}
          </p>
        </div>
        {state.active && (
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={onCopy}>
              {copied ? s.copied : s.copy}
            </Button>
            {!confirming && (
              <Button
                variant="dangerSoft"
                size="sm"
                onClick={() => setConfirming(true)}
              >
                {s.revoke}
              </Button>
            )}
          </div>
        )}
      </div>
      {state.active && confirming && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-neutral-200">{s.revokeConfirm}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="danger" disabled={revoking} onClick={onRevoke}>
              {s.revokeYes}
            </Button>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              {s.revokeNo}
            </Button>
          </div>
        </div>
      )}
      {revokeFailed && <ErrorText>{s.revokeFailed}</ErrorText>}
    </li>
  );
}
