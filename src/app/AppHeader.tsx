import { Link } from "react-router";
import type { Profile } from "#contract/domain.js";
import { strings } from "#shared/strings.js";

/** Top bar: app name, own nick, invites, admin (admins only), logout. */
export function AppHeader({
  profile,
  onSignOut,
}: {
  profile: Profile;
  onSignOut: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <Link to="/" className="font-semibold tracking-tight">
        {strings.appName}
      </Link>
      <nav className="flex items-center gap-4 text-sm text-neutral-300">
        <span className="text-neutral-500">{profile.nick}</span>
        <Link to="/invites">{strings.nav.invites}</Link>
        {profile.is_admin && <Link to="/admin">{strings.nav.admin}</Link>}
        <button type="button" onClick={onSignOut}>
          {strings.nav.logout}
        </button>
      </nav>
    </header>
  );
}
