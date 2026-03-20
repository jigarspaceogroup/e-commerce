"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { apiClient, setAccessToken as setApiClientToken } from "./api-client";

interface User {
  id: string;
  firstName: string;
  email?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  setAccessToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setAccessToken = useCallback((token: string) => {
    setAccessTokenState(token);
  }, []);

  const login = useCallback(async (token: string, userData: User) => {
    setApiClientToken(token);
    setAccessTokenState(token);
    setUser(userData);
    // Merge guest cart if session cookie exists
    try {
      if (typeof document !== "undefined" && document.cookie.includes("cart_session")) {
        await apiClient.post("/cart/merge");
      }
    } catch {
      // Non-blocking — merge failure shouldn't break login
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // Ignore errors on logout
    }
    setAccessTokenState(null);
    setUser(null);
  }, []);

  // Try to refresh token on mount
  useEffect(() => {
    async function tryRefresh() {
      try {
        const res = await fetch("/api/v1/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setAccessTokenState(data.data.accessToken);
          const profileRes = await fetch("/api/v1/users/me", {
            headers: { Authorization: `Bearer ${data.data.accessToken}` },
          });
          if (profileRes.ok) {
            const profile = await profileRes.json();
            setUser(profile.data);
          }
        }
      } catch {
        // Not logged in
      } finally {
        setIsLoading(false);
      }
    }
    tryRefresh();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        setAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
