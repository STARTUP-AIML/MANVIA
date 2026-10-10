import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Logo } from "./AppHeader";

export const LandingHeader: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const { user, isAuthenticated, activeRole, logout } = useAuth();
  const navigate = useNavigate();

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

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      // Active section indicator based on viewport offset
      const sections = ["home", "about", "capabilities", "journey", "services"];
      const scrollPos = window.scrollY + 120;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header
      className={`header ${isScrolled ? "header-scrolled" : ""}`}
      role="banner"
      style={{
        transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        height: isScrolled ? "60px" : "68px",
        background: isScrolled
          ? "rgba(255, 255, 255, 0.94)"
          : "rgba(255, 255, 255, 0.98)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: isScrolled
          ? "1px solid rgba(204, 235, 232, 0.8)"
          : "1px solid #edf4fa",
        boxShadow: isScrolled
          ? "0 4px 20px rgba(14, 124, 115, 0.05)"
          : "none",
        fontFamily: "'Figtree', sans-serif",
      }}
    >
      <Logo />

      <button
        className="mobile-menu"
        onClick={() => setOpen(!open)}
        aria-label="Open navigation menu"
        type="button"
      >
        ☰
      </button>

      <nav className={`nav ${open ? "open" : ""}`} aria-label="Main Navigation">
        <a
          href="#home"
          onClick={() => setOpen(false)}
          className={activeSection === "home" ? "active" : ""}
        >
          Home
        </a>
        <a
          href="#about"
          onClick={() => setOpen(false)}
          className={activeSection === "about" ? "active" : ""}
        >
          Ecosystem
        </a>
        <a
          href="#capabilities"
          onClick={() => setOpen(false)}
          className={activeSection === "capabilities" ? "active" : ""}
        >
          Capabilities
        </a>
        <a
          href="#journey"
          onClick={() => setOpen(false)}
          className={activeSection === "journey" ? "active" : ""}
        >
          Care Journey
        </a>
        <a
          href="#services"
          onClick={() => setOpen(false)}
          className={activeSection === "services" ? "active" : ""}
        >
          Services
        </a>
        {isAuthenticated && (
          <Link
            to={activeWorkspaceUrl}
            onClick={() => setOpen(false)}
            style={{ color: "#0E7C73", fontWeight: 700 }}
          >
            {activeWorkspaceLabel}
          </Link>
        )}
      </nav>

      <div className="header-actions">
        {isAuthenticated ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#0E7C73",
                background: "#f0fdfa",
                padding: "4px 10px",
                borderRadius: "12px",
                border: "1px solid #ccfbf1",
              }}
            >
              {user?.email || "Patient"}
            </span>
            <button
              type="button"
              className="primary small"
              onClick={() => navigate(activeWorkspaceUrl)}
            >
              Open Workspace <span>→</span>
            </button>
            <button
              type="button"
              className="outline"
              style={{ padding: "7px 14px", fontSize: "11px" }}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="login"
              onClick={() => navigate("/login")}
            >
              Sign In
            </button>
            <button
              type="button"
              className="primary small"
              onClick={() => navigate("/register")}
            >
              Get Started <span>→</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
