import { Navigate, Outlet } from "react-router";
import { useSession } from "#modules/auth/index.js";

export function RequireAdmin() {
  const { profile } = useSession();
  if (!profile?.is_admin) return <Navigate to="/" replace />;
  return <Outlet />;
}
