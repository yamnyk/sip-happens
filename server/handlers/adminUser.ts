import { adminUserBodySchema } from '../../src/lib/schemas.js';
import type { Deps } from '../ports.js';
import { fail, ok, parseBearer, type HandlerResult } from './common.js';

export interface AdminUserInput {
  /** Raw Authorization header value. */
  authorization: string | null;
  body: unknown;
}

/** Admin only: delete, ban or unban a non-admin user. The caller is verified from their access token. */
export async function adminUser(deps: Deps, input: AdminUserInput): Promise<HandlerResult> {
  const { ports } = deps;

  const jwt = parseBearer(input.authorization);
  if (!jwt) return fail('unauthorized');
  const callerId = await ports.auth.verifyJwt(jwt);
  if (!callerId) return fail('unauthorized');

  const caller = await ports.profiles.getById(callerId);
  if (!caller || !caller.is_admin || caller.disabled) return fail('forbidden');

  const parsed = adminUserBodySchema.safeParse(input.body);
  if (!parsed.success) return fail('invalid_input');
  const { userId, action } = parsed.data;

  if (userId === callerId) return fail('forbidden');
  const target = await ports.profiles.getById(userId);
  if (!target) return fail('invalid_input');
  // Admins cannot act on other admins, so no admin can lock out the rest (or the last one).
  if (target.is_admin) return fail('forbidden');

  if (action === 'delete') {
    await ports.auth.deleteUser(userId);
    return ok();
  }

  if (action === 'ban') {
    // The profile flag is what RLS relies on, so it goes first; then block refresh and kill sessions.
    await ports.profiles.setDisabled(userId, true);
    await ports.auth.setBanned(userId, true);
    try {
      await ports.auth.revokeSessions(userId);
    } catch (error) {
      console.error('revoke sessions failed', error instanceof Error ? error.message : 'unknown');
    }
    return ok();
  }

  await ports.auth.setBanned(userId, false);
  await ports.profiles.setDisabled(userId, false);
  return ok();
}
