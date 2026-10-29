import { formatDate } from "#shared/lib/date.js";
import type { InviteLink } from "#contract/domain.js";
import { inviteStrings as s } from "./strings.js";

/** Display state of an invite link. */
export interface InviteState {
  kind: "used" | "expired" | "active";
  text: string;
  /** Tailwind text color class. */
  tone: string;
  /** True when the link can still be copied and used. */
  active: boolean;
}

/** Derives text, tone and activity of a link at time `now` (ms). */
export function inviteState(
  link: InviteLink,
  now: number,
  nickOf: (id: string | null) => string,
): InviteState {
  if (link.used_at)
    return {
      kind: "used",
      text: s.used(nickOf(link.used_by), formatDate(link.used_at)),
      tone: "text-emerald-400",
      active: false,
    };
  if (new Date(link.expires_at).getTime() <= now)
    return {
      kind: "expired",
      text: s.expired(formatDate(link.expires_at)),
      tone: "text-neutral-500",
      active: false,
    };
  return {
    kind: "active",
    text: s.active(formatDate(link.expires_at)),
    tone: "text-amber-400",
    active: true,
  };
}
