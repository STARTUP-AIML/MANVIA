/**
 * MANVIA Sidebar Primitive with Role-Aware User Footer
 */

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useUIStore } from "@/state/uiStore";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "../ui/Button";

export interface NavLinkItem {
  label: string;
  href: string;
  icon?: string;
  badge?: string;
}

export interface SidebarProps {
  title: string;
  items: NavLinkItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ title, items }) => {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <aside
      aria-label={title}
      style={{
        width: sidebarCollapsed ? 72 : "var(--sidebar-width)",
        backgroundColor: "var(--color-bg-surface)",
        borderRight: "1px solid var(--color-border-subtle)",
        display: "flex",
        flexDirection: "column",
        transition: "width var(--transition-normal)",
        flexShrink: 0,
        height: "calc(100vh - var(--header-height))",
        position: "sticky",
        top: "var(--header-height)",
      }}
    >
      {/* Sidebar Header */}
      <div
        style={{
          padding: "1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: sidebarCollapsed ? "center" : "space-between",
          borderBottom: "1px solid var(--color-border-subtle)",
        }}
      >
        {!sidebarCollapsed && (
          <h2
            style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: 600,
              color: "var(--color-text-secondary)",
            }}
          >
            {title}
          </h2>
        )}
        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text-muted)",
          }}
        >
          {sidebarCollapsed ? "→" : "←"}
        </button>
      </div>

      {/* Nav List */}
      <nav
        style={{
          padding: "0.75rem 0.5rem",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
        }}
      >
        {items.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              title={sidebarCollapsed ? item.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.625rem 0.75rem",
                borderRadius: "var(--radius-md)",
                textDecoration: "none",
                color: isActive
                  ? "var(--manvia-primary-800)"
                  : "var(--color-text-secondary)",
                backgroundColor: isActive
                  ? "var(--manvia-primary-50)"
                  : "transparent",
                fontWeight: isActive ? 600 : 500,
                fontSize: "var(--font-size-sm)",
                justifyContent: sidebarCollapsed ? "center" : "flex-start",
              }}
            >
              <span>{item.icon || "📁"}</span>
              {!sidebarCollapsed && <span>{item.label}</span>}
              {!sidebarCollapsed && item.badge && (
                <span
                  style={{
                    marginLeft: "auto",
                    backgroundColor: "var(--manvia-primary-100)",
                    color: "var(--manvia-primary-800)",
                    fontSize: "var(--font-size-xs)",
                    padding: "2px 6px",
                    borderRadius: "var(--radius-full)",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer with Active User Session */}
      {user && (
        <div
          style={{
            padding: "0.75rem",
            borderTop: "1px solid var(--color-border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          {!sidebarCollapsed && (
            <div
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={user.email}
            >
              Logged in as:{" "}
              <strong style={{ color: "var(--color-text-primary)" }}>
                {user.email}
              </strong>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout()}
            style={{
              width: "100%",
              justifyContent: sidebarCollapsed ? "center" : "flex-start",
            }}
            title="Sign Out"
          >
            <span>🚪</span>
            {!sidebarCollapsed && <span>Sign Out</span>}
          </Button>
        </div>
      )}
    </aside>
  );
};
