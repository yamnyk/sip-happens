import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "#shared/api/supabase.js";

const linksKey = (userId: string | undefined) => ["links", userId] as const;

/** The current user's invite links, newest first. */
export function useInviteLinks(userId: string | undefined) {
  return useQuery({
    queryKey: linksKey(userId),
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("links")
        .select("*")
        .eq("kind", "invite")
        .eq("created_by", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/** Creates an invite link. Resolves to its token. Calls `onCreated` with the token after a successful insert. */
export function useCreateInvite(
  userId: string | undefined,
  onCreated?: (token: string) => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("links")
        .insert({ kind: "invite" })
        .select("token")
        .single();
      if (error) throw error;
      return data.token;
    },
    onSuccess: (token) => {
      onCreated?.(token);
      void queryClient.invalidateQueries({ queryKey: linksKey(userId) });
    },
  });
}
