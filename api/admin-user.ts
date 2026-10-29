import { adminUser } from "../server/handlers/adminUser.js";
import { guard, readJson } from "../server/http.js";
import { createPorts } from "../server/supabase-admin.js";

export async function POST(request: Request): Promise<Response> {
  const authorization = request.headers.get("authorization");
  return guard(async () =>
    adminUser(
      { ports: createPorts() },
      { authorization, body: await readJson(request) },
    ),
  );
}
