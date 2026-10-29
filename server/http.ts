import type { HandlerResult } from "#server/handlers/common.js";

const HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

export function toResponse(result: HandlerResult<object>): Response {
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: HEADERS,
  });
}

/** Runs a handler; any thrown error becomes a generic server_error JSON body. Logs name and message only. */
export async function guard(
  run: () => Promise<HandlerResult<object>>,
): Promise<Response> {
  try {
    return toResponse(await run());
  } catch (error) {
    console.error(
      "api error:",
      error instanceof Error ? `${error.name}: ${error.message}` : "unknown",
    );
    return toResponse({
      status: 500,
      body: { ok: false, error: "server_error" },
    });
  }
}

/** Parses a JSON request body; returns undefined when absent or malformed (handlers reject it as invalid_input). */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
