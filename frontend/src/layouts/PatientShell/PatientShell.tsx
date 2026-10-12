/**
 * MANVIA Patient Portal Shell
 * Responsive layout framework for patient domain views.
 */

import React, { type ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { PatientHeader } from "@/components/layout/PatientHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";

export const PatientShell: React.FC<{ children?: ReactNode }> = ({
  children,
}) => {
  const location = useLocation();
  const isAiRoute = location.pathname.startsWith("/app/ai");

  const patientNav = [
    { label: "Home", href: "/app", icon: "🏠" },
    { label: "AI Companion", href: "/app/ai", icon: "💬", badge: "AI" },
    { label: "Wellness", href: "/app/wellness", icon: "🌱", badge: "Daily" },
    { label: "Health Timeline", href: "/app/health-timeline", icon: "⏱️" },
    { label: "Find Doctors", href: "/app/doctors", icon: "🩺" },
    { label: "Appointments", href: "/app/appointments", icon: "📅" },
    { label: "Health Records", href: "/app/health-records", icon: "📁" },
    { label: "My Account", href: "/app/account", icon: "⚙️" },
  ];

  return (
    <div
      style={{
        height: isAiRoute ? "100vh" : undefined,
        minHeight: isAiRoute ? undefined : "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: isAiRoute ? "hidden" : undefined,
      }}
    >
      <PatientHeader />
      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          overflow: isAiRoute ? "hidden" : undefined,
        }}
      >
        <Sidebar title="Patient Care" items={patientNav} />
        <main
          style={{
            flex: 1,
            padding: isAiRoute ? 0 : "var(--space-6)",
            backgroundColor: "var(--color-bg-app)",
            overflowX: "hidden",
            display: isAiRoute ? "flex" : undefined,
            flexDirection: isAiRoute ? "column" : undefined,
            minHeight: 0,
            height: isAiRoute ? "100%" : undefined,
          }}
          role="main"
          id="main-content"
        >
          {children || <Outlet />}
        </main>
      </div>
      {!isAiRoute && <Footer />}
    </div>
  );
};