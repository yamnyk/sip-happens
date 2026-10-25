import type { ApiResult } from '../../lib/schemas';

/** Calls an /api route and always resolves to an ApiResult; network or parse failures become server_error. */
export async function callApi<T extends object = Record<string, never>>(
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await res.json()) as ApiResult<T>;
    if (typeof json !== 'object' || json === null || typeof json.ok !== 'boolean') {
      return { ok: false, error: 'server_error' };
    }
    return json;
  } catch {
    return { ok: false, error: 'server_error' };
  }
}
