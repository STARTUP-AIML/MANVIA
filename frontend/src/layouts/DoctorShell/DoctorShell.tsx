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
    { label: "Appointments", href: "/doctor/appointments", icon: "📆" },
    { label: "Availability", href: "/doctor/availability", icon: "⏱️" },
    { label: "Consultation Offers", href: "/doctor/offers", icon: "💼" },
    { label: "Practitioner Profile", href: "/doctor/profile", icon: "👤" },
    { label: "Verification Status", href: "/doctor/verification", icon: "🛡️" },
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
