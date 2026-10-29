import { Outlet } from "react-router";
import { useSession } from "#modules/auth/index.js";
import { AppHeader } from "./AppHeader.js";
import { TabBar } from "./TabBar.js";

/** Signed-in shell: header, page content, bottom tab bar. */
export function Layout() {
  const { profile, signOut } = useSession();
  // RequireAuth renders this only with a loaded profile.
  if (!profile) return null;

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col">
      <AppHeader profile={profile} onSignOut={() => void signOut()} />
      <main className="flex-1 px-4 pb-24">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
