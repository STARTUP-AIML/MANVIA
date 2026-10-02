/**
 * MANVIA Responsive Application Header
 * Role-aware navigation with user identity and secure sign out.
 */

import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useUIStore } from "@/state/uiStore";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

export const Header: React.FC = () => {
  const { mobileNavOpen, toggleMobileNav } = useUIStore();
  const { isAuthenticated, user, activeRole, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = [
    { label: "Overview", href: "/" },
    { label: "Patient Portal", href: "/app" },
    { label: "Doctor Portal", href: "/doctor" },
    { label: "Admin Console", href: "/admin" },
    { label: "Dev Health", href: "/dev-health" },
  ];

  return (
    <header
      style={{
        height: "var(--header-height)",
        backgroundColor: "var(--color-bg-surface)",
        borderBottom: "1px solid var(--color-border-subtle)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        className="manvia-container"
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Brand */}
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            textDecoration: "none",
          }}
          aria-label="MANVIA Home"
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--manvia-primary-600)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "1.25rem",
            }}
          >
            M
          </div>
          <div>
            <div
              style={{
                fontSize: "1.125rem",
                fontWeight: 700,
                color: "var(--color-text-primary)",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              MANVIA
            </div>
            <div
              style={{
                fontSize: "0.6875rem",
                color: "var(--color-text-muted)",
                lineHeight: 1,
              }}
            >
              Care made simpler.
            </div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav
          aria-label="Main Navigation"
          style={{
            display: "none",
            alignItems: "center",
            gap: "1.5rem",
          }}
          className="desktop-nav"
        >
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                style={{
                  fontSize: "var(--font-size-sm)",
                  fontWeight: isActive ? 600 : 500,
                  color: isActive
                    ? "var(--manvia-primary-700)"
                    : "var(--color-text-secondary)",
                  borderBottom: isActive
                    ? "2px solid var(--manvia-primary-600)"
                    : "2px solid transparent",
                  padding: "0.5rem 0",
                  transition: "all var(--transition-fast)",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Auth / Profile Area & Mobile Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {isAuthenticated && user ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
              className="desktop-nav"
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--font-size-xs)",
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                  }}
                  data-testid="user-email"
                >
                  {user.email}
                </span>
                <Badge variant="primary">{activeRole || "USER"}</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                data-testid="logout-button"
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <div
              style={{ display: "flex", gap: "0.5rem" }}
              className="desktop-nav"
            >
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

          {/* Mobile Menu Toggle */}
          <button
            onClick={toggleMobileNav}
            aria-expanded={mobileNavOpen}
            aria-label="Toggle navigation menu"
            style={{
              display: "inline-flex",
              padding: "0.5rem",
              backgroundColor: "transparent",
              border: "1px solid var(--color-border-subtle)",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
            }}
            className="mobile-menu-btn"
          >
            {mobileNavOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileNavOpen && (
        <div
          role="navigation"
          aria-label="Mobile Navigation"
          style={{
            backgroundColor: "var(--color-bg-surface)",
            borderBottom: "1px solid var(--color-border-subtle)",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => toggleMobileNav()}
              style={{
                padding: "0.5rem",
                fontSize: "var(--font-size-base)",
                color:
                  location.pathname === item.href
                    ? "var(--manvia-primary-700)"
                    : "var(--color-text-primary)",
                fontWeight: location.pathname === item.href ? 600 : 400,
              }}
            >
              {item.label}
            </Link>
          ))}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              paddingTop: "0.5rem",
              borderTop: "1px solid var(--color-border-subtle)",
            }}
          >
            {isAuthenticated && user ? (
              <>
                <div
                  style={{
                    padding: "0.5rem 0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "var(--font-size-sm)" }}>
                    {user.email}
                  </span>
                  <Badge variant="primary">{activeRole || "USER"}</Badge>
                </div>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    toggleMobileNav();
                    handleLogout();
                  }}
                  style={{ width: "100%" }}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Link
                  to="/login"
                  onClick={() => toggleMobileNav()}
                  style={{ flex: 1, textDecoration: "none" }}
                >
                  <Button
                    variant="secondary"
                    size="md"
                    style={{ width: "100%" }}
                  >
                    Sign In
                  </Button>
                </Link>
                <Link
                  to="/register"
                  onClick={() => toggleMobileNav()}
                  style={{ flex: 1, textDecoration: "none" }}
                >
                  <Button variant="primary" size="md" style={{ width: "100%" }}>
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
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
