import { Button } from "#shared/ui/Button.js";
import { Tag } from "#shared/ui/Tag.js";
import { cardClass } from "#shared/ui/Card.js";
import { formatDateTime } from "#shared/lib/date.js";
import type { Profile } from "#contract/domain.js";
import { CopyLink } from "./CopyLink.js";
import { WarnIcon } from "./WarnIcon.js";
import { adminStrings as t } from "./strings.js";

interface UserCardProps {
  profile: Profile;
  /** Nick of the inviter, or null when there is none. */
  inviterNick: string | null;
  reviewCount: number;
  pending: boolean;
  isMe: boolean;
  /** Reset link to show, if one was just issued. */
  link: string | undefined;
  resolveDisabled: boolean;
  actionDisabled: boolean;
  onResolve: (userId: string) => void;
  onUserAction: (p: Profile, action: "delete" | "ban" | "unban") => void;
}

/** One user row in the admin list with reset and ban/delete actions. */
export function UserCard({
  profile: p,
  inviterNick,
  reviewCount,
  pending,
  isMe,
  link,
  resolveDisabled,
  actionDisabled,
  onResolve,
  onUserAction,
}: UserCardProps) {
  return (
    <li className={cardClass({}, "flex flex-col gap-3 p-4")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {pending && <WarnIcon />}
          <span className="truncate font-medium">{p.nick}</span>
          {p.is_admin && (
            <span className="text-xs text-amber-400">{t.admin}</span>
          )}
          {p.disabled && <Tag tone="danger">{t.disabled}</Tag>}
        </div>
        <span className="shrink-0 text-sm text-neutral-400">
          {t.reviews}: {reviewCount}
        </span>
      </div>
      <p className="text-xs text-neutral-500">
        {t.invitedBy}: {inviterNick ?? t.emptyValue} {t.separator} {t.created}:{" "}
        {formatDateTime(p.created_at)}
      </p>
      {link && <CopyLink url={link} />}
      <div className="flex flex-wrap gap-2">
        {pending && (
          <Button
            variant="primary"
            size="sm"
            disabled={resolveDisabled}
            onClick={() => onResolve(p.id)}
          >
            {t.resolve}
          </Button>
        )}
        {!isMe && !p.is_admin && (
          <>
            <Button
              variant="secondary"
              size="sm"
              disabled={actionDisabled}
              onClick={() => onUserAction(p, p.disabled ? "unban" : "ban")}
            >
              {p.disabled ? t.unban : t.ban}
            </Button>
            <Button
              variant="dangerSoft"
              size="sm"
              disabled={actionDisabled}
              onClick={() => onUserAction(p, "delete")}
            >
              {t.delete}
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
