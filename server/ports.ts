import type { LinkKind } from "../src/types/domain.js";

/**
 * Narrow persistence/auth surface the handlers depend on.
 * Real implementation: createPorts() in supabase-admin.ts. Tests inject fakes.
 * Implementations throw on unexpected infrastructure errors; handlers map that to server_error upstream.
 */

export interface ClaimedLink {
  /** Creator of the link (the inviter for invite links). */
  createdBy: string | null;
  targetUserId: string | null;
}

export interface ProfileRow {
  id: string;
  nick: string;
  is_admin: boolean;
  disabled: boolean;
}

export type CreateUserResult =
  { ok: true; userId: string } | { ok: false; reason: "exists" | "other" };

export interface Ports {
  links: {
    /** Atomic single-use claim: unused, unexpired, matching kind. Null when nothing was claimed. */
    claim(token: string, kind: LinkKind): Promise<ClaimedLink | null>;
    /** Undo a claim (set used_at back to null). */
    release(token: string): Promise<void>;
    markUsed(token: string, userId: string): Promise<void>;
    /** Inviter nick for a currently valid invite link, else null. Read-only. */
    inviteInfo(token: string): Promise<{ inviterNick: string } | null>;
  };
  profiles: {
    getById(id: string): Promise<ProfileRow | null>;
    nickExists(nickNormalized: string): Promise<boolean>;
    setDisabled(id: string, disabled: boolean): Promise<void>;
  };
  auth: {
    createUser(input: {
      email: string;
      password: string;
      nick: string;
      invitedBy: string | null;
    }): Promise<CreateUserResult>;
    updatePassword(userId: string, password: string): Promise<void>;
    /** Verifies an access token; returns the user id or null. */
    verifyJwt(jwt: string): Promise<string | null>;
    deleteUser(userId: string): Promise<void>;
    setBanned(userId: string, banned: boolean): Promise<void>;
    /** Kills all sessions and refresh tokens of the user. */
    revokeSessions(userId: string): Promise<void>;
  };
  resetRequests: {
    create(nick: string, inviterNick: string): Promise<"ok" | "rate_limited">;
  };
  health: {
    /** A real read against the database. */
    ping(): Promise<void>;
  };
}

export interface Deps {
  ports: Ports;
}
