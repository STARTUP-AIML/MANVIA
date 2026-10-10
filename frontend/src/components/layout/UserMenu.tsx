/**
 * MANVIA User Menu Component
 * Accessible role-aware user identity and actions menu.
 * Respects activeRole boundary — never leaks cross-role portal links.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import type { Role } from "@/auth/types";
import { Badge } from "../ui/Badge";

export interface UserMenuProps {
  role?: Role;
}

export const UserMenu: React.FC<UserMenuProps> = ({ role }) => {
  const { user, activeRole, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const currentRole = role || activeRole || user?.roles[0] || "PATIENT";

  // Close dropdown on click outside or Escape key
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClickOutside, handleKeyDown]);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate("/login");
  };

  if (!user) {
    return null;
  }

  const initial = user.email ? user.email.charAt(0).toUpperCase() : "U";

  // Role-specific navigation items
  const renderMenuItems = () => {
    if (currentRole === "PATIENT") {
      return (
        <>
          <Link
            to="/app/profile"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="user-menu-item"
            style={menuItemStyle}
          >
            <span style={{ fontSize: "1rem" }}>📋</span>
            <div>
              <div style={menuItemTitleStyle}>My Profile</div>
              <div style={menuItemDescStyle}>Personal &amp; clinical details</div>
            </div>
          </Link>
          <Link
            to="/app/settings"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="user-menu-item"
            style={menuItemStyle}
          >
            <span style={{ fontSize: "1rem" }}>⚙️</span>
            <div>
              <div style={menuItemTitleStyle}>Settings &amp; Privacy</div>
              <div style={menuItemDescStyle}>Security, password &amp; notifications</div>
            </div>
          </Link>
          <Link
            to="/app/account"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="user-menu-item"
            style={menuItemStyle}
          >
            <span style={{ fontSize: "1rem" }}>👤</span>
            <div>
              <div style={menuItemTitleStyle}>Account Overview</div>
              <div style={menuItemDescStyle}>Credentials &amp; patient identifier</div>
            </div>
          </Link>
        </>
      );
    }

    if (currentRole === "DOCTOR") {
      return (
        <>
          <Link
            to="/doctor/profile"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="user-menu-item"
            style={menuItemStyle}
          >
            <span style={{ fontSize: "1rem" }}>👤</span>
            <div>
              <div style={menuItemTitleStyle}>Practitioner Profile</div>
              <div style={menuItemDescStyle}>Credentials, council &amp; fees</div>
            </div>
          </Link>
          <Link
            to="/doctor/availability"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="user-menu-item"
            style={menuItemStyle}
          >
            <span style={{ fontSize: "1rem" }}>⏱️</span>
            <div>
              <div style={menuItemTitleStyle}>Availability Schedule</div>
              <div style={menuItemDescStyle}>Weekly consultation slots</div>
            </div>
          </Link>
          <Link
            to="/doctor/verification"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="user-menu-item"
            style={menuItemStyle}
          >
            <span style={{ fontSize: "1rem" }}>🛡️</span>
            <div>
              <div style={menuItemTitleStyle}>Verification Status</div>
              <div style={menuItemDescStyle}>Medical licenses &amp; documents</div>
            </div>
          </Link>
          <Link
            to="/doctor/settings"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="user-menu-item"
            style={menuItemStyle}
          >
            <span style={{ fontSize: "1rem" }}>⚙️</span>
            <div>
              <div style={menuItemTitleStyle}>Clinical Settings</div>
              <div style={menuItemDescStyle}>Practice preferences</div>
            </div>
          </Link>
        </>
      );
    }

    // ADMIN
    return (
      <>
        <Link
          to="/admin"
          role="menuitem"
          onClick={() => setIsOpen(false)}
          className="user-menu-item"
          style={menuItemStyle}
        >
          <span style={{ fontSize: "1rem" }}>📈</span>
          <div>
            <div style={menuItemTitleStyle}>Platform Metrics</div>
            <div style={menuItemDescStyle}>Platform &amp; revenue overview</div>
          </div>
        </Link>
        <Link
          to="/admin/platform-health"
          role="menuitem"
          onClick={() => setIsOpen(false)}
          className="user-menu-item"
          style={menuItemStyle}
        >
          <span style={{ fontSize: "1rem" }}>⚙️</span>
          <div>
            <div style={menuItemTitleStyle}>Platform Health</div>
            <div style={menuItemDescStyle}>Gateway &amp; system diagnostics</div>
          </div>
        </Link>
        <Link
          to="/admin/doctor-verification"
          role="menuitem"
          onClick={() => setIsOpen(false)}
          className="user-menu-item"
          style={menuItemStyle}
        >
          <span style={{ fontSize: "1rem" }}>🛡️</span>
          <div>
            <div style={menuItemTitleStyle}>Doctor Verification</div>
            <div style={menuItemDescStyle}>Vetting &amp; credential review</div>
          </div>
        </Link>
        <Link
          to="/admin/audit"
          role="menuitem"
          onClick={() => setIsOpen(false)}
          className="user-menu-item"
          style={menuItemStyle}
        >
          <span style={{ fontSize: "1rem" }}>📜</span>
          <div>
            <div style={menuItemTitleStyle}>Audit Trail</div>
            <div style={menuItemDescStyle}>Immutable security event log</div>
          </div>
        </Link>
      </>
    );
  };

  const roleBadgeVariant =
    currentRole === "ADMIN"
      ? "warning"
      : currentRole === "DOCTOR"
        ? "info"
        : "primary";

  const roleLabel =
    currentRole === "ADMIN"
      ? "Administrator"
      : currentRole === "DOCTOR"
        ? "Physician"
        : "Patient";

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="User account menu"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "none",
          border: "1px solid var(--color-border-subtle, #e2e8f0)",
          borderRadius: "var(--radius-full, 9999px)",
          padding: "4px 10px 4px 4px",
          cursor: "pointer",
          transition: "all var(--transition-fast, 150ms)",
        }}
      >
        <div
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            backgroundColor: "var(--manvia-primary-600, #0d9488)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "13px",
            letterSpacing: "0.5px",
          }}
        >
          {initial}
        </div>
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--color-text-secondary, #334155)",
            maxWidth: "140px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {user.email}
        </span>
        <span
          style={{
            fontSize: "10px",
            color: "var(--color-text-muted, #94a3b8)",
            transform: isOpen ? "rotate(180deg)" : "none",
            transition: "transform 150ms ease",
          }}
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="User options"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: "260px",
            backgroundColor: "var(--color-bg-surface, #ffffff)",
            border: "1px solid var(--color-border-subtle, #e2e8f0)",
            borderRadius: "var(--radius-lg, 12px)",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            zIndex: 100,
            overflow: "hidden",
            animation: "fadeIn 120ms ease-out",
          }}
        >
          {/* Identity Header */}
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "var(--manvia-slate-50, #f8fafc)",
              borderBottom: "1px solid var(--color-border-subtle, #e2e8f0)",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--color-text-primary, #0f172a)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={user.email}
            >
              {user.email}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: "4px",
              }}
            >
              <Badge variant={roleBadgeVariant}>
                {roleLabel}
              </Badge>
              <span style={{ fontSize: "11px", color: "var(--color-text-muted, #64748b)" }}>
                Active Session
              </span>
            </div>
          </div>

          {/* Links */}
          <div style={{ padding: "6px 0" }}>{renderMenuItems()}</div>

          {/* Sign Out Action */}
          <div
            style={{
              padding: "8px 12px",
              borderTop: "1px solid var(--color-border-subtle, #e2e8f0)",
              backgroundColor: "var(--manvia-slate-50, #f8fafc)",
            }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "var(--radius-md, 8px)",
                border: "1px solid #fecdd3",
                backgroundColor: "#fff1f2",
                color: "#e11d48",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background-color 150ms ease",
              }}
            >
              <span>🚪</span> Sign Out of MANVIA
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const menuItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "8px 16px",
  textDecoration: "none",
  color: "var(--color-text-primary, #0f172a)",
  fontSize: "13px",
  transition: "background-color 100ms ease",
};

const menuItemTitleStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: "12.5px",
  color: "var(--color-text-primary, #0f172a)",
};

const menuItemDescStyle: React.CSSProperties = {
  fontSize: "10.5px",
  color: "var(--color-text-muted, #64748b)",
};
