"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api("/auth/me", { silent401: true });
      setUser(data);
      return data;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Sesi kedaluwarsa (401 dari endpoint terlindungi) -> kembali ke login dengan pemberitahuan.
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      router.replace("/login?expired=1");
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, [router]);

  const login = useCallback(async (email, password) => {
    const { data } = await api("/auth/login", { method: "POST", body: { email, password }, silent401: true });
    setUser(data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST", silent401: true });
    } catch {
      // tetap bersihkan state lokal
    }
    setUser(null);
    router.replace("/login?loggedout=1");
  }, [router]);

  const value = useMemo(() => ({ user, loading, login, logout, refresh }), [user, loading, login, logout, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export const homePathFor = (user) => (user?.role === "teacher" ? "/dashboard" : "/tasks");
