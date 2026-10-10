/**
 * MANVIA Admin Console Shell
 * Secure governance and operations layout shell.
 */

import React, { type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";

export const AdminShell: React.FC<{ children?: ReactNode }> = ({
  children,
}) => {
  const adminNav = [
    { label: "Platform Metrics", href: "/admin", icon: "📈" },
    { label: "Doctor Verification", href: "/admin/doctor-verification", icon: "🛡️" },
    { label: "Doctor Directory", href: "/admin/doctors", icon: "🩺" },
    { label: "Appointments", href: "/admin/appointments", icon: "📅" },
    { label: "User Governance", href: "/admin/users", icon: "👥" },
    { label: "Audit Trail", href: "/admin/audit", icon: "📜" },
    { label: "Platform Health", href: "/admin/platform-health", icon: "⚙️" },
  ];

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <AdminHeader />
      <div style={{ display: "flex", flex: 1 }}>
        <Sidebar title="Administration" items={adminNav} />
        <main
          style={{
            flex: 1,
            padding: "var(--space-6)",
            backgroundColor: "var(--color-bg-app)",
            overflowX: "hidden",
          }}
          role="main"
          id="main-content"
        >
          {children || <Outlet />}
        </main>
      </div>
      <Footer />
    </div>
  );
};
