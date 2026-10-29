import { register } from "#server/handlers/register.js";
import { guard, readJson } from "#server/http.js";
import { createPorts } from "#server/supabase-admin.js";

export async function POST(request: Request): Promise<Response> {
  return guard(async () =>
    register({ ports: createPorts() }, await readJson(request)),
  );
}
