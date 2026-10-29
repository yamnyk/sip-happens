import { keepalive } from "#server/handlers/keepalive.js";
import { getCronSecret } from "#server/env.js";
import { guard } from "#server/http.js";
import { createPorts } from "#server/supabase-admin.js";

export async function GET(request: Request): Promise<Response> {
  const authorization = request.headers.get("authorization");
  return guard(async () =>
    keepalive(
      { ports: createPorts(), cronSecret: getCronSecret() },
      { authorization },
    ),
  );
}
