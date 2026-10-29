import {
  inviteStatusQuerySchema,
  type InviteStatus,
} from "../../src/lib/schemas.js";
import type { Deps } from "../ports.js";
import { ok, type HandlerResult } from "./common.js";

/** Valid flag plus inviter nick only. A malformed token is just "not valid". */
export async function inviteStatus(
  deps: Deps,
  input: unknown,
): Promise<HandlerResult<InviteStatus>> {
  const parsed = inviteStatusQuerySchema.safeParse(input);
  if (!parsed.success) return ok<InviteStatus>({ valid: false });
  const info = await deps.ports.links.inviteInfo(parsed.data.token);
  if (!info) return ok<InviteStatus>({ valid: false });
  return ok<InviteStatus>({ valid: true, inviterNick: info.inviterNick });
}
