import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import type { Profile } from "#contract/domain.js";
import {
  getSession,
  onAuthChange,
  signInWithNick,
  signOutUser,
  useProfile,
} from "./queries.js";

interface SessionValue {
  session: Session | null;
  profile: Profile | null;
  /** True until the initial session (and profile, when signed in) are known. */
  loading: boolean;
  /** Signed in, but the profile could not be loaded at all. The session is still valid. */
  profileError: boolean;
  retryProfile: () => void;
  /** Throws on bad credentials. */
  signIn: (nick: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    getSession()
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setSessionLoading(false));
    return onAuthChange((_event, next) => setSession(next));
  }, []);

  const userId = session?.user.id;
  const profileQuery = useProfile(userId);

  const signOut = useCallback(async () => {
    await signOutUser();
    queryClient.clear();
  }, [queryClient]);

  const profile = profileQuery.data ?? null;
  const { refetch: refetchProfile } = profileQuery;
  const retryProfile = useCallback(
    () => void refetchProfile(),
    [refetchProfile],
  );

  useEffect(() => {
    if (profile?.disabled) void signOut();
  }, [profile?.disabled, signOut]);

  const value = useMemo<SessionValue>(
    () => ({
      session,
      profile: profile?.disabled ? null : profile,
      loading: sessionLoading || (Boolean(userId) && profileQuery.isLoading),
      profileError: Boolean(userId) && profileQuery.isError && !profile,
      retryProfile,
      signIn: signInWithNick,
      signOut,
    }),
    [
      session,
      profile,
      sessionLoading,
      userId,
      profileQuery.isLoading,
      profileQuery.isError,
      retryProfile,
      signOut,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
