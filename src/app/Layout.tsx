import { Link, NavLink, Navigate, Outlet } from 'react-router';
import { strings } from '../strings';
import { AddIcon, CatalogIcon, MineIcon, PeopleIcon } from './icons';
import { useSession } from './session';

const tabs = [
  { to: '/', label: strings.tabs.catalog, end: true, Icon: CatalogIcon },
  { to: '/add', label: strings.tabs.add, end: false, Icon: AddIcon },
  { to: '/mine', label: strings.tabs.mine, end: false, Icon: MineIcon },
  { to: '/people', label: strings.tabs.people, end: false, Icon: PeopleIcon },
] as const;

/** Guards the signed-in area and renders header plus bottom tab bar. */
export function Layout() {
  const { session, profile, loading, signOut } = useSession();

  if (loading) return <p className="p-4 text-neutral-400">{strings.common.loading}</p>;
  if (!session || !profile) return <Navigate to="/login" replace />;

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col">
      <header className="flex items-center justify-between gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link to="/" className="font-semibold tracking-tight">
          {strings.appName}
        </Link>
        <nav className="flex items-center gap-4 text-sm text-neutral-300">
          <span className="text-neutral-500">{profile.nick}</span>
          <Link to="/invites">{strings.nav.invites}</Link>
          {profile.is_admin && <Link to="/admin">{strings.nav.admin}</Link>}
          <button type="button" onClick={() => void signOut()}>
            {strings.nav.logout}
          </button>
        </nav>
      </header>
      <main className="flex-1 px-4 pb-24">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 border-t border-neutral-800 bg-neutral-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="mx-auto flex max-w-xl">
          {tabs.map((t) => (
            <li key={t.to} className="flex-1">
              <NavLink
                to={t.to}
                end={t.end}
                aria-label={t.label}
                title={t.label}
                className={({ isActive }) =>
                  `flex min-h-14 items-center justify-center ${isActive ? 'text-amber-400' : 'text-neutral-400'}`
                }
              >
                <t.Icon className="h-7 w-7" />
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function RequireAdmin() {
  const { profile } = useSession();
  if (!profile?.is_admin) return <Navigate to="/" replace />;
  return <Outlet />;
}
