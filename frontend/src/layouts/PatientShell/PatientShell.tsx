/**
 * MANVIA Patient Portal Shell
 * Responsive layout framework for patient domain views.
 */

import React, { type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";

export const PatientShell: React.FC<{ children?: ReactNode }> = ({
  children,
}) => {
  const patientNav = [
    { label: "Home", href: "/app", icon: "🏠" },
    { label: "AI Companion", href: "/app/ai", icon: "🤖", badge: "AI" },
    { label: "Wellness", href: "/app/wellness", icon: "🌱", badge: "Daily" },
    { label: "Health Timeline", href: "/app/health-timeline", icon: "⏱️" },
    { label: "Find Doctors", href: "/app/doctors", icon: "🩺" },
    { label: "Appointments", href: "/app/appointments", icon: "📅" },
    { label: "Health Records", href: "/app/health-records", icon: "📁" },
    { label: "Account", href: "/app/account", icon: "👤" },
    { label: "Profile", href: "/app/profile", icon: "📋" },
    { label: "Settings", href: "/app/settings", icon: "⚙️" },
  ];

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <Header />
      <div style={{ display: "flex", flex: 1 }}>
        <Sidebar title="Patient Care" items={patientNav} />
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
