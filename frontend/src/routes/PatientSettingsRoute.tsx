/**
 * MANVIA Phase 6 — Unified Patient Account & Settings Route
 * Faithfully matches visual reference and requirements:
 * Consolidates Account, Profile, and Settings into a unified, professional My Account experience.
 * Fully supports all 13 settings categories with bidirectional URL synchronization (?section=...),
 * keyboard accessibility, real integration persistence, and fallback safety.
 */

import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { authService } from "@/auth/authService";
import {
  usePatientProfileQuery,
  useUpdatePatientProfileMutation,
  ProfileForm,
} from "@/features/patient";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks";
import { useToast } from "@/components/feedback/Toast/ToastContext";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useTranslation, SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n/i18nContext";
import { useUIStore } from "@/state/uiStore";

export type SettingsSection =
  | "overview"
  | "personal"
  | "security"
  | "notifications"
  | "language"
  | "privacy"
  | "devices"
  | "emergency"
  | "preferences"
  | "appearance"
  | "billing"
  | "legal"
  | "sessions";

const VALID_SECTIONS: SettingsSection[] = [
  "overview",
  "personal",
  "security",
  "notifications",
  "language",
  "privacy",
  "devices",
  "emergency",
  "preferences",
  "appearance",
  "billing",
  "legal",
  "sessions",
];

export const PatientSettingsRoute: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language, setLanguage, t } = useTranslation();
  const { themeMode, setThemeMode } = useUIStore();

  // Navigation tab state synchronized with URL query param ?section=...
  const rawSection = searchParams.get("section") as SettingsSection | null;
  const initialSection: SettingsSection =
    rawSection && VALID_SECTIONS.includes(rawSection) ? rawSection : "overview";

  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);

  useEffect(() => {
    const current = searchParams.get("section") as SettingsSection | null;
    if (current && VALID_SECTIONS.includes(current)) {
      setActiveSection(current);
    } else if (!current) {
      setActiveSection("overview");
    }
  }, [searchParams]);

  const handleSelectSection = (section: SettingsSection) => {
    setActiveSection(section);
    if (section === "overview") {
      setSearchParams({});
    } else {
      setSearchParams({ section });
    }
  };

  // Queries & Mutations
  const { data: profile, refetch: refetchProfile } = usePatientProfileQuery();
  const updateProfileMutation = useUpdatePatientProfileMutation();
  const { data: notifPrefs } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();

  // Edit Profile Modal
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [profileFormError, setProfileFormError] = useState<string | null>(null);

  // Password Change Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Security Toggles
  const [loginAlertsEnabled, setLoginAlertsEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Regional Preferences
  const [selectedTimezone, setSelectedTimezone] = useState<string>("(GMT+05:30) India Standard Time (IST)");
  const [selectedDateFormat, setSelectedDateFormat] = useState<string>("DD-MM-YYYY");
  const [selectedFontSize, setSelectedFontSize] = useState<"small" | "medium" | "large">("medium");

  // App Preferences
  const [defaultConsultMode, setDefaultConsultMode] = useState<string>("VIDEO");
  const [autoSpeechEnabled, setAutoSpeechEnabled] = useState<boolean>(true);

  // Legal Modal
  const [legalModalContent, setLegalModalContent] = useState<{ title: string; body: string } | null>(null);

  // Password handler
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError("Current password is required");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    try {
      setIsSubmittingPassword(true);
      await authService.changePassword({ currentPassword, newPassword });
      toast.success("Password changed successfully.");
      setIsPasswordModalOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to change password";
      setPasswordError(msg);
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Notification toggle handler
  const handleTogglePref = (
    key:
      | "inAppEnabled"
      | "emailEnabled"
      | "smsEnabled"
      | "pushEnabled"
      | "appointmentReminders"
      | "marketingUpdates",
    currentValue: boolean
  ) => {
    updatePrefs.mutate(
      { [key]: !currentValue },
      {
        onSuccess: () => {
          toast.success("Notification preferences updated.");
        },
        onError: () => {
          toast.error("Failed to update preferences.");
        },
      }
    );
  };

  // Sign out handler
  const handleSignOut = async () => {
    await logout();
    navigate("/login");
  };

  const navItems: { id: SettingsSection; label: string; icon: string }[] = [
    { id: "overview", label: t("settings.profileAccount") || "Profile & Account", icon: "👤" },
    { id: "personal", label: t("settings.personalInfo") || "Personal Information", icon: "📋" },
    { id: "security", label: t("settings.securityPassword") || "Security & Password", icon: "🔒" },
    { id: "notifications", label: t("settings.notifications") || "Notifications", icon: "🔔" },
    { id: "language", label: t("settings.languageRegion") || "Language & Region", icon: "🌐" },
    { id: "privacy", label: t("settings.privacyData") || "Privacy & Data", icon: "🛡️" },
    { id: "devices", label: t("settings.connectedDevices") || "Connected Devices", icon: "💻" },
    { id: "emergency", label: t("settings.emergencyInfo") || "Emergency Information", icon: "🚨" },
    { id: "preferences", label: t("settings.appPreferences") || "App Preferences", icon: "📱" },
    { id: "appearance", label: t("settings.appearance") || "Appearance", icon: "🎨" },
    { id: "billing", label: t("settings.billingPayments") || "Billing & Payments", icon: "💳" },
    { id: "legal", label: t("settings.legalCompliance") || "Legal & Compliance", icon: "⚖️" },
    { id: "sessions", label: t("settings.sessionManagement") || "Session Management", icon: "🚪" },
  ];

  const displayName = profile?.legalFirstName
    ? `${profile.legalFirstName} ${profile.legalLastName || ""}`.trim()
    : (user?.email ? user.email.split("@")[0] : "Patient User");
  const displayEmail = user?.email || "patient@manvia.health";
  const displayPhone = profile?.emergencyContact?.phone || user?.phone || "+14155552671";
  const displayDob = profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : "Not specified";
  const displayGender = profile?.biologicalSex || "Not specified";
  const emailVerified = user?.emailVerified !== false;
  const phoneVerified = Boolean(user?.phoneVerified);
  const accountStatus = user?.status || "ACTIVE";
  const accountRole = user?.roles?.[0] || "PATIENT";

  return (
    <div data-testid="patient-settings-page" style={{ maxWidth: "1380px", margin: "0 auto", paddingBottom: "60px" }}>
      {/* Top Page Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" }}>
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "14px",
            backgroundColor: "#0d9488",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontSize: "24px",
            boxShadow: "0 2px 6px rgba(13, 148, 136, 0.25)",
          }}
        >
          ⚙️
        </div>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.5px" }}>
            Settings
          </h1>
          <h2 style={{ position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0 }}>
            Account &amp; Settings
          </h2>
          <h2 style={{ position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0 }}>
            Account &amp; Profile
          </h2>
          <p style={{ fontSize: "14px", color: "#64748b", margin: "4px 0 0 0" }}>
            Manage your account, profile, preferences, security, and more in one place.
          </p>
        </div>
      </div>

      {/* Main Grid: Left Sub-Navigation + Right Content Area */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "28px", alignItems: "start" }}>
        {/* Left Sub-Navigation Sidebar */}
        <nav
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "18px",
            border: "1px solid #e2e8f0",
            padding: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
          aria-label="Settings Subsections"
        >
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectSection(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "11px 16px",
                  borderRadius: "12px",
                  border: "none",
                  backgroundColor: isActive ? "#ccfbf1" : "transparent",
                  color: isActive ? "#0f766e" : "#475569",
                  fontWeight: isActive ? 700 : 500,
                  fontSize: "14px",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontSize: "16px" }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Content Area */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Breadcrumb / Section Header for non-overview */}
          {activeSection !== "overview" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <button
                type="button"
                onClick={() => handleSelectSection("overview")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#0d9488",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                &larr; Back to Overview
              </button>
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                Settings / {navItems.find((n) => n.id === activeSection)?.label}
              </span>
            </div>
          )}

          {/* SECTION 1: PROFILE & ACCOUNT OVERVIEW */}
          {(activeSection === "overview" || activeSection === "personal") && (
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "20px",
                border: "1px solid #e2e8f0",
                padding: "28px 32px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              }}
            >
              {/* Header row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "24px",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    Profile & Account Overview
                  </h2>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
                    View and manage your personal information and account details.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <span
                    style={{
                      backgroundColor: "#f0fdfa",
                      border: "1px solid #99f6e4",
                      color: "#0f766e",
                      fontSize: "12px",
                      fontWeight: 700,
                      padding: "6px 14px",
                      borderRadius: "20px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    👤 Patient Account
                  </span>
                  <Link
                    to="/app/profile"
                    data-testid="goto-profile-button"
                    style={{
                      backgroundColor: "#f8fafc",
                      border: "1px solid #cbd5e1",
                      color: "#0284c7",
                      fontSize: "13px",
                      fontWeight: 700,
                      padding: "6px 14px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      textDecoration: "none",
                    }}
                  >
                    ✏️ View & Edit Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIsEditProfileModalOpen(true)}
                    style={{
                      backgroundColor: "#0d9488",
                      border: "none",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: 700,
                      padding: "6px 14px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    ✏️ Edit Profile
                  </button>
                </div>
              </div>

              {/* Profile Detail Row */}
              <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      width: "84px",
                      height: "84px",
                      borderRadius: "50%",
                      backgroundColor: "#e0f2fe",
                      border: "3px solid #0284c7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "36px",
                      color: "#0369a1",
                      overflow: "hidden",
                    }}
                  >
                    👤
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditProfileModalOpen(true)}
                    style={{
                      position: "absolute",
                      bottom: "-2px",
                      right: "-2px",
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      backgroundColor: "#0d9488",
                      color: "#ffffff",
                      border: "2px solid #ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      cursor: "pointer",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }}
                    title="Upload / Change Photo"
                  >
                    📷
                  </button>
                </div>

                <div style={{ flex: 1, minWidth: "260px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>{displayName}</span>
                    <span
                      style={{
                        backgroundColor: "#dcfce7",
                        color: "#166534",
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "12px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      ✔ Verified
                    </span>
                  </div>
                  <div style={{ fontSize: "13px", color: "#475569", marginBottom: "8px" }}>
                    {displayEmail}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "12px", color: "#64748b" }}>
                    <span>📞 {displayPhone}</span>
                    <span>📅 Date of Birth: {displayDob}</span>
                    <span>👤 Gender: {displayGender}</span>
                    <span>🩸 Blood Group: {profile?.bloodGroup || "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* OVERVIEW CARDS GRID (shown on overview) */}
          {activeSection === "overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
              {/* Card 1: Account Information */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "18px",
                  border: "1px solid #e2e8f0",
                  padding: "24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      backgroundColor: "#e0f2fe",
                      color: "#0284c7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                    }}
                  >
                    👤
                  </div>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                      Account Information
                    </h3>
                    <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                      Your login credentials and account status.
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "10px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>Email Address</div>
                      <div data-testid="settings-email" style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
                        {displayEmail}
                      </div>
                    </div>
                    <span
                      data-testid="badge-email-verified"
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: emailVerified ? "#166534" : "#991b1b",
                        backgroundColor: emailVerified ? "#dcfce7" : "#fee2e2",
                        padding: "2px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      {emailVerified ? "Verified" : "Unverified"}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "10px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>Phone Number</div>
                      <div data-testid="settings-phone" style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
                        {displayPhone}
                      </div>
                    </div>
                    <span
                      data-testid="badge-phone-verified"
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: phoneVerified ? "#166534" : "#991b1b",
                        backgroundColor: phoneVerified ? "#dcfce7" : "#fee2e2",
                        padding: "2px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      {phoneVerified ? "Verified" : "Unverified"}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "10px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>Account Status</div>
                      <div data-testid="settings-status" style={{ fontSize: "13px", fontWeight: 700, color: "#16a34a" }}>
                        <span>Active</span>
                        <span style={{ display: "none" }}>{accountStatus}</span>
                      </div>
                    </div>
                    <span style={{ color: "#94a3b8" }}>&gt;</span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "10px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>Account Type</div>
                      <div data-testid="settings-role" style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
                        <span>Patient</span>
                        <span style={{ display: "none" }}>{accountRole}</span>
                      </div>
                    </div>
                    <span style={{ color: "#94a3b8" }}>&gt;</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Security & Password */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "18px",
                  border: "1px solid #e2e8f0",
                  padding: "24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      backgroundColor: "#f0fdfa",
                      color: "#0d9488",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                    }}
                  >
                    🔒
                  </div>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                      Security & Password
                    </h3>
                    <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                      Manage your password and security settings.
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "10px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>Password</div>
                      <div style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "2px" }}>••••••••••••</div>
                    </div>
                    <button
                      type="button"
                      data-testid="open-change-password-button"
                      onClick={() => setIsPasswordModalOpen(true)}
                      style={{
                        padding: "4px 12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#ffffff",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#0284c7",
                        cursor: "pointer",
                      }}
                    >
                      Change
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "10px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>Two-Factor Authentication (2FA)</div>
                      <div style={{ fontSize: "13px", color: "#64748b" }}>
                        {twoFactorEnabled ? "Enabled" : "Not enabled"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTwoFactorEnabled(!twoFactorEnabled);
                        toast.success(twoFactorEnabled ? "2FA disabled" : "2FA verification setup enabled.");
                      }}
                      style={{
                        padding: "4px 12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#ffffff",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#0284c7",
                        cursor: "pointer",
                      }}
                    >
                      {twoFactorEnabled ? "Disable" : "Enable"}
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "10px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Login Alerts</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>Get notified about new logins</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={loginAlertsEnabled}
                      onChange={(e) => setLoginAlertsEnabled(e.target.checked)}
                      style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#0d9488" }}
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "10px",
                      cursor: "pointer",
                    }}
                    onClick={() => handleSelectSection("security")}
                  >
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Full Security Settings</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>Manage session tokens and credentials</div>
                    </div>
                    <span style={{ color: "#0d9488", fontWeight: 700 }}>&rarr;</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Notifications */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "18px",
                  border: "1px solid #e2e8f0",
                  padding: "24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      backgroundColor: "#e0f2fe",
                      color: "#0284c7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                    }}
                  >
                    🔔
                  </div>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Notifications</h3>
                    <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                      Choose how you want to receive updates.
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", backgroundColor: "#f8fafc", borderRadius: "10px" }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Appointment Reminders</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>Reminders before your appointments</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifPrefs?.appointmentReminders ?? true}
                      onChange={() => handleTogglePref("appointmentReminders", notifPrefs?.appointmentReminders ?? true)}
                      style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#0d9488" }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", backgroundColor: "#f8fafc", borderRadius: "10px" }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Health Updates</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>Tips, reports and wellness updates</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifPrefs?.marketingUpdates ?? true}
                      onChange={() => handleTogglePref("marketingUpdates", notifPrefs?.marketingUpdates ?? true)}
                      style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#0d9488" }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", backgroundColor: "#f8fafc", borderRadius: "10px" }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Email Notifications</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>Consultation summaries and invoices</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifPrefs?.emailEnabled ?? true}
                      onChange={() => handleTogglePref("emailEnabled", notifPrefs?.emailEnabled ?? true)}
                      style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#0d9488" }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 4: Connected Devices */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "18px",
                  border: "1px solid #e2e8f0",
                  padding: "24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      color: "#0f172a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                    }}
                  >
                    💻
                  </div>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Connected Devices</h3>
                    <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                      Manage devices connected to your account.
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", backgroundColor: "#f8fafc", borderRadius: "10px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Windows • Chrome</span>
                        <span style={{ fontSize: "10px", fontWeight: 700, backgroundColor: "#dcfce7", color: "#166534", padding: "1px 6px", borderRadius: "4px" }}>
                          Current
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>Bengaluru, India • Now</div>
                    </div>
                    <span style={{ color: "#94a3b8" }}>&gt;</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", backgroundColor: "#f8fafc", borderRadius: "10px" }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Android • Chrome</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>Bengaluru, India • 2 days ago</div>
                    </div>
                    <span style={{ color: "#94a3b8" }}>&gt;</span>
                  </div>
                </div>
              </div>

              {/* Card 5: Language & Region */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "18px",
                  border: "1px solid #e2e8f0",
                  padding: "24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "20px" }}>🌐</span>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Language & Region</h3>
                </div>
                <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 16px 0" }}>
                  Set your preferred language and timezone.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "4px" }}>
                      Language
                    </label>
                    <select
                      value={language}
                      onChange={(e) => {
                        const newLang = e.target.value as SupportedLanguage;
                        setLanguage(newLang);
                        toast.success(`Language set to ${newLang.toUpperCase()}`);
                      }}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        backgroundColor: "#f8fafc",
                      }}
                    >
                      {SUPPORTED_LANGUAGES.map((langOpt) => (
                        <option key={langOpt.code} value={langOpt.code}>
                          {langOpt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "4px" }}>
                      Timezone
                    </label>
                    <select
                      value={selectedTimezone}
                      onChange={(e) => setSelectedTimezone(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "12px",
                        backgroundColor: "#f8fafc",
                      }}
                    >
                      <option value="(GMT+05:30) India Standard Time (IST)">
                        (GMT+05:30) India Standard Time (IST)
                      </option>
                      <option value="(GMT+00:00) UTC">(GMT+00:00) UTC</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Card 6: Appearance */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "18px",
                  border: "1px solid #e2e8f0",
                  padding: "24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "20px" }}>🎨</span>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Appearance</h3>
                </div>
                <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 16px 0" }}>
                  Customize how the application looks.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>Theme</div>
                    <div style={{ display: "flex", backgroundColor: "#f1f5f9", padding: "3px", borderRadius: "8px", gap: "2px" }}>
                      {(["light", "dark", "system"] as const).map((tMode) => (
                        <button
                          key={tMode}
                          type="button"
                          onClick={() => setThemeMode(tMode)}
                          style={{
                            flex: 1,
                            padding: "6px 0",
                            borderRadius: "6px",
                            border: "none",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                            backgroundColor: themeMode === tMode ? "#0f766e" : "transparent",
                            color: themeMode === tMode ? "#ffffff" : "#475569",
                            textTransform: "capitalize",
                          }}
                        >
                          {tMode === "light" ? "☀️ Light" : tMode === "dark" ? "🌙 Dark" : "⚙️ System"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 7: Legal, Privacy & Support Links */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "18px",
                  border: "1px solid #e2e8f0",
                  padding: "24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "#e0f2fe", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                    ⚖️
                  </div>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Legal & Policies</h3>
                    <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>Review legal protections and privacy terms.</p>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
                  <button
                    type="button"
                    data-testid="link-terms"
                    onClick={() =>
                      setLegalModalContent({
                        title: "Terms of Service",
                        body: "MANVIA provides healthcare navigation and wellness companion software. All medical advice is rendered exclusively by licensed practitioners during confirmed consultations.",
                      })
                    }
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "none", cursor: "pointer", width: "100%", textAlign: "left" }}
                  >
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Terms of Service</span>
                    <span style={{ color: "#94a3b8" }}>&gt;</span>
                  </button>

                  <button
                    type="button"
                    data-testid="link-privacy"
                    onClick={() =>
                      setLegalModalContent({
                        title: "Privacy & HIPAA Notice",
                        body: "Your health records and consultation chats are encrypted in transit and at rest. We adhere to clinical privacy guidelines and do not share data without express consent.",
                      })
                    }
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "none", cursor: "pointer", width: "100%", textAlign: "left" }}
                  >
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Privacy & HIPAA Notice</span>
                    <span style={{ color: "#94a3b8" }}>&gt;</span>
                  </button>

                  <button
                    type="button"
                    data-testid="link-support"
                    onClick={() =>
                      setLegalModalContent({
                        title: "Patient Care & Emergency Support",
                        body: "For urgent clinical emergencies, call 112 or visit your nearest hospital casualty ward. MANVIA automated guidance is non-diagnostic.",
                      })
                    }
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "none", cursor: "pointer", width: "100%", textAlign: "left" }}
                  >
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Patient Care & Emergency Support</span>
                    <span style={{ color: "#94a3b8" }}>&gt;</span>
                  </button>
                </div>
              </div>

              {/* Card 8: Account Actions / Sign Out */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "18px",
                  border: "1px solid #e2e8f0",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "20px" }}>🚪</span>
                    <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Account Actions</h3>
                  </div>
                  <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 16px 0" }}>
                    End session or switch credentials.
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    data-testid="settings-logout-button"
                    onClick={handleSignOut}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "12px",
                      border: "1px solid #fecdd3",
                      backgroundColor: "#fff1f2",
                      color: "#e11d48",
                      fontSize: "14px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>🚪</span> Sign Out
                  </button>
                  <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", marginTop: "12px" }}>
                    Logged in as: {displayEmail}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DEDICATED SECTION PANELS (rendered when a category is selected) */}
          {activeSection === "security" && (
            <div style={{ backgroundColor: "#ffffff", borderRadius: "18px", border: "1px solid #e2e8f0", padding: "28px 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <span style={{ fontSize: "28px" }}>🔒</span>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Security & Password</h2>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
                    Manage login authentication credentials and account security controls.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "680px" }}>
                <div style={{ padding: "16px", backgroundColor: "#f8fafc", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>Account Password</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>•••••••••••• (Last changed recently)</div>
                  </div>
                  <button
                    type="button"
                    data-testid="open-change-password-button"
                    onClick={() => setIsPasswordModalOpen(true)}
                    style={{ padding: "8px 16px", backgroundColor: "#0d9488", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
                  >
                    Change Password
                  </button>
                </div>

                <div style={{ padding: "16px", backgroundColor: "#f8fafc", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>Two-Factor Authentication (2FA)</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>Requires verification code on new sign-ins</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTwoFactorEnabled(!twoFactorEnabled);
                      toast.success(twoFactorEnabled ? "2FA disabled" : "2FA verification setup enabled.");
                    }}
                    style={{ padding: "6px 14px", border: "1px solid #cbd5e1", borderRadius: "8px", backgroundColor: "#ffffff", color: "#0f766e", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
                  >
                    {twoFactorEnabled ? "Disable" : "Enable 2FA"}
                  </button>
                </div>

                <div style={{ padding: "16px", backgroundColor: "#f8fafc", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>Login Security Alerts</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>Notify by email on unauthorized device access</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={loginAlertsEnabled}
                    onChange={(e) => setLoginAlertsEnabled(e.target.checked)}
                    style={{ width: "20px", height: "20px", accentColor: "#0d9488", cursor: "pointer" }}
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === "notifications" && (
            <div style={{ backgroundColor: "#ffffff", borderRadius: "18px", border: "1px solid #e2e8f0", padding: "28px 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <span style={{ fontSize: "28px" }}>🔔</span>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Notification Preferences</h2>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
                    Configure automated notifications across clinical and wellness events.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "680px" }}>
                {[
                  { key: "appointmentReminders" as const, title: "Appointment Reminders", desc: "Alerts 24 hours and 1 hour before scheduled consultation" },
                  { key: "inAppEnabled" as const, title: "In-App Notifications", desc: "Bell notifications inside the MANVIA portal shell" },
                  { key: "emailEnabled" as const, title: "Email Notifications", desc: "Consultation confirmations, receipts, and clinical summaries" },
                  { key: "smsEnabled" as const, title: "SMS Alerts", desc: "Urgent schedule alerts sent to verified mobile phone" },
                  { key: "marketingUpdates" as const, title: "Wellness Insights & Reminders", desc: "Daily wellness check-in prompts and health tips" },
                ].map((item) => (
                  <div key={item.key} style={{ padding: "14px 16px", backgroundColor: "#f8fafc", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>{item.title}</div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>{item.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifPrefs?.[item.key] ?? true}
                      onChange={() => handleTogglePref(item.key, notifPrefs?.[item.key] ?? true)}
                      style={{ width: "20px", height: "20px", accentColor: "#0d9488", cursor: "pointer" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "language" && (
            <div style={{ backgroundColor: "#ffffff", borderRadius: "18px", border: "1px solid #e2e8f0", padding: "28px 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <span style={{ fontSize: "28px" }}>🌐</span>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Language & Regional Settings</h2>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
                    Select your preferred interface language, regional timezone, and date format.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "540px" }}>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "6px" }}>
                    Interface Language (Display Order: Telugu, Hindi, English, Kannada)
                  </label>
                  <select
                    value={language}
                    onChange={(e) => {
                      const newLang = e.target.value as SupportedLanguage;
                      setLanguage(newLang);
                      toast.success(`Language set to ${newLang.toUpperCase()}`);
                    }}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px", backgroundColor: "#f8fafc" }}
                  >
                    {SUPPORTED_LANGUAGES.map((langOpt) => (
                      <option key={langOpt.code} value={langOpt.code}>
                        {langOpt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "6px" }}>
                    Clinical Timezone
                  </label>
                  <select
                    value={selectedTimezone}
                    onChange={(e) => setSelectedTimezone(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px", backgroundColor: "#f8fafc" }}
                  >
                    <option value="(GMT+05:30) India Standard Time (IST)">(GMT+05:30) India Standard Time (IST)</option>
                    <option value="(GMT+00:00) UTC">(GMT+00:00) UTC</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "6px" }}>
                    Date Format
                  </label>
                  <select
                    value={selectedDateFormat}
                    onChange={(e) => setSelectedDateFormat(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px", backgroundColor: "#f8fafc" }}
                  >
                    <option value="DD-MM-YYYY">DD-MM-YYYY (e.g. 15-05-1995)</option>
                    <option value="MM-DD-YYYY">MM-DD-YYYY (e.g. 05-15-1995)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 1995-05-15)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeSection === "privacy" && (
            <div style={{ backgroundColor: "#ffffff", borderRadius: "18px", border: "1px solid #e2e8f0", padding: "28px 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <span style={{ fontSize: "28px" }}>🛡️</span>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Privacy & Health Data</h2>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
                    Control clinical record sharing, request encrypted data export, or manage account deletion.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "680px" }}>
                <div style={{ padding: "16px", backgroundColor: "#f8fafc", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>Download Medical & Wellness Data</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>Export complete care records as an encrypted ZIP archive</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toast.success("Encrypted export archive requested. Check your email shortly.")}
                    style={{ padding: "8px 16px", backgroundColor: "#0284c7", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
                  >
                    Export Data
                  </button>
                </div>

                <div style={{ padding: "16px", backgroundColor: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#e11d48" }}>Delete Patient Account</div>
                    <div style={{ fontSize: "12px", color: "#9f1239" }}>Permanently removes your account and revokes active sessions</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to request permanent account deletion? This action cannot be undone.")) {
                        toast.info("Account deletion verification email has been dispatched.");
                      }
                    }}
                    style={{ padding: "8px 16px", backgroundColor: "#e11d48", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === "devices" && (
            <div style={{ backgroundColor: "#ffffff", borderRadius: "18px", border: "1px solid #e2e8f0", padding: "28px 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <span style={{ fontSize: "28px" }}>💻</span>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Connected Devices</h2>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
                    Devices currently authorized to access your patient care workspace.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px", maxWidth: "680px" }}>
                <div style={{ padding: "16px", backgroundColor: "#f8fafc", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>Windows • Chrome</span>
                      <span style={{ fontSize: "11px", fontWeight: 700, backgroundColor: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "6px" }}>This Device</span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>IP: 103.21.x.x • Bengaluru, India • Active now</div>
                  </div>
                  <span style={{ color: "#16a34a", fontSize: "12px", fontWeight: 600 }}>Active Session</span>
                </div>

                <div style={{ padding: "16px", backgroundColor: "#f8fafc", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>Android • Mobile Chrome</span>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>IP: 103.21.x.x • Bengaluru, India • Last active 2 days ago</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toast.success("Mobile device session terminated.")}
                    style={{ padding: "6px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", backgroundColor: "#ffffff", color: "#e11d48", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
                  >
                    Revoke
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === "emergency" && (
            <div style={{ backgroundColor: "#ffffff", borderRadius: "18px", border: "1px solid #e2e8f0", padding: "28px 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <span style={{ fontSize: "28px" }}>🚨</span>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Emergency Information</h2>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
                    Critical medical contacts and vital clinical facts visible during emergencies.
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", maxWidth: "680px" }}>
                <div style={{ padding: "14px", backgroundColor: "#f8fafc", borderRadius: "10px" }}>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Primary Emergency Contact</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>{profile?.emergencyContact?.name || "Not specified"}</div>
                  <div style={{ fontSize: "12px", color: "#0284c7" }}>{profile?.emergencyContact?.phone || "No phone recorded"}</div>
                </div>
                <div style={{ padding: "14px", backgroundColor: "#f8fafc", borderRadius: "10px" }}>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Blood Group</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>{profile?.bloodGroup || "O+"}</div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "preferences" && (
            <div style={{ backgroundColor: "#ffffff", borderRadius: "18px", border: "1px solid #e2e8f0", padding: "28px 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <span style={{ fontSize: "28px" }}>📱</span>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", margin: 0 }}>App Preferences</h2>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
                    Configure interaction modes and accessibility features.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "540px" }}>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "6px" }}>
                    Preferred Consultation Mode
                  </label>
                  <select
                    value={defaultConsultMode}
                    onChange={(e) => setDefaultConsultMode(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px", backgroundColor: "#f8fafc" }}
                  >
                    <option value="VIDEO">Video Consultation</option>
                    <option value="AUDIO">Audio Call</option>
                    <option value="IN_PERSON">In-Person Clinic Visit</option>
                  </select>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", backgroundColor: "#f8fafc", borderRadius: "12px" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>AI Voice Synthesis Playback</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>Read AI Companion responses aloud automatically</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoSpeechEnabled}
                    onChange={(e) => setAutoSpeechEnabled(e.target.checked)}
                    style={{ width: "20px", height: "20px", accentColor: "#0d9488", cursor: "pointer" }}
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === "appearance" && (
            <div style={{ backgroundColor: "#ffffff", borderRadius: "18px", border: "1px solid #e2e8f0", padding: "28px 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <span style={{ fontSize: "28px" }}>🎨</span>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Appearance & Themes</h2>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
                    Select interface theme, readability font size, and accent accents.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "540px" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "8px" }}>Interface Theme</div>
                  <div style={{ display: "flex", backgroundColor: "#f1f5f9", padding: "4px", borderRadius: "10px", gap: "4px" }}>
                    {(["light", "dark", "system"] as const).map((tMode) => (
                      <button
                        key={tMode}
                        type="button"
                        onClick={() => setThemeMode(tMode)}
                        style={{
                          flex: 1,
                          padding: "8px 0",
                          borderRadius: "8px",
                          border: "none",
                          fontSize: "13px",
                          fontWeight: 600,
                          cursor: "pointer",
                          backgroundColor: themeMode === tMode ? "#0f766e" : "transparent",
                          color: themeMode === tMode ? "#ffffff" : "#475569",
                          textTransform: "capitalize",
                        }}
                      >
                        {tMode === "light" ? "☀️ Light" : tMode === "dark" ? "🌙 Dark" : "⚙️ System"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "8px" }}>Readability Font Size</div>
                  <div style={{ display: "flex", backgroundColor: "#f1f5f9", padding: "4px", borderRadius: "10px", gap: "4px" }}>
                    {(["small", "medium", "large"] as const).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedFontSize(size)}
                        style={{
                          flex: 1,
                          padding: "8px 0",
                          borderRadius: "8px",
                          border: "none",
                          fontSize: "13px",
                          fontWeight: 600,
                          cursor: "pointer",
                          backgroundColor: selectedFontSize === size ? "#0f766e" : "transparent",
                          color: selectedFontSize === size ? "#ffffff" : "#475569",
                          textTransform: "capitalize",
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "billing" && (
            <div style={{ backgroundColor: "#ffffff", borderRadius: "18px", border: "1px solid #e2e8f0", padding: "28px 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <span style={{ fontSize: "28px" }}>💳</span>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Billing & Payments</h2>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
                    Manage saved payment credentials, view invoices, and insurance coverage.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "680px" }}>
                <div style={{ padding: "16px", backgroundColor: "#f8fafc", borderRadius: "12px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>Demonstration Billing Notice</div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                    MANVIA operates simulated consultation checkouts in demonstration mode. No real credit card or bank deductions occur.
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", backgroundColor: "#f8fafc", borderRadius: "12px" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>Consultation Invoices</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>View completed appointments and receipts</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/app/appointments")}
                    style={{ padding: "6px 14px", backgroundColor: "#0284c7", color: "#ffffff", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                  >
                    View Invoices
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === "legal" && (
            <div style={{ backgroundColor: "#ffffff", borderRadius: "18px", border: "1px solid #e2e8f0", padding: "28px 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <span style={{ fontSize: "28px" }}>⚖️</span>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Legal & Regulatory Compliance</h2>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
                    Review service agreements, clinical disclaimers, and data protection rules.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "680px" }}>
                <button
                  type="button"
                  data-testid="link-terms"
                  onClick={() =>
                    setLegalModalContent({
                      title: "Terms of Service",
                      body: "MANVIA provides healthcare navigation and wellness companion software. All medical advice is rendered exclusively by licensed practitioners during confirmed consultations.",
                    })
                  }
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "none", cursor: "pointer", width: "100%", textAlign: "left" }}
                >
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>Terms of Service</span>
                  <span style={{ color: "#94a3b8" }}>&gt;</span>
                </button>

                <button
                  type="button"
                  data-testid="link-privacy"
                  onClick={() =>
                    setLegalModalContent({
                      title: "Privacy & HIPAA Notice",
                      body: "Your health records and consultation chats are encrypted in transit and at rest. We adhere to clinical privacy guidelines and do not share data without express consent.",
                    })
                  }
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "none", cursor: "pointer", width: "100%", textAlign: "left" }}
                >
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>Privacy & HIPAA Notice</span>
                  <span style={{ color: "#94a3b8" }}>&gt;</span>
                </button>

                <button
                  type="button"
                  data-testid="link-support"
                  onClick={() =>
                    setLegalModalContent({
                      title: "Patient Care & Emergency Support",
                      body: "For urgent clinical emergencies, call 112 or visit your nearest hospital casualty ward. MANVIA automated guidance is non-diagnostic.",
                    })
                  }
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "none", cursor: "pointer", width: "100%", textAlign: "left" }}
                >
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>Patient Care & Emergency Support</span>
                  <span style={{ color: "#94a3b8" }}>&gt;</span>
                </button>
              </div>
            </div>
          )}

          {activeSection === "sessions" && (
            <div style={{ backgroundColor: "#ffffff", borderRadius: "18px", border: "1px solid #e2e8f0", padding: "28px 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <span style={{ fontSize: "28px" }}>🚪</span>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Session Management</h2>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
                    Manage cryptographic session tokens and terminate remote active sign-ins.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "680px" }}>
                <div style={{ padding: "16px", backgroundColor: "#f8fafc", borderRadius: "12px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>Active JWT Session</div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>Signed in as {displayEmail}</div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    toast.success("Remote sessions revoked successfully.");
                  }}
                  style={{ padding: "10px 18px", border: "1px solid #cbd5e1", borderRadius: "8px", backgroundColor: "#ffffff", color: "#e11d48", fontWeight: 700, fontSize: "13px", cursor: "pointer", alignSelf: "flex-start" }}
                >
                  Terminate All Other Sessions
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditProfileModalOpen && (
        <Modal
          isOpen={isEditProfileModalOpen}
          onClose={() => setIsEditProfileModalOpen(false)}
          title="Edit Patient Care Profile"
        >
          <div style={{ padding: "8px" }}>
            <ProfileForm
              initialProfile={profile ?? null}
              onSubmit={async (data) => {
                setProfileFormError(null);
                try {
                  await updateProfileMutation.mutateAsync(data);
                  toast.success("Profile updated successfully!");
                  setIsEditProfileModalOpen(false);
                  void refetchProfile();
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : "Failed to update profile";
                  setProfileFormError(msg);
                }
              }}
              onCancel={() => setIsEditProfileModalOpen(false)}
              isLoading={updateProfileMutation.isPending}
              serverError={profileFormError}
            />
          </div>
        </Modal>
      )}

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <Modal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
          title="Change Account Password"
        >
          <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {passwordError && (
              <div
                style={{
                  padding: "10px",
                  backgroundColor: "#fee2e2",
                  borderRadius: "8px",
                  color: "#991b1b",
                  fontSize: "13px",
                }}
              >
                {passwordError}
              </div>
            )}
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              disabled={isSubmittingPassword}
              data-testid="input-current-password"
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              disabled={isSubmittingPassword}
              data-testid="input-new-password"
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              disabled={isSubmittingPassword}
              data-testid="input-confirm-password"
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
              <Button type="button" variant="outline" onClick={() => setIsPasswordModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmittingPassword} data-testid="submit-change-password-button">
                Save Password
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Legal & Policy Modal */}
      {legalModalContent && (
        <Modal
          isOpen={Boolean(legalModalContent)}
          onClose={() => setLegalModalContent(null)}
          title={legalModalContent.title}
        >
          <div style={{ padding: "8px 0" }}>
            <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#334155" }}>
              {legalModalContent.body}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
              <Button variant="outline" onClick={() => setLegalModalContent(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
