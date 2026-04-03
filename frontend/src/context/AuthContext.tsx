import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loginRequest, meRequest, registerRequest, type User } from "../api";

const TOKEN_KEY = "pm_access_token";
const MASTER_KEY = "pm_master_session";

type AuthState = {
  token: string | null;
  user: User | null;
  masterPassword: string | null;
  ready: boolean;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null
  );
  const [user, setUser] = useState<User | null>(null);
  const [masterPassword, setMasterPassword] = useState<string | null>(() =>
    typeof window !== "undefined" ? sessionStorage.getItem(MASTER_KEY) : null
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setUser(null);
        setMasterPassword(null);
        sessionStorage.removeItem(MASTER_KEY);
        setReady(true);
        return;
      }
      try {
        const u = await meRequest(token);
        if (!cancelled) setUser(u);
      } catch {
        if (!cancelled) {
          setToken(null);
          localStorage.removeItem(TOKEN_KEY);
          sessionStorage.removeItem(MASTER_KEY);
          setUser(null);
          setMasterPassword(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token, user: u } = await loginRequest(email, password);
    localStorage.setItem(TOKEN_KEY, access_token);
    sessionStorage.setItem(MASTER_KEY, password);
    setToken(access_token);
    setUser(u);
    setMasterPassword(password);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const { access_token, user: u } = await registerRequest(email, password);
    localStorage.setItem(TOKEN_KEY, access_token);
    sessionStorage.setItem(MASTER_KEY, password);
    setToken(access_token);
    setUser(u);
    setMasterPassword(password);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(MASTER_KEY);
    setToken(null);
    setUser(null);
    setMasterPassword(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      masterPassword,
      ready,
      login,
      register,
      logout,
    }),
    [token, user, masterPassword, ready, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
