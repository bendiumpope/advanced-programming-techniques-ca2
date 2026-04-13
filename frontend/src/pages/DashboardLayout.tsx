import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAvatarUrl } from "../hooks/useAvatarUrl";

export function DashboardLayout() {
  const { logout, user, token, masterPassword, lockVault } = useAuth();
  const sidebarAvatar = useAvatarUrl(token, user?.has_avatar, 0);
  const initial = (user?.email ?? "?").slice(0, 1).toUpperCase();

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand">
          {sidebarAvatar ? (
            <img src={sidebarAvatar} alt="" className="sidebar-avatar" />
          ) : (
            <span className="brand-mark sidebar-avatar-fallback" aria-hidden>
              {initial}
            </span>
          )}
          <div>
            <strong>Secure Vault</strong>
            <div className="muted small">{user?.email}</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <NavLink
            to="/vault"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            Secure passwords
          </NavLink>
          <NavLink
            to="/generator"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            Password generator
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            Profile
          </NavLink>
        </nav>
        <div className="sidebar-actions">
          {masterPassword ? (
            <button type="button" className="btn btn-ghost" onClick={lockVault}>
              Lock vault
            </button>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main-area">
        <Outlet />
      </main>
    </div>
  );
}
