import { nickToEmail, normalizeNick } from "../../contract/nick.js";
import { registerBodySchema } from "../../contract/schemas.js";
import type { Deps } from "../ports.js";
import { fail, ok, type HandlerResult } from "./common.js";

/**
 * Claim the invite atomically, create the user, release the claim on a definite failure.
 * If createUser throws (timeout, network) the user may exist, so the claim stays consumed.
 * Unknown, expired and used tokens are indistinguishable (all invalid_token).
 */
export async function register(
  deps: Deps,
  input: unknown,
): Promise<HandlerResult> {
  const parsed = registerBodySchema.safeParse(input);
  if (!parsed.success) return fail("invalid_input");
  const { token, nick, password } = parsed.data;
  const { ports } = deps;

  const claim = await ports.links.claim(token, "invite");
  if (!claim) return fail("invalid_token");

  const release = async (): Promise<void> => {
    try {
      await ports.links.release(token);
    } catch {
      // best effort: the original failure is what the caller needs to see
    }
  };

  let creating = false;
  try {
    const normalized = normalizeNick(nick);
    if (await ports.profiles.nickExists(normalized)) {
      await release();
      return fail("nick_taken");
    }

    const email = await nickToEmail(nick);
    creating = true;
    const created = await ports.auth.createUser({
      email,
      password,
      nick,
      invitedBy: claim.createdBy,
    });
    creating = false;

    if (!created.ok) {
      await release();
      if (created.reason === "weak_password") return fail("invalid_input");
      // The profile trigger rejects duplicate nicks, which surfaces as a generic createUser failure.
      if (
        created.reason === "exists" ||
        (await ports.profiles.nickExists(normalized))
      )
        return fail("nick_taken");
      console.error("create user failed:", created.reason);
      return fail("server_error");
    }

    try {
      await ports.links.markUsed(token, created.userId);
    } catch {
      // user exists and the claim stays consumed; used_by is cosmetic
    }
    return ok();
  } catch (error) {
    // Ambiguous outcome while creating: keep the claim consumed so the link cannot be reused.
    if (!creating) await release();
    throw error;
  }
}
