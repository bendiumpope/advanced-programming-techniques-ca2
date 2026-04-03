import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function DashboardLayout() {
  const { logout, user } = useAuth();

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden />
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
        <button type="button" className="btn btn-ghost sidebar-logout" onClick={logout}>
          Sign out
        </button>
      </aside>
      <main className="main-area">
        <Outlet />
      </main>
    </div>
  );
}
