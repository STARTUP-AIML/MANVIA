/**
 * MANVIA Doctor Portal Shell
 * Clinical layout architecture for medical practitioners.
 */

import React, { type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";

export const DoctorShell: React.FC<{ children?: ReactNode }> = ({
  children,
}) => {
  const doctorNav = [
    { label: "Clinical Dashboard", href: "/doctor", icon: "🩺" },
    { label: "Patient Queue", href: "/doctor/queue", icon: "👥" },
    { label: "Schedule & Slots", href: "/doctor/schedule", icon: "📆" },
    { label: "Consultations", href: "/doctor/consultations", icon: "🩺" },
    { label: "Payouts & Earnings", href: "/doctor/payouts", icon: "💳" },
    { label: "Clinical Settings", href: "/doctor/settings", icon: "⚙️" },
  ];

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <Header />
      <div style={{ display: "flex", flex: 1 }}>
        <Sidebar title="Clinical Workspace" items={doctorNav} />
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
