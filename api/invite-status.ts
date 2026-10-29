import { inviteStatus } from "#server/handlers/inviteStatus.js";
import { guard } from "#server/http.js";
import { createPorts } from "#server/supabase-admin.js";

export async function GET(request: Request): Promise<Response> {
  const token = new URL(request.url).searchParams.get("token");
  return guard(async () => inviteStatus({ ports: createPorts() }, { token }));
}
