import { z } from "zod";
import { validateNick } from "./nick.js";

const nickSchema = z
  .string()
  .refine((v) => validateNick(v) === null, { message: "invalid_nick" });
const PASSWORD_MIN = 8;
/** bcrypt (GoTrue) truncates or rejects beyond 72 BYTES, so count bytes, not characters. */
const PASSWORD_MAX_BYTES = 72;

export type PasswordError = "password_too_short" | "password_too_long";

/** Same rules as passwordSchema; used by the client to pick a message before calling the API. */
export function checkPassword(v: string): PasswordError | null {
  if (v.length < PASSWORD_MIN) return "password_too_short";
  if (new TextEncoder().encode(v).length > PASSWORD_MAX_BYTES)
    return "password_too_long";
  return null;
}

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN)
  .refine((v) => new TextEncoder().encode(v).length <= PASSWORD_MAX_BYTES, {
    message: "password_too_long",
  });
const tokenSchema = z.uuid();

export const registerBodySchema = z.object({
  token: tokenSchema,
  nick: nickSchema,
  password: passwordSchema,
});

export const resetRequestBodySchema = z.object({
  nick: z.string().min(1).max(64),
  inviterNick: z.string().min(1).max(64),
});

export const resetCompleteBodySchema = z.object({
  token: tokenSchema,
  password: passwordSchema,
});

export const adminUserBodySchema = z.object({
  userId: z.uuid(),
  action: z.enum(["delete", "ban", "unban"]),
});

export const inviteStatusQuerySchema = z.object({ token: tokenSchema });

export type ApiErrorCode =
  | "invalid_input"
  | "invalid_token"
  | "nick_taken"
  | "rate_limited"
  | "unauthorized"
  | "forbidden"
  | "server_error";

export type ApiResult<T = Record<string, never>> =
  ({ ok: true } & T) | { ok: false; error: ApiErrorCode };

export interface InviteStatus {
  valid: boolean;
  inviterNick?: string;
}
