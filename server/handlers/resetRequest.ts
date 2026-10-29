import { resetRequestBodySchema } from "../../src/lib/schemas.js";
import type { Deps } from "../ports.js";
import { fail, ok, type HandlerResult } from "./common.js";

/**
 * Public forgot-password form. The response never depends on whether the nick exists or matches.
 * Only the global hourly cap is reported (it says nothing about any nick).
 */
export async function resetRequest(
  deps: Deps,
  input: unknown,
): Promise<HandlerResult> {
  const parsed = resetRequestBodySchema.safeParse(input);
  if (!parsed.success) return fail("invalid_input");
  const nick = parsed.data.nick.trim();
  const inviterNick = parsed.data.inviterNick.trim();
  if (!nick || !inviterNick) return fail("invalid_input");

  const result = await deps.ports.resetRequests.create(nick, inviterNick);
  return result === "rate_limited" ? fail("rate_limited") : ok();
}
