/**
 * MANVIA Public & Authentication Header
 * Provides clean, secure public branding and navigation for unauthenticated pages (/login, /register, 404).
 * If authenticated, provides a single link directly to the user's active workspace.
 * Strictly never leaks unassigned cross-portal links.
 */

import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "../ui/Button";
import { UserMenu } from "./UserMenu";

export const Header: React.FC = () => {
  const { isAuthenticated, user, activeRole, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const currentRole = activeRole || user?.roles[0] || "PATIENT";
  const activeWorkspaceUrl =
    currentRole === "ADMIN"
      ? "/admin"
      : currentRole === "DOCTOR"
        ? "/doctor"
        : "/app";

  const activeWorkspaceLabel =
    currentRole === "ADMIN"
      ? "Admin Console"
      : currentRole === "DOCTOR"
        ? "Doctor Workspace"
        : "Patient Portal";

  return (
    <header
      style={{
        height: "var(--header-height, 64px)",
        backgroundColor: "var(--color-bg-surface, #ffffff)",
        borderBottom: "1px solid var(--color-border-subtle, #e2e8f0)",
        position: "sticky",
        top: 0,
        zIndex: 50,
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
        {/* Brand */}
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
          }}
          aria-label="MANVIA Home"
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
              src="/manvia-original-logo.jpg"
              alt="MANVIA"
              style={{ width: 24, height: 24, objectFit: "contain" }}
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = "none";
                if (target.parentElement) {
                  target.parentElement.innerHTML =
                    '<span style="color:#0d9488;font-weight:800;font-size:16px;">M</span>';
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

        {/* Desktop Navigation */}
        <nav
          aria-label="Public Navigation"
          style={{
            display: "none",
            alignItems: "center",
            gap: "1.25rem",
          }}
          className="desktop-public-nav"
        >
          <Link
            to="/"
            style={{
              fontSize: "13px",
              fontWeight: location.pathname === "/" ? 600 : 500,
              color:
                location.pathname === "/"
                  ? "var(--manvia-primary-700, #0f766e)"
                  : "var(--color-text-secondary, #475569)",
              textDecoration: "none",
            }}
          >
            Home
          </Link>

          {isAuthenticated && (
            <Link
              to={activeWorkspaceUrl}
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--manvia-primary-700, #0f766e)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>{activeWorkspaceLabel}</span>
              <span>&rarr;</span>
            </Link>
          )}
        </nav>

        {/* User Identity / Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {isAuthenticated && user ? (
            <UserMenu role={currentRole} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Link to="/login" style={{ textDecoration: "none" }}>
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register" style={{ textDecoration: "none" }}>
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="mobile-public-menu-btn"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
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
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
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
            gap: "10px",
            zIndex: 50,
          }}
          role="navigation"
          aria-label="Mobile Navigation"
        >
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-md, 8px)",
              fontSize: "14px",
              color: "var(--color-text-primary, #0f172a)",
              textDecoration: "none",
            }}
          >
            Home
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to={activeWorkspaceUrl}
                onClick={() => setMobileOpen(false)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md, 8px)",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--manvia-primary-700, #0f766e)",
                  backgroundColor: "var(--manvia-primary-50, #f0fdfa)",
                  textDecoration: "none",
                }}
              >
                Go to {activeWorkspaceLabel} &rarr;
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  handleLogout();
                }}
                style={{
                  textAlign: "left",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md, 8px)",
                  fontSize: "14px",
                  color: "#e11d48",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md, 8px)",
                  fontSize: "14px",
                  color: "var(--color-text-primary, #0f172a)",
                  textDecoration: "none",
                }}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md, 8px)",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#ffffff",
                  backgroundColor: "var(--manvia-primary-600, #0d9488)",
                  textDecoration: "none",
                  textAlign: "center",
                }}
              >
                Create Account
              </Link>
            </>
          )}
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          .desktop-public-nav {
            display: flex !important;
          }
          .mobile-public-menu-btn {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
};
