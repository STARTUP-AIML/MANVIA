/**
 * MANVIA Admin Authenticated Header
 * Dedicated governance and operations header for the Admin Console (/admin/*).
 * Strictly isolated: Zero exposure to Patient Portal or Doctor Workspace.
 */

import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { UserMenu } from "./UserMenu";
import { Badge } from "../ui/Badge";

export const AdminHeader: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "Metrics", href: "/admin", end: true },
    { label: "Verification", href: "/admin/doctor-verification" },
    { label: "Doctors", href: "/admin/doctors" },
    { label: "Users", href: "/admin/users" },
    { label: "Audit", href: "/admin/audit" },
    { label: "Platform Health", href: "/admin/platform-health" },
  ];

  return (
    <header
      style={{
        height: "var(--header-height, 64px)",
        backgroundColor: "var(--color-bg-surface, #ffffff)",
        borderBottom: "1px solid var(--color-border-subtle, #e2e8f0)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
      role="banner"
    >
      <div
        className="manvia-container"
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        {/* Brand & Workspace Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link
            to="/admin"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
            }}
            aria-label="MANVIA Admin Console Home"
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#ffffff",
                border: "1.5px solid #fed7aa",
                boxShadow: "0 2px 8px rgba(234, 88, 12, 0.12)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <img
                src="/manvia-logo-mark.png"
                alt="MANVIA"
                style={{ width: 24, height: 24, objectFit: "contain" }}
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = "none";
                  if (target.parentElement) {
                    target.parentElement.innerHTML =
                      '<span style="color:#ea580c;font-weight:800;font-size:16px;">M</span>';
                  }
                }}
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 800,
                  color: "var(--color-text-primary, #0f172a)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.15,
                }}
              >
                MANVIA
              </div>
              <div
                style={{
                  fontSize: "9px",
                  color: "var(--color-text-muted, #64748b)",
                  lineHeight: 1,
                }}
              >
                Care that feels human.
              </div>
            </div>
          </Link>
          <Badge variant="warning">
            Admin Console
          </Badge>
        </div>

        {/* Desktop Quick Nav */}
        <nav
          aria-label="Admin Navigation"
          className="desktop-nav"
          style={{
            alignItems: "center",
            gap: "8px",
          }}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.end}
              style={({ isActive }) => ({
                padding: "6px 12px",
                borderRadius: "var(--radius-md, 8px)",
                fontSize: "13px",
                fontWeight: isActive ? 600 : 500,
                color: isActive
                  ? "var(--manvia-warning-700, #b45309)"
                  : "var(--color-text-secondary, #475569)",
                backgroundColor: isActive
                  ? "var(--manvia-warning-50, #fffbeb)"
                  : "transparent",
                textDecoration: "none",
                transition: "all 150ms ease",
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Utility Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link
            to="/admin/platform-health"
            style={{
              textDecoration: "none",
            }}
            className="desktop-health-badge"
            aria-label="View Platform Health Diagnostics"
          >
            <Badge variant="neutral">
              Platform Health
            </Badge>
          </Link>
          <UserMenu role="ADMIN" />

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileMenuOpen}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              background: "none",
              border: "1px solid var(--color-border-subtle, #e2e8f0)",
              borderRadius: "var(--radius-md, 8px)",
              fontSize: "18px",
              cursor: "pointer",
              color: "var(--color-text-primary, #0f172a)",
            }}
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile Drawer (Only Admin Nav Items) */}
      {mobileMenuOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "var(--color-bg-surface, #ffffff)",
            borderBottom: "1px solid var(--color-border-subtle, #e2e8f0)",
            boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            zIndex: 50,
          }}
          role="navigation"
          aria-label="Mobile Admin Navigation"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.end}
              onClick={() => setMobileMenuOpen(false)}
              style={({ isActive }) => ({
                padding: "10px 14px",
                borderRadius: "var(--radius-md, 8px)",
                fontSize: "14px",
                fontWeight: isActive ? 600 : 500,
                color: isActive
                  ? "var(--manvia-warning-700, #b45309)"
                  : "var(--color-text-primary, #0f172a)",
                backgroundColor: isActive
                  ? "var(--manvia-warning-50, #fffbeb)"
                  : "transparent",
                textDecoration: "none",
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 899px) {
          .desktop-nav {
            display: none !important;
          }
          .desktop-health-badge {
            display: none !important;
          }
        }
        @media (min-width: 900px) {
          .desktop-nav {
            display: flex !important;
          }
          .desktop-health-badge {
            display: inline-flex !important;
          }
          .mobile-menu-btn {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
};
