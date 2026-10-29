import { useEffect, useState } from "react";
import { callApi } from "#shared/api/callApi.js";
import { apiErrors } from "#shared/strings.js";

export type InviteStatus =
  | { state: "loading" }
  | { state: "dead"; message: string }
  | { state: "valid"; inviterNick: string };

/**
 * Looks up an invite token. Returns the status and a setter so the caller can
 * mark the invite dead (e.g. when registering reports an invalid token).
 */
export function useInviteStatus(token: string) {
  const [status, setStatus] = useState<InviteStatus>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;
    void callApi<{ valid: boolean; inviterNick?: string }>(
      `/api/invite-status?token=${encodeURIComponent(token)}`,
    ).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setStatus({
          state: "dead",
          message:
            apiErrors[
              res.error === "server_error" ? "server_error" : "invalid_token"
            ],
        });
      } else if (!res.valid) {
        setStatus({ state: "dead", message: apiErrors.invalid_token });
      } else {
        setStatus({ state: "valid", inviterNick: res.inviterNick ?? "" });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return { status, setStatus };
}
