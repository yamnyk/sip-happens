import type { ApiResult } from "#contract/schemas.js";

/**
 * Calls an /api route and always resolves to an ApiResult; network or parse failures become server_error.
 * `token` adds an `Authorization: Bearer` header (admin routes).
 */
export async function callApi<T extends object = Record<string, never>>(
  path: string,
  body?: unknown,
  options: { token?: string } = {},
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  try {
    const res = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await res.json()) as ApiResult<T>;
    if (
      typeof json !== "object" ||
      json === null ||
      typeof json.ok !== "boolean"
    ) {
      return { ok: false, error: "server_error" };
    }
    return json;
  } catch {
    return { ok: false, error: "server_error" };
  }
}
