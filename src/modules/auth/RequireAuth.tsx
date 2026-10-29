import { Navigate, Outlet } from "react-router";
import { strings } from "#shared/strings.js";
import { Button } from "#shared/ui/Button.js";
import { PageStatus } from "#shared/ui/Status.js";
import { useSession } from "./session.js";

/** Guards the signed-in area: waits for the session and profile, else sends to /login. */
export function RequireAuth() {
  const { session, profile, loading, profileError, retryProfile, signOut } =
    useSession();

  if (loading) return <PageStatus>{strings.common.loading}</PageStatus>;
  // Do not bounce a valid session to /login just because the profile fetch failed.
  if (profileError)
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 px-4 py-8">
        <PageStatus tone="error">{strings.common.error}</PageStatus>
        <Button
          type="button"
          variant="primary"
          className="w-full"
          onClick={retryProfile}
        >
          {strings.common.retry}
        </Button>
        <button
          type="button"
          onClick={() => void signOut()}
          className="min-h-11 text-sm text-neutral-400"
        >
          {strings.nav.logout}
        </button>
      </div>
    );
  if (!session || !profile) return <Navigate to="/login" replace />;

  return <Outlet />;
}
