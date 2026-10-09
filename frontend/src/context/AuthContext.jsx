import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { auth as authApi, setTokens, clearTokens, getToken } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // "loading" while we verify an existing token on first mount
  const [status, setStatus] = useState("loading");

  // On mount — if a token exists in localStorage, verify it
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setStatus("idle");
      return;
    }
    authApi.me()
      .then((u) => { setUser(u); setStatus("idle"); })
      .catch(() => { clearTokens(); setStatus("idle"); });
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (email, password, displayName) => {
    const data = await authApi.register(email, password, displayName);
    // 202 means email confirmation required — no session yet
    if (!data.accessToken) return { requiresConfirmation: true };
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch {}
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
