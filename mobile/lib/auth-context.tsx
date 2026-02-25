import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { router } from "expo-router";
import type { User, AccountType } from "./types";
import * as api from "./api-client";

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, accountType?: AccountType) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState>({
  token: null,
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from SecureStore on mount
  useEffect(() => {
    api.getStoredToken().then(async (stored) => {
      if (!stored) {
        setLoading(false);
        return;
      }
      setToken(stored);
      try {
        const me = await api.getMe();
        setUser(me);
      } catch {
        await api.clearStoredToken();
        setToken(null);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login({ email, password });
    await api.setStoredToken(res.access_token);
    setToken(res.access_token);
    const me = await api.getMe();
    setUser(me);
  }, []);

  const register = useCallback(
    async (email: string, password: string, accountType?: AccountType) => {
      await api.register({ email, password, account_type: accountType });
    },
    [],
  );

  const logout = useCallback(async () => {
    await api.clearStoredToken();
    setToken(null);
    setUser(null);
    router.replace("/(auth)/login");
  }, []);

  const value = useMemo(
    () => ({ token, user, loading, login, register, logout }),
    [token, user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
