import { resetCompleteBodySchema } from "../../contract/schemas.js";
import type { Deps } from "../ports.js";
import { fail, ok, type HandlerResult } from "./common.js";

/** Claim the reset link, set the new password, release the claim if that fails. */
export async function resetComplete(
  deps: Deps,
  input: unknown,
): Promise<HandlerResult> {
  const parsed = resetCompleteBodySchema.safeParse(input);
  if (!parsed.success) return fail("invalid_input");
  const { token, password } = parsed.data;
  const { ports } = deps;

  const claim = await ports.links.claim(token, "reset");
  if (!claim) return fail("invalid_token");

  const release = async (): Promise<void> => {
    try {
      await ports.links.release(token);
    } catch {
      // best effort
    }
  };

  const userId = claim.targetUserId;
  if (!userId) {
    await release();
    return fail("invalid_token");
  }

  try {
    await ports.auth.updatePassword(userId, password);
  } catch (error) {
    await release();
    throw error;
  }

  try {
    await ports.auth.revokeSessions(userId);
  } catch (error) {
    console.error(
      "revoke sessions failed",
      error instanceof Error ? error.message : "unknown",
    );
  }

  try {
    await ports.links.markUsed(token, userId);
  } catch {
    // password is already changed; used_by is cosmetic
  }
  return ok();
}
