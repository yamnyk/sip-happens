import type { Deps } from '../ports.js';
import { fail, ok, parseBearer, safeEqual, type HandlerResult } from './common.js';

export interface KeepaliveDeps extends Deps {
  cronSecret: string;
}

/** Daily cron: requires `Authorization: Bearer ${CRON_SECRET}`, then performs a real DB read. */
export async function keepalive(deps: KeepaliveDeps, authorization: string | null): Promise<HandlerResult> {
  const presented = parseBearer(authorization);
  if (!deps.cronSecret || !presented || !safeEqual(presented, deps.cronSecret)) return fail('unauthorized');
  await deps.ports.health.ping();
  return ok();
}
