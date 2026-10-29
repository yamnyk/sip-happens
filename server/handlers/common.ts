import { createHash, timingSafeEqual } from "node:crypto";
import type { ApiErrorCode, ApiResult } from "../../contract/schemas.js";

export interface HandlerResult<T extends object = object> {
  status: number;
  body: ApiResult<T>;
}

const ERROR_STATUS: Record<ApiErrorCode, number> = {
  invalid_input: 400,
  invalid_token: 400,
  nick_taken: 409,
  rate_limited: 429,
  unauthorized: 401,
  forbidden: 403,
  server_error: 500,
};

export function fail<T extends object = object>(
  error: ApiErrorCode,
): HandlerResult<T> {
  return { status: ERROR_STATUS[error], body: { ok: false, error } };
}

export function ok<T extends object = object>(data?: T): HandlerResult<T> {
  return { status: 200, body: { ok: true, ...(data ?? {}) } as ApiResult<T> };
}

/** Extracts the token from an `Authorization: Bearer <token>` header value. */
export function parseBearer(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1]! : null;
}

/** Constant-time string comparison (hashes first so lengths do not leak). */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
