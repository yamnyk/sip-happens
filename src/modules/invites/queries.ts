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

/** Revokes (deletes) one of the user's own unused invite links. Fails when nothing was removed. */
export function useRevokeInvite(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase
        .from("links")
        .delete()
        .eq("token", token)
        .select("token");
      if (error) throw error;
      if (data.length === 0) throw new Error("invite not revoked");
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: linksKey(userId) }),
  });
}
