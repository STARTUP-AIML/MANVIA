/**
 * MANVIA Patient Account & Settings Route
 * Comprehensive settings dashboard for authenticated patients:
 * - Account identity & verified contact status
 * - Profile shortcut
 * - Password change security workflow
 * - Preferences & notification policies
 * - Terms of Service, Privacy Policy, About, Support
 * - Session revocation / Sign out
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { authService } from "@/auth/authService";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/feedback/Toast/ToastContext";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks";

export const PatientSettingsRoute: React.FC = () => {
  const { user, activeRole, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // Password Change Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Policy / Terms / About Modals
  const [activeModal, setActiveModal] = useState<
    "terms" | "privacy" | "about" | "support" | null
  >(null);

  const { data: notifPrefs } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();

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
          toast.success("Notification preference updated.");
        },
        onError: () => {
          toast.error("Failed to update preference.");
        },
      }
    );
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

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

    setIsSubmittingPassword(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      toast.success("Password updated successfully!");
      setIsPasswordModalOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to change password";
      setPasswordError(msg);
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
        maxWidth: "960px",
        margin: "0 auto",
      }}
      data-testid="patient-settings-page"
    >
      {/* Header */}
      <div>
        <h1 className="heading-1" style={{ margin: 0 }}>
          Account & Settings
        </h1>
        <p
          className="body-regular"
          style={{
            color: "var(--color-text-secondary)",
            margin: "var(--space-1) 0 0 0",
          }}
        >
          Manage your login credentials, profile access, preferences, and
          compliance policies.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "var(--space-6)",
        }}
      >
        {/* Account Identity Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Primary security credentials and contact status.
            </CardDescription>
          </CardHeader>
          <CardContent
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            <div className="settings-field-row">
              <span className="settings-field-label">Email Address</span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                }}
              >
                <span
                  className="settings-field-value"
                  data-testid="settings-email"
                >
                  {user?.email || "—"}
                </span>
                <Badge
                  variant={user?.emailVerified ? "success" : "warning"}
                  data-testid="badge-email-verified"
                >
                  {user?.emailVerified ? "Verified" : "Unverified"}
                </Badge>
              </div>
            </div>

            <div className="settings-field-row">
              <span className="settings-field-label">Phone Number</span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                }}
              >
                <span
                  className="settings-field-value"
                  data-testid="settings-phone"
                >
                  {user?.phone || "Not provided"}
                </span>
                {user?.phone && (
                  <Badge
                    variant={user.phoneVerified ? "success" : "neutral"}
                    data-testid="badge-phone-verified"
                  >
                    {user.phoneVerified ? "Verified" : "Unverified"}
                  </Badge>
                )}
              </div>
            </div>

            <div className="settings-field-row">
              <span className="settings-field-label">Account Status</span>
              <Badge variant="success" data-testid="settings-status">
                {user?.status || "ACTIVE"}
              </Badge>
            </div>

            <div className="settings-field-row">
              <span className="settings-field-label">Active Role</span>
              <Badge variant="primary" data-testid="settings-role">
                {activeRole || "PATIENT"}
              </Badge>
            </div>

            <div
              style={{
                marginTop: "var(--space-2)",
                padding: "var(--space-3)",
                backgroundColor: "var(--manvia-slate-50)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-muted)",
                lineHeight: 1.5,
              }}
            >
              🔒 <strong>Security Policy:</strong> To update your primary email
              address or verified phone number, contact patient support or
              submit an identity verification request.
            </div>
          </CardContent>
        </Card>

        {/* Security & Password */}
        <Card>
          <CardHeader>
            <CardTitle>Security & Password</CardTitle>
            <CardDescription>
              Manage authentication credentials and session security.
            </CardDescription>
          </CardHeader>
          <CardContent
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            <p className="body-regular" style={{ margin: 0 }}>
              Ensure your account is protected with a strong password. Changing
              your password will invalidate existing sessions on other devices.
            </p>
            <div>
              <Button
                variant="outline"
                onClick={() => setIsPasswordModalOpen(true)}
                data-testid="open-change-password-button"
              >
                Change Password
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Patient Profile Shortcut */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Care Profile</CardTitle>
            <CardDescription>
              Clinical baseline, emergency contacts, and demographics.
            </CardDescription>
          </CardHeader>
          <CardContent
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            <p className="body-regular" style={{ margin: 0 }}>
              Your patient profile stores information required by healthcare
              providers during consultations.
            </p>
            <div>
              <Link to="/app/profile" style={{ textDecoration: "none" }}>
                <Button variant="primary" data-testid="goto-profile-button">
                  View & Edit Profile
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Notification & Communication Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications & Preferences</CardTitle>
            <CardDescription>
              Communication channels and system alerts.
            </CardDescription>
          </CardHeader>
          <CardContent
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            <div className="settings-field-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span className="settings-field-label" style={{ display: "block", fontWeight: 600 }}>Security Alerts</span>
                <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>Critical account and safety notifications</span>
              </div>
              <Badge variant="primary">Mandatory (Active)</Badge>
            </div>

            <div className="settings-field-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span className="settings-field-label" style={{ display: "block", fontWeight: 600 }}>In-App Notifications</span>
                <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>Alerts in your notification drawer</span>
              </div>
              <Button
                variant={notifPrefs?.inAppEnabled ?? true ? "secondary" : "outline"}
                size="sm"
                data-testid="toggle-in-app"
                onClick={() => handleTogglePref("inAppEnabled", notifPrefs?.inAppEnabled ?? true)}
              >
                {notifPrefs?.inAppEnabled ?? true ? "Enabled" : "Disabled"}
              </Button>
            </div>

            <div className="settings-field-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span className="settings-field-label" style={{ display: "block", fontWeight: 600 }}>Email Notifications</span>
                <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>Invoices, receipts, and consultation summaries</span>
              </div>
              <Button
                variant={notifPrefs?.emailEnabled ?? true ? "secondary" : "outline"}
                size="sm"
                data-testid="toggle-email"
                onClick={() => handleTogglePref("emailEnabled", notifPrefs?.emailEnabled ?? true)}
              >
                {notifPrefs?.emailEnabled ?? true ? "Enabled" : "Disabled"}
              </Button>
            </div>

            <div className="settings-field-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span className="settings-field-label" style={{ display: "block", fontWeight: 600 }}>SMS Notifications</span>
                <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>Urgent appointment updates and timing alerts</span>
              </div>
              <Button
                variant={notifPrefs?.smsEnabled ?? false ? "secondary" : "outline"}
                size="sm"
                data-testid="toggle-sms"
                onClick={() => handleTogglePref("smsEnabled", notifPrefs?.smsEnabled ?? false)}
              >
                {notifPrefs?.smsEnabled ?? false ? "Enabled" : "Disabled"}
              </Button>
            </div>

            <div className="settings-field-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span className="settings-field-label" style={{ display: "block", fontWeight: 600 }}>Appointment Reminders</span>
                <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>Reminders 24 hours and 1 hour before consult</span>
              </div>
              <Button
                variant={notifPrefs?.appointmentReminders ?? true ? "secondary" : "outline"}
                size="sm"
                data-testid="toggle-reminders"
                onClick={() => handleTogglePref("appointmentReminders", notifPrefs?.appointmentReminders ?? true)}
              >
                {notifPrefs?.appointmentReminders ?? true ? "Enabled" : "Disabled"}
              </Button>
            </div>

            <div className="settings-field-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span className="settings-field-label" style={{ display: "block", fontWeight: 600 }}>Platform Updates</span>
                <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>New wellness resources and care guides</span>
              </div>
              <Button
                variant={notifPrefs?.marketingUpdates ?? false ? "secondary" : "outline"}
                size="sm"
                data-testid="toggle-marketing"
                onClick={() => handleTogglePref("marketingUpdates", notifPrefs?.marketingUpdates ?? false)}
              >
                {notifPrefs?.marketingUpdates ?? false ? "Enabled" : "Disabled"}
              </Button>
            </div>
            <p
              className="body-secondary"
              style={{ margin: "var(--space-2) 0 0 0" }}
            >
              Timezone and language preferences can be configured directly in
              your{" "}
              <Link
                to="/app/profile"
                style={{
                  color: "var(--manvia-primary-700)",
                  fontWeight: 600,
                }}
              >
                Patient Profile
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        {/* Policies, Compliance & Legal */}
        <Card>
          <CardHeader>
            <CardTitle>Trust & Legal Information</CardTitle>
            <CardDescription>
              Review privacy terms, medical disclaimers, and platform standards.
            </CardDescription>
          </CardHeader>
          <CardContent
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
            }}
          >
            <Button
              variant="ghost"
              style={{ justifyContent: "flex-start", paddingLeft: 0 }}
              onClick={() => setActiveModal("terms")}
              data-testid="link-terms"
            >
              📄 Terms of Service
            </Button>
            <Button
              variant="ghost"
              style={{ justifyContent: "flex-start", paddingLeft: 0 }}
              onClick={() => setActiveModal("privacy")}
              data-testid="link-privacy"
            >
              🛡️ Privacy & HIPAA Notice
            </Button>
            <Button
              variant="ghost"
              style={{ justifyContent: "flex-start", paddingLeft: 0 }}
              onClick={() => setActiveModal("about")}
              data-testid="link-about"
            >
              ℹ️ About MANVIA
            </Button>
            <Button
              variant="ghost"
              style={{ justifyContent: "flex-start", paddingLeft: 0 }}
              onClick={() => setActiveModal("support")}
              data-testid="link-support"
            >
              🩺 Patient Care & Emergency Help
            </Button>
          </CardContent>
        </Card>

        {/* Session & Sign Out */}
        <Card>
          <CardHeader>
            <CardTitle>Session Management</CardTitle>
            <CardDescription>
              Terminate your authenticated session securely.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="body-regular" style={{ margin: 0 }}>
              Signing out revokes your current session and prevents unauthorized
              access to sensitive medical data on shared devices.
            </p>
          </CardContent>
          <CardFooter>
            <Button
              variant="danger"
              onClick={handleLogout}
              data-testid="settings-logout-button"
            >
              Sign Out of MANVIA
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Change Account Password"
        description="Enter your current password and choose a secure new password."
      >
        <form onSubmit={handlePasswordSubmit}>
          {passwordError && (
            <div
              role="alert"
              style={{
                marginBottom: "var(--space-4)",
                padding: "var(--space-3)",
                backgroundColor: "var(--manvia-danger-50)",
                border: "1px solid var(--manvia-danger-200)",
                borderRadius: "var(--radius-md)",
                color: "var(--manvia-danger-700)",
                fontSize: "var(--font-size-sm)",
              }}
            >
              {passwordError}
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            <Input
              label="Current Password"
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              data-testid="input-current-password"
            />

            <Input
              label="New Password"
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              helperText="Must be at least 8 characters long."
              required
              data-testid="input-new-password"
            />

            <Input
              label="Confirm New Password"
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              data-testid="input-confirm-password"
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "var(--space-3)",
              marginTop: "var(--space-6)",
            }}
          >
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsPasswordModalOpen(false)}
              disabled={isSubmittingPassword}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmittingPassword}
              disabled={isSubmittingPassword}
              data-testid="submit-change-password-button"
            >
              Update Password
            </Button>
          </div>
        </form>
      </Modal>

      {/* Terms of Service Modal */}
      <Modal
        isOpen={activeModal === "terms"}
        onClose={() => setActiveModal(null)}
        title="Terms of Service"
        description="Last updated: January 2026"
        footer={
          <Button variant="primary" onClick={() => setActiveModal(null)}>
            Close
          </Button>
        }
      >
        <div
          className="body-regular"
          style={{
            maxHeight: "360px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <p>
            Welcome to MANVIA (&ldquo;Care that feels human&rdquo;). By accessing or
            using our platform, you agree to comply with all applicable terms,
            medical disclaimers, and local healthcare regulations.
          </p>
          <p>
            MANVIA facilitates communication between patients and licensed
            medical professionals. MANVIA itself does not practice medicine and
            does not replace emergency medical interventions.
          </p>
        </div>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        isOpen={activeModal === "privacy"}
        onClose={() => setActiveModal(null)}
        title="Privacy & HIPAA Notice"
        description="Comprehensive healthcare data confidentiality."
        footer={
          <Button variant="primary" onClick={() => setActiveModal(null)}>
            Close
          </Button>
        }
      >
        <div
          className="body-regular"
          style={{
            maxHeight: "360px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <p>
            At MANVIA, your healthcare privacy is our highest priority. All
            Protected Health Information (PHI) is encrypted both in transit
            using TLS 1.3 and at rest using modern cryptographic standards.
          </p>
          <p>
            We strictly limit access to your records to yourself and verified
            clinical personnel with whom you have established an active care
            relationship or provided explicit consent.
          </p>
        </div>
      </Modal>

      {/* About MANVIA Modal */}
      <Modal
        isOpen={activeModal === "about"}
        onClose={() => setActiveModal(null)}
        title="About MANVIA"
        description="Care that feels human."
        footer={
          <Button variant="primary" onClick={() => setActiveModal(null)}>
            Close
          </Button>
        }
      >
        <div
          className="body-regular"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <p>
            <strong>MANVIA</strong> is an enterprise-grade digital health and
            wellness ecosystem engineered to simplify the continuum of care.
          </p>
          <p>
            Designed for patients, doctors, and healthcare administrators,
            MANVIA combines clinical precision with intuitive, calming digital
            experiences.
          </p>
          <p
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-muted)",
            }}
          >
            Version 0.1.0 • Built with modern healthcare standards.
          </p>
        </div>
      </Modal>

      {/* Emergency & Support Modal */}
      <Modal
        isOpen={activeModal === "support"}
        onClose={() => setActiveModal(null)}
        title="Patient Care & Emergency Support"
        description="Important clinical notices and escalation pathways."
        footer={
          <Button variant="primary" onClick={() => setActiveModal(null)}>
            Close
          </Button>
        }
      >
        <div
          className="body-regular"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <div
            style={{
              padding: "var(--space-3)",
              backgroundColor: "var(--manvia-danger-50)",
              border: "1px solid var(--manvia-danger-200)",
              borderRadius: "var(--radius-md)",
              color: "var(--manvia-danger-800)",
              fontWeight: 600,
            }}
          >
            🚨 Medical Emergency Notice: If you are experiencing a
            life-threatening medical emergency, please call 911 (or your local
            emergency number) immediately.
          </div>
          <p>
            For non-urgent technical questions or account assistance, contact
            the MANVIA Patient Operations team at{" "}
            <strong>support@manvia.health</strong>.
          </p>
        </div>
      </Modal>

      <style>{`
        .settings-field-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-2) 0;
          border-bottom: 1px solid var(--color-border-subtle);
        }
        .settings-field-row:last-child {
          border-bottom: none;
        }
        .settings-field-label {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
        }
        .settings-field-value {
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
          color: var(--color-text-primary);
        }
      `}</style>
    </div>
  );
};
