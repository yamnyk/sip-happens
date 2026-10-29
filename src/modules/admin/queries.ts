import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "#shared/api/supabase.js";
import { callApi } from "#shared/api/callApi.js";
import type { ApiErrorCode } from "#contract/schemas.js";
import { queryKeys } from "#shared/api/queries.js";

const adminKeys = {
  resetRequests: ["admin", "reset_requests"],
} as const;

export function useResetRequests() {
  return useQuery({
    queryKey: adminKeys.resetRequests,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reset_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/** Creates a 7-day reset link for the user and resolves their open requests. Resolves to the link token. */
export function useResolveReset(adminId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase
        .from("links")
        .insert({ kind: "reset", target_user_id: userId })
        .select("token")
        .single();
      if (error) throw error;
      const { error: updateError } = await supabase
        .from("reset_requests")
        .update({ resolved_at: new Date().toISOString(), resolved_by: adminId })
        .eq("user_id", userId)
        .is("resolved_at", null);
      if (updateError) throw updateError;
      return data.token;
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: adminKeys.resetRequests }),
  });
}

/** Closes a request that matched no user, without issuing a link. */
export function useDismissRequest(adminId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("reset_requests")
        .update({ resolved_at: new Date().toISOString(), resolved_by: adminId })
        .eq("id", requestId);
      if (error) throw error;
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: adminKeys.resetRequests }),
  });
}

export class AdminApiError extends Error {
  code: ApiErrorCode;
  constructor(code: ApiErrorCode) {
    super(code);
    this.code = code;
  }
}

type AdminUserAction = "delete" | "ban" | "unban";

export function useAdminUserAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { userId: string; action: AdminUserAction }) => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new AdminApiError("unauthorized");
      const result = await callApi("/api/admin-user", vars, { token });
      if (!result.ok) throw new AdminApiError(result.error);
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.profiles }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reviews }),
        queryClient.invalidateQueries({ queryKey: adminKeys.resetRequests }),
      ]);
    },
  });
}
