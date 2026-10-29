import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env.js";
import type { Database } from "../contract/database.js";
import type { Ports } from "./ports.js";

/** Service-role client. Server only. Never import from src/. */
type AdminClient = SupabaseClient<Database>;
let cached: AdminClient | null = null;

export function getAdminClient(): AdminClient {
  if (!cached) {
    const { url, secretKey } = getSupabaseEnv();
    cached = createClient<Database>(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

/**
 * True when the outcome of an Auth call is unknown: the request may have been applied.
 * Network failures, timeouts and 5xx are ambiguous; an error with a 4xx status or a code is definite.
 */
function isAmbiguousAuthError(error: {
  name?: string;
  status?: number;
  code?: string;
}): boolean {
  if (error.name === "AuthRetryableFetchError") return true;
  if (error.status === 0 || (error.status !== undefined && error.status >= 500))
    return true;
  return error.status === undefined && error.code === undefined;
}

/** Ban duration far enough out to be permanent for this app. */
const BAN_FOREVER = "876000h";

export function createPorts(client: AdminClient = getAdminClient()): Ports {
  return {
    links: {
      async claim(token, kind) {
        const { data, error } = await client.rpc("claim_link", {
          p_token: token,
          p_kind: kind,
        });
        if (error) throw new Error(`claim_link failed: ${error.message}`);
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) return null;
        return {
          createdBy: row.inviter_id ?? null,
          targetUserId: row.target_id ?? null,
        };
      },
      async release(token) {
        const { error } = await client
          .from("links")
          .update({ used_at: null })
          .eq("token", token);
        if (error) throw new Error(`release link failed: ${error.message}`);
      },
      async markUsed(token, userId) {
        const { error } = await client
          .from("links")
          .update({ used_by: userId })
          .eq("token", token);
        if (error) throw new Error(`mark link used failed: ${error.message}`);
      },
      async inviteInfo(token) {
        const { data, error } = await client
          .from("links")
          .select("created_by")
          .eq("token", token)
          .eq("kind", "invite")
          .is("used_at", null)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();
        if (error) throw new Error(`invite lookup failed: ${error.message}`);
        if (!data?.created_by) return null;
        const profile = await client
          .from("profiles")
          .select("nick")
          .eq("id", data.created_by)
          .maybeSingle();
        if (profile.error)
          throw new Error(`inviter lookup failed: ${profile.error.message}`);
        return profile.data?.nick ? { inviterNick: profile.data.nick } : null;
      },
    },
    profiles: {
      async getById(id) {
        const { data, error } = await client
          .from("profiles")
          .select("id, nick, is_admin, disabled")
          .eq("id", id)
          .maybeSingle();
        if (error) throw new Error(`profile lookup failed: ${error.message}`);
        return data ?? null;
      },
      async nickExists(nickNormalized) {
        const { data, error } = await client
          .from("profiles")
          .select("id")
          .eq("nick_normalized", nickNormalized)
          .limit(1);
        if (error) throw new Error(`nick lookup failed: ${error.message}`);
        return (data?.length ?? 0) > 0;
      },
      async setDisabled(id, disabled) {
        const { error } = await client
          .from("profiles")
          .update({ disabled })
          .eq("id", id);
        if (error) throw new Error(`set disabled failed: ${error.message}`);
      },
    },
    auth: {
      async createUser({ email, password, nick, invitedBy }) {
        const { data, error } = await client.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { nick, invited_by: invitedBy },
        });
        if (error && isAmbiguousAuthError(error))
          throw new Error(`create user failed: ${error.message}`);
        if (error || !data.user) {
          const exists =
            error?.code === "email_exists" ||
            error?.code === "user_already_exists";
          // Only the code and message: the request body holds the password.
          if (!exists && error?.code !== "weak_password")
            console.error(
              "auth createUser failed:",
              error?.code,
              error?.message,
            );
          if (error?.code === "weak_password")
            return { ok: false, reason: "weak_password" };
          return { ok: false, reason: exists ? "exists" : "other" };
        }
        return { ok: true, userId: data.user.id };
      },
      async updatePassword(userId, password) {
        const { error } = await client.auth.admin.updateUserById(userId, {
          password,
        });
        if (error && isAmbiguousAuthError(error))
          throw new Error(`update password failed: ${error.message}`);
        if (error)
          return {
            ok: false,
            reason: error.code === "weak_password" ? "weak_password" : "other",
          };
        return { ok: true };
      },
      async verifyJwt(jwt) {
        const { data, error } = await client.auth.getUser(jwt);
        if (error || !data.user) return null;
        return data.user.id;
      },
      async deleteUser(userId) {
        const { error } = await client.auth.admin.deleteUser(userId);
        if (error) throw new Error(`delete user failed: ${error.message}`);
      },
      async setBanned(userId, banned) {
        const { error } = await client.auth.admin.updateUserById(userId, {
          ban_duration: banned ? BAN_FOREVER : "none",
        });
        if (error) throw new Error(`set ban failed: ${error.message}`);
      },
      async revokeSessions(userId) {
        const { error } = await client.rpc("revoke_sessions", {
          p_user: userId,
        });
        if (error) throw new Error(`revoke sessions failed: ${error.message}`);
      },
    },
    resetRequests: {
      async create(nick, inviterNick) {
        const { data, error } = await client.rpc("create_reset_request", {
          p_nick: nick,
          p_inviter_nick: inviterNick,
        });
        if (error)
          throw new Error(`create_reset_request failed: ${error.message}`);
        return data === "rate_limited" ? "rate_limited" : "ok";
      },
    },
    health: {
      async ping() {
        const { error } = await client.from("profiles").select("id").limit(1);
        if (error) throw new Error(`keepalive read failed: ${error.message}`);
      },
    },
  };
}
