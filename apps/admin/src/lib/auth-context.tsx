"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiClient, setAccessToken } from "./api-client";

interface AdminUser {
  id: string;
  firstName: string;
  email: string;
  role: string;
  permissions: string[];
}

interface AdminAuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, user: AdminUser) => void;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const login = useCallback((token: string, userData: AdminUser) => {
    setAccessToken(token);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    }
    setAccessToken(null);
    setUser(null);
    router.push("/login");
  }, [router]);

  const hasPermission = useCallback(
    (permission: string) => {
      if (!user) return false;
      if (user.role === "Super Admin") return true;
      return user.permissions.includes(permission);
    },
    [user],
  );

  useEffect(() => {
    async function tryRefresh() {
      try {
        const res = await apiClient.post<{ accessToken: string }>("/auth/refresh");
        if (res.success && res.data?.accessToken) {
          setAccessToken(res.data.accessToken);
          const profileRes = await apiClient.get<any>("/users/me");
          if (profileRes.success) {
            setUser(profileRes.data);
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
    <AdminAuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, logout, hasPermission }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return context;
}
