import { Navigate, Outlet } from "react-router";
import { strings } from "#shared/strings.js";
import { PageStatus } from "#shared/ui/Status.js";
import { useSession } from "./session.js";

/** Wraps the guest-only pages: a signed-in user is sent home instead. */
export function RedirectIfAuthed() {
  const { session, profile, loading } = useSession();
  if (loading) return <PageStatus>{strings.common.loading}</PageStatus>;
  if (session && profile) return <Navigate to="/" replace />;
  return <Outlet />;
}
