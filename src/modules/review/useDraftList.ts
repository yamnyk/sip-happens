import { useCallback, useEffect, useState } from "react";
import { clearDrafts, listDrafts, type DraftEntry } from "./drafts.js";

/** Local drafts of the user: loaded on mount and when userId changes; remove clears one context and reloads. */
export function useDraftList(userId: string | undefined) {
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);

  const load = useCallback(async () => {
    if (!userId) return [];
    return listDrafts(userId);
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    void load().then((list) => {
      if (!cancelled) setDrafts(list);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const remove = useCallback(
    async (context: string) => {
      if (!userId) return;
      await clearDrafts(userId, context);
      setDrafts(await load());
    },
    [userId, load],
  );

  return { drafts, remove };
}
