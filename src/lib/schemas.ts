import { z } from 'zod';
import { validateNick } from './nick.js';

export const nickSchema = z.string().refine((v) => validateNick(v) === null, { message: 'invalid_nick' });
/** bcrypt (GoTrue) truncates or rejects beyond 72 BYTES, so count bytes, not characters. */
export const passwordSchema = z
  .string()
  .min(8)
  .refine((v) => new TextEncoder().encode(v).length <= 72, { message: 'password_too_long' });
export const tokenSchema = z.uuid();

export const registerBodySchema = z.object({
  token: tokenSchema,
  nick: nickSchema,
  password: passwordSchema,
});
export type RegisterBody = z.infer<typeof registerBodySchema>;

export const resetRequestBodySchema = z.object({
  nick: z.string().min(1).max(64),
  inviterNick: z.string().min(1).max(64),
});
export type ResetRequestBody = z.infer<typeof resetRequestBodySchema>;

export const resetCompleteBodySchema = z.object({
  token: tokenSchema,
  password: passwordSchema,
});
export type ResetCompleteBody = z.infer<typeof resetCompleteBodySchema>;

export const adminUserBodySchema = z.object({
  userId: z.uuid(),
  action: z.enum(['delete', 'ban', 'unban']),
});
export type AdminUserBody = z.infer<typeof adminUserBodySchema>;

export const inviteStatusQuerySchema = z.object({ token: tokenSchema });

export type ApiErrorCode =
  | 'invalid_input'
  | 'invalid_token'
  | 'nick_taken'
  | 'rate_limited'
  | 'unauthorized'
  | 'forbidden'
  | 'server_error';

export type ApiResult<T = Record<string, never>> = ({ ok: true } & T) | { ok: false; error: ApiErrorCode };

export interface InviteStatus {
  valid: boolean;
  inviterNick?: string;
}
