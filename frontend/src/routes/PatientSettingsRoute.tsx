/**
 * MANVIA Phase 6 — Unified Patient Account & Settings Route
 * Faithfully matches visual reference screenshot (media_1791651382306.jpg)
 * Consolidates Account, Profile, and Settings into a unified, professional My Account experience.
 */

import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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

type SettingsSection =
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

export const PatientSettingsRoute: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Navigation tab state
  const sectionParam = searchParams.get("section") as SettingsSection | null;
  const [activeSection, setActiveSection] = useState<SettingsSection>(
    sectionParam || "overview"
  );

  useEffect(() => {
    if (sectionParam) {
      setActiveSection(sectionParam);
    }
  }, [sectionParam]);

  const handleSelectSection = (section: SettingsSection) => {
    setActiveSection(section);
    setSearchParams(section === "overview" ? {} : { section });
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

  // 2FA / Login Alerts mock toggles
  const [loginAlertsEnabled, setLoginAlertsEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Appearance & Language State
  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark" | "system">("system");
  const [selectedFontSize, setSelectedFontSize] = useState<"small" | "medium" | "large">("medium");
  const [selectedColor, setSelectedColor] = useState<string>("teal");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("English");
  const [selectedTimezone, setSelectedTimezone] = useState<string>("(GMT+05:30) India Standard Time (IST)");
  const [selectedDateFormat, setSelectedDateFormat] = useState<string>("DD-MM-YYYY");

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

  const navItems = [
    { id: "overview" as const, label: "Profile & Account", icon: "👤" },
    { id: "personal" as const, label: "Personal Information", icon: "📋" },
    { id: "security" as const, label: "Security & Password", icon: "🔒" },
    { id: "notifications" as const, label: "Notifications", icon: "🔔" },
    { id: "language" as const, label: "Language & Region", icon: "🌐" },
    { id: "privacy" as const, label: "Privacy & Data", icon: "🛡️" },
    { id: "devices" as const, label: "Connected Devices", icon: "💻" },
    { id: "emergency" as const, label: "Emergency Information", icon: "🚨" },
    { id: "preferences" as const, label: "App Preferences", icon: "📱" },
    { id: "appearance" as const, label: "Appearance", icon: "🎨" },
    { id: "billing" as const, label: "Billing & Payments", icon: "💳" },
    { id: "legal" as const, label: "Legal & Compliance", icon: "⚖️" },
    { id: "sessions" as const, label: "Session Management", icon: "🚪" },
  ];

  const displayName = profile?.legalFirstName
    ? `${profile.legalFirstName} ${profile.legalLastName || ""}`.trim()
    : "Patient User";
  const displayEmail = user?.email || "babu2005@gmail.com";
  const displayPhone = profile?.emergencyContact?.phone || user?.phone || "+91 7890654723";
  const displayDob = profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : "Not specified";
  const displayGender = profile?.biologicalSex || "Not specified";

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
          <p style={{ fontSize: "14px", color: "#64748b", margin: "4px 0 0 0" }}>
            Manage your account, profile, preferences, security, and more in one place.
          </p>
        </div>
      </div>

      {/* Main Grid: Left Nav + Right Content */}
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
          {/* Top Hero: Profile & Account Overview */}
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
                <button
                  type="button"
                  onClick={() => setIsEditProfileModalOpen(true)}
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
                  }}
                >
                  ✏️ Edit Profile
                </button>
              </div>
            </div>

            {/* Profile Detail Row */}
            <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
              {/* Avatar with Camera badge */}
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

              {/* Bio info */}
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
                <div style={{ fontSize: "13px", color: "#475569", marginBottom: "8px" }}>{displayEmail}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "12px", color: "#64748b" }}>
                  <span>📞 {displayPhone}</span>
                  <span>📅 Date of Birth: {displayDob}</span>
                  <span>👤 Gender: {displayGender}</span>
                  <span>🩸 Blood Group: {profile?.bloodGroup || "—"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cards Grid: 2 Columns */}
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
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>{displayEmail}</div>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#166534",
                      backgroundColor: "#dcfce7",
                      padding: "2px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    Verified
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
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>{displayPhone}</div>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#166534",
                      backgroundColor: "#dcfce7",
                      padding: "2px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    Verified
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
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#16a34a" }}>Active</div>
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
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Patient</div>
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
                  onClick={() => handleSelectSection("sessions")}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Active Sessions</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Manage your active devices</div>
                  </div>
                  <span style={{ color: "#94a3b8" }}>&gt;</span>
                </div>
              </div>
            </div>

            {/* Card 3: Personal & Health Information */}
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
                  📋
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    Personal & Health Information
                  </h3>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                    Manage your personal and health details.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
                <div
                  onClick={() => setIsEditProfileModalOpen(true)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "10px",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Personal Details</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Name, DOB, gender, blood group, etc.</div>
                  </div>
                  <span style={{ color: "#94a3b8" }}>&gt;</span>
                </div>

                <div
                  onClick={() => setIsEditProfileModalOpen(true)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "10px",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Emergency Contact</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      {profile?.emergencyContact?.name
                        ? `${profile.emergencyContact.name} (${profile.emergencyContact.phone || "No phone"})`
                        : "Add emergency contact information"}
                    </div>
                  </div>
                  <span style={{ color: "#94a3b8" }}>&gt;</span>
                </div>

                <div
                  onClick={() => navigate("/app/health-records")}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "10px",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Medical Information</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Allergies, conditions, medications</div>
                  </div>
                  <span style={{ color: "#94a3b8" }}>&gt;</span>
                </div>

                <div
                  onClick={() => navigate("/app/wellness")}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "10px",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Health Preferences</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Your care and wellness preferences</div>
                  </div>
                  <span style={{ color: "#94a3b8" }}>&gt;</span>
                </div>
              </div>
            </div>

            {/* Card 4: Notifications */}
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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "10px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Appointment Reminders</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Reminders before your appointments</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPrefs?.appointmentReminders ?? true}
                    onChange={() =>
                      handleTogglePref("appointmentReminders", notifPrefs?.appointmentReminders ?? true)
                    }
                    style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#0d9488" }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "10px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Health Updates</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Tips, reports and wellness updates</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPrefs?.marketingUpdates ?? true}
                    onChange={() =>
                      handleTogglePref("marketingUpdates", notifPrefs?.marketingUpdates ?? true)
                    }
                    style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#0d9488" }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "10px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>System Notifications</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Important account and security alerts</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPrefs?.inAppEnabled ?? true}
                    onChange={() => handleTogglePref("inAppEnabled", notifPrefs?.inAppEnabled ?? true)}
                    style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#0d9488" }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "10px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Email Notifications</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      Invoices, receipts and consultation summaries
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPrefs?.emailEnabled ?? true}
                    onChange={() => handleTogglePref("emailEnabled", notifPrefs?.emailEnabled ?? true)}
                    style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#0d9488" }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "10px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>SMS Notifications</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Urgent updates and reminders</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPrefs?.smsEnabled ?? false}
                    onChange={() => handleTogglePref("smsEnabled", notifPrefs?.smsEnabled ?? false)}
                    style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#0d9488" }}
                  />
                </div>
              </div>
            </div>

            {/* Card 5: Connected Devices */}
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
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Windows • Chrome</span>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          backgroundColor: "#dcfce7",
                          color: "#166534",
                          padding: "1px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        Current
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Bengaluru, India • Now</div>
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
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Android • Chrome</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Bengaluru, India • 2 days ago</div>
                  </div>
                  <span style={{ color: "#94a3b8" }}>&gt;</span>
                </div>

                <div style={{ textAlign: "center", marginTop: "4px" }}>
                  <button
                    type="button"
                    onClick={() => toast.info("Displaying active active session tokens.")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#0284c7",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    View All Devices
                  </button>
                </div>
              </div>
            </div>

            {/* Card 6: Privacy & Data */}
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
                  🛡️
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Privacy & Data</h3>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                    Manage your data and privacy settings.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
                <div
                  onClick={() => navigate("/app/health-records?tab=consents")}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "10px",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Data Sharing Preferences</span>
                  <span style={{ color: "#94a3b8" }}>&gt;</span>
                </div>

                <div
                  onClick={() => toast.success("Data export initiated. An encrypted ZIP link will be sent.")}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "10px",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Download My Data</span>
                  <span style={{ color: "#94a3b8" }}>&gt;</span>
                </div>

                <div
                  onClick={() => toast.info("Account deletion requires identity verification.")}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    backgroundColor: "#fff1f2",
                    borderRadius: "10px",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#e11d48" }}>🗑️ Delete My Account</span>
                  <span style={{ color: "#e11d48" }}>&gt;</span>
                </div>
              </div>
            </div>

            {/* Card 7: Billing & Payments */}
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
                  💳
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Billing & Payments</h3>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                    Manage your payment methods and invoices.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
                <div
                  onClick={() => toast.info("UPI / Card billing details will be requested upon doctor checkout.")}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "10px",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Payment Methods</span>
                  <span style={{ color: "#94a3b8" }}>&gt;</span>
                </div>

                <div
                  onClick={() => navigate("/app/appointments")}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "10px",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Billing History</span>
                  <span style={{ color: "#94a3b8" }}>&gt;</span>
                </div>

                <div
                  onClick={() => toast.info("Insurance claims integration available for partnered TPA networks.")}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "10px",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Insurance Details</span>
                  <span style={{ color: "#94a3b8" }}>&gt;</span>
                </div>
              </div>
            </div>

            {/* Card 8: Legal & Compliance */}
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
                  ⚖️
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    Legal & Compliance
                  </h3>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>View important legal information.</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
                <div
                  onClick={() =>
                    setLegalModalContent({
                      title: "Terms of Service",
                      body: "MANVIA provides healthcare navigation and wellness companion software. All medical advice is rendered exclusively by licensed practitioners during confirmed consultations.",
                    })
                  }
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "10px",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Terms of Service</span>
                  <span style={{ color: "#94a3b8" }}>&gt;</span>
                </div>

                <div
                  onClick={() =>
                    setLegalModalContent({
                      title: "Privacy Policy",
                      body: "Your health records and consultation chats are encrypted in transit and at rest. We adhere to clinical privacy guidelines and do not share data without express consent.",
                    })
                  }
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "10px",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Privacy Policy</span>
                  <span style={{ color: "#94a3b8" }}>&gt;</span>
                </div>

                <div
                  onClick={() =>
                    setLegalModalContent({
                      title: "HIPAA & Data Security",
                      body: "Role-based access control, cryptographic session revocation, and immutable audit trails protect clinical integrity and patient privacy.",
                    })
                  }
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "10px",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>HIPAA & Data Security</span>
                  <span style={{ color: "#94a3b8" }}>&gt;</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom 3 Cards Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
            {/* Card 9: Language & Region */}
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
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <option value="English">English</option>
                    <option value="Hindi">हिंदी (Hindi)</option>
                    <option value="Kannada">ಕನ್ನಡ (Kannada)</option>
                    <option value="Telugu">తెలుగు (Telugu)</option>
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

                <div>
                  <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "4px" }}>
                    Date Format
                  </label>
                  <select
                    value={selectedDateFormat}
                    onChange={(e) => setSelectedDateFormat(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                    <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Card 10: Appearance */}
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
                {/* Theme Selector */}
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>Theme</div>
                  <div
                    style={{
                      display: "flex",
                      backgroundColor: "#f1f5f9",
                      padding: "3px",
                      borderRadius: "8px",
                      gap: "2px",
                    }}
                  >
                    {(["light", "dark", "system"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTheme(t)}
                        style={{
                          flex: 1,
                          padding: "6px 0",
                          borderRadius: "6px",
                          border: "none",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          backgroundColor: selectedTheme === t ? "#0f766e" : "transparent",
                          color: selectedTheme === t ? "#ffffff" : "#475569",
                          textTransform: "capitalize",
                        }}
                      >
                        {t === "light" ? "☀️ Light" : t === "dark" ? "🌙 Dark" : "⚙️ System"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size Selector */}
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>Font Size</div>
                  <div
                    style={{
                      display: "flex",
                      backgroundColor: "#f1f5f9",
                      padding: "3px",
                      borderRadius: "8px",
                      gap: "2px",
                    }}
                  >
                    {(["small", "medium", "large"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedFontSize(s)}
                        style={{
                          flex: 1,
                          padding: "6px 0",
                          borderRadius: "6px",
                          border: "none",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          backgroundColor: selectedFontSize === s ? "#0f766e" : "transparent",
                          color: selectedFontSize === s ? "#ffffff" : "#475569",
                          textTransform: "capitalize",
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Swatches */}
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>Color Theme</div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    {[
                      { id: "teal", color: "#0d9488" },
                      { id: "blue", color: "#0284c7" },
                      { id: "indigo", color: "#6366f1" },
                      { id: "amber", color: "#f59e0b" },
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedColor(c.id)}
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          backgroundColor: c.color,
                          border: selectedColor === c.id ? "3px solid #0f172a" : "2px solid transparent",
                          cursor: "pointer",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 11: Account Actions */}
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
                  Last login: 10 Oct 2026, 9:37 PM • Windows Chrome
                </div>
              </div>
            </div>
          </div>
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
          title="Change Security Password"
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
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              disabled={isSubmittingPassword}
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              disabled={isSubmittingPassword}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
              <Button type="button" variant="outline" onClick={() => setIsPasswordModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmittingPassword}>
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
              <Button variant="primary" onClick={() => setLegalModalContent(null)}>
                Understood
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
