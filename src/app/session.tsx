import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { nickToEmail } from '../lib/nick';
import type { Profile } from '../types/domain';

interface SessionValue {
  session: Session | null;
  profile: Profile | null;
  /** True until the initial session (and profile, when signed in) are known. */
  loading: boolean;
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
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId!).single();
      if (error) throw error;
      return data as Profile;
    },
  });

  const signIn = useCallback(async (nick: string, password: string) => {
    const email = await nickToEmail(nick);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
  }, [queryClient]);

  const profile = profileQuery.data ?? null;

  useEffect(() => {
    if (profile?.disabled) void signOut();
  }, [profile?.disabled, signOut]);

  const value = useMemo<SessionValue>(
    () => ({
      session,
      profile: profile?.disabled ? null : profile,
      loading: sessionLoading || (Boolean(userId) && profileQuery.isLoading),
      signIn,
      signOut,
    }),
    [session, profile, sessionLoading, userId, profileQuery.isLoading, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
