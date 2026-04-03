import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { DashboardLayout } from "./pages/DashboardLayout";
import { Generator } from "./pages/Generator";
import { Login } from "./pages/Login";
import { Profile } from "./pages/Profile";
import { Register } from "./pages/Register";
import { Vault } from "./pages/Vault";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, ready } = useAuth();
  if (!ready) {
    return (
      <div className="page-center">
        <p className="muted">Loading…</p>
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { token, ready } = useAuth();
  if (!ready) {
    return (
      <div className="page-center">
        <p className="muted">Loading…</p>
      </div>
    );
  }
  if (token) return <Navigate to="/vault" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <Login />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <Register />
          </PublicOnly>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/vault" replace />} />
        <Route path="profile" element={<Profile />} />
        <Route path="vault" element={<Vault />} />
        <Route path="generator" element={<Generator />} />
      </Route>
      <Route path="*" element={<Navigate to="/vault" replace />} />
    </Routes>
  );
}
