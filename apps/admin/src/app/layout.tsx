import type { ReactNode } from "react";
import { AdminAuthProvider } from "@/lib/auth-context";
import { QueryProvider } from "@/lib/react-query";
import "./globals.css";

export const metadata = {
  title: "Admin Panel",
  description: "E-Commerce Admin Panel",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <AdminAuthProvider>
          <QueryProvider>{children}</QueryProvider>
        </AdminAuthProvider>
      </body>
    </html>
  );
}
