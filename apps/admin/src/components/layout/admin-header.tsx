"use client";

import { useAdminAuth } from "@/lib/auth-context";
import { Breadcrumbs } from "./breadcrumbs";

export function AdminHeader() {
  const { user, logout } = useAdminAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <Breadcrumbs />

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-end">
              <p className="text-sm font-medium text-gray-900">{user.firstName}</p>
              <p className="text-xs text-gray-500">{user.role}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
              {user.firstName?.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={logout}
          className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
