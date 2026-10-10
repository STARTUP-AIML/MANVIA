/**
 * MANVIA Doctor Authenticated Header
 * Dedicated navigation and identity header for the Doctor Clinical Workspace (/doctor/*).
 * Strictly isolated: Zero exposure to Patient Portal, Admin Console, or Platform Health.
 */

import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { UserMenu } from "./UserMenu";
import { Badge } from "../ui/Badge";

export const DoctorHeader: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "Dashboard", href: "/doctor", end: true },
    { label: "Appointments", href: "/doctor/appointments" },
    { label: "Availability", href: "/doctor/availability" },
    { label: "Offers", href: "/doctor/offers" },
    { label: "Verification", href: "/doctor/verification" },
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
            to="/doctor"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
            }}
            aria-label="MANVIA Doctor Workspace Home"
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#ffffff",
                border: "1.5px solid #ccebe8",
                boxShadow: "0 2px 8px rgba(14, 124, 115, 0.12)",
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
                      '<span style="color:#0284c7;font-weight:800;font-size:16px;">M</span>';
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
          <Badge variant="info">
            Doctor Workspace
          </Badge>
        </div>

        {/* Desktop Quick Nav */}
        <nav
          aria-label="Doctor Navigation"
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
                  ? "var(--manvia-info-700, #0369a1)"
                  : "var(--color-text-secondary, #475569)",
                backgroundColor: isActive
                  ? "var(--manvia-info-50, #f0f9ff)"
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
          <UserMenu role="DOCTOR" />

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

      {/* Mobile Drawer (Only Doctor Nav Items) */}
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
          aria-label="Mobile Doctor Navigation"
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
                  ? "var(--manvia-info-700, #0369a1)"
                  : "var(--color-text-primary, #0f172a)",
                backgroundColor: isActive
                  ? "var(--manvia-info-50, #f0f9ff)"
                  : "transparent",
                textDecoration: "none",
              })}
            >
              {item.label}
            </NavLink>
          ))}
          <div
            style={{
              height: "1px",
              backgroundColor: "var(--color-border-subtle, #e2e8f0)",
              margin: "6px 0",
            }}
          />
          <Link
            to="/doctor/profile"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: "10px 14px",
              borderRadius: "var(--radius-md, 8px)",
              fontSize: "14px",
              color: "var(--color-text-secondary, #475569)",
              textDecoration: "none",
            }}
          >
            👤 Practitioner Profile
          </Link>
          <Link
            to="/doctor/settings"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: "10px 14px",
              borderRadius: "var(--radius-md, 8px)",
              fontSize: "14px",
              color: "var(--color-text-secondary, #475569)",
              textDecoration: "none",
            }}
          >
            ⚙️ Clinical Settings
          </Link>
        </div>
      )}

      <style>{`
        @media (max-width: 899px) {
          .desktop-nav {
            display: none !important;
          }
        }
        @media (min-width: 900px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-menu-btn {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
};
