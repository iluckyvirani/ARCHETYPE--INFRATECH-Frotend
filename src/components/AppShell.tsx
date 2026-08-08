import { Bell, User, UserPlus, Users } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { BRAND } from "../lib/brand";

const links = [
  { to: "/clients/new", label: "New", end: false, Icon: UserPlus },
  { to: "/clients", label: "Clients", end: true, Icon: Users },
  { to: "/notifications", label: "Alerts", end: false, Icon: Bell },
  { to: "/profile", label: "Profile", end: false, Icon: User },
];

function NavItems({ variant }: { variant: "side" | "bottom" }) {
  return (
    <ul className={`nav-list nav-list--${variant}`}>
      {links.map(({ to, label, end, Icon }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
              `nav-link nav-link--${variant}${isActive ? " active" : ""}`
            }
          >
            <span className="nav-icon">
              <Icon size={22} strokeWidth={2} absoluteStrokeWidth />
            </span>
            <span className="nav-label">{label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

export function AppShell() {
  const location = useLocation();
  const isPrint = /\/print(\/|$)/.test(location.pathname);
  const isStart = location.pathname === "/";

  if (isPrint || isStart) {
    return (
      <div className="app-shell no-chrome">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar no-print">
        <div className="brand-block">
          <img src="/logo.png" alt={BRAND.name} className="brand-logo" />
          <p>Billing</p>
        </div>
        <NavItems variant="side" />
      </aside>

      <div className="main-area">
        <Outlet />
      </div>

      <nav className="bottom-nav no-print" aria-label="Primary">
        <NavItems variant="bottom" />
      </nav>
    </div>
  );
}
