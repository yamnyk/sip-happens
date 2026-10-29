/** The columns of a reset link row the admin screen needs. */
export interface ResetLinkRow {
  token: string;
  target_user_id: string | null;
  created_at: string;
  expires_at: string;
  used_at: string | null;
}

/** Newest usable (unused, unexpired) reset link token per target user. */
export function latestResetLinks(
  rows: readonly ResetLinkRow[],
  now: number = Date.now(),
): Record<string, string> {
  const newest = new Map<string, ResetLinkRow>();
  for (const row of rows) {
    if (!row.target_user_id) continue;
    if (row.used_at !== null || Date.parse(row.expires_at) <= now) continue;
    const prev = newest.get(row.target_user_id);
    if (!prev || Date.parse(row.created_at) > Date.parse(prev.created_at))
      newest.set(row.target_user_id, row);
  }
  return Object.fromEntries(
    [...newest].map(([userId, row]) => [userId, row.token]),
  );
}
