import { NavLink } from "react-router";
import { strings } from "#shared/strings.js";
import { cn } from "#shared/ui/cn.js";
import {
  AddIcon,
  CatalogIcon,
  MineIcon,
  PeopleIcon,
} from "#shared/ui/icons.js";

const tabs = [
  { to: "/", label: strings.tabs.catalog, end: true, Icon: CatalogIcon },
  { to: "/add", label: strings.tabs.add, end: false, Icon: AddIcon },
  { to: "/mine", label: strings.tabs.mine, end: false, Icon: MineIcon },
  { to: "/people", label: strings.tabs.people, end: false, Icon: PeopleIcon },
] as const;

/** Fixed bottom navigation with icon tabs. */
export function TabBar() {
  return (
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
                cn(
                  "flex min-h-14 items-center justify-center",
                  isActive ? "text-amber-400" : "text-neutral-400",
                )
              }
            >
              <t.Icon className="h-7 w-7" />
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
