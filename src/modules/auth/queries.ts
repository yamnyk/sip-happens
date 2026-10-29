import { useQuery } from "@tanstack/react-query";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "#shared/api/supabase.js";
import { nickToEmail } from "#contract/nick.js";

/** The signed-in user's profile row. Disabled until a user id is known. */
export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

/** Reads the persisted session, if any. */
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Subscribes to auth changes. Returns an unsubscribe function. */
export function onAuthChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange(callback);
  return () => data.subscription.unsubscribe();
}

/** Signs in by nick and password. Throws on bad credentials. */
export async function signInWithNick(
  nick: string,
  password: string,
): Promise<void> {
  const email = await nickToEmail(nick);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/** Ends the current session. */
export async function signOutUser(): Promise<void> {
  await supabase.auth.signOut();
}
