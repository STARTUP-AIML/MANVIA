/**
 * MANVIA Patient Profile View Component
 * Clean, accessible presentation of patient demographics, clinical baselines,
 * emergency contacts, and regional settings.
 */

import React from "react";
import type { PatientProfileResponseDto } from "../types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export interface ProfileViewProps {
  profile: PatientProfileResponseDto;
  onEdit: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  onEdit,
}) => {
  const fullName =
    [profile.legalFirstName, profile.legalLastName]
      .filter(Boolean)
      .join(" ")
      .trim() || "Unspecified Name";

  const formattedDob = profile.dateOfBirth
    ? new Date(profile.dateOfBirth).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      })
    : "Not specified";

  const formattedUpdated = profile.updatedAt
    ? new Date(profile.updatedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Recently";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
      }}
      data-testid="patient-profile-view"
    >
      {/* Profile Overview Card */}
      <Card>
        <CardContent
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "var(--space-4)",
            padding: "var(--space-6)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "var(--radius-full)",
                backgroundColor: "var(--manvia-primary-100)",
                color: "var(--manvia-primary-700)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.75rem",
                fontWeight: 700,
                border: "2px solid var(--manvia-primary-200)",
              }}
              aria-hidden="true"
            >
              {profile.legalFirstName
                ? profile.legalFirstName.charAt(0).toUpperCase()
                : "P"}
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  flexWrap: "wrap",
                }}
              >
                <h2
                  className="heading-2"
                  style={{ margin: 0 }}
                  data-testid="profile-full-name"
                >
                  {fullName}
                </h2>
                <Badge variant="primary" data-testid="profile-patient-id">
                  {profile.publicPatientId}
                </Badge>
              </div>
              <p
                className="body-secondary"
                style={{ margin: "var(--space-1) 0 0 0" }}
              >
                Last updated on {formattedUpdated}
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={onEdit}
            data-testid="edit-profile-button"
          >
            Edit Profile
          </Button>
        </CardContent>
      </Card>

      {/* Profile Details Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "var(--space-6)",
        }}
      >
        {/* Clinical & Demographic Baselines */}
        <Card>
          <CardHeader>
            <CardTitle>Demographic Details</CardTitle>
            <CardDescription>
              Clinical baseline and identification information.
            </CardDescription>
          </CardHeader>
          <CardContent
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            <div className="profile-field-row">
              <span className="profile-field-label">Legal First Name</span>
              <span
                className="profile-field-value"
                data-testid="profile-first-name"
              >
                {profile.legalFirstName || "—"}
              </span>
            </div>

            <div className="profile-field-row">
              <span className="profile-field-label">Legal Last Name</span>
              <span
                className="profile-field-value"
                data-testid="profile-last-name"
              >
                {profile.legalLastName || "—"}
              </span>
            </div>

            <div className="profile-field-row">
              <span className="profile-field-label">Date of Birth</span>
              <span className="profile-field-value" data-testid="profile-dob">
                {formattedDob}
              </span>
            </div>

            <div className="profile-field-row">
              <span className="profile-field-label">Biological Sex</span>
              <span
                className="profile-field-value"
                data-testid="profile-biological-sex"
              >
                {profile.biologicalSex || "Unspecified"}
              </span>
            </div>

            <div className="profile-field-row">
              <span className="profile-field-label">Blood Group</span>
              <span
                className="profile-field-value"
                data-testid="profile-blood-group"
              >
                {profile.bloodGroup ? (
                  <Badge variant="neutral">{profile.bloodGroup}</Badge>
                ) : (
                  "—"
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
            <CardDescription>
              Designated contact in the event of an urgent clinical situation.
            </CardDescription>
          </CardHeader>
          <CardContent
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            {profile.emergencyContact &&
            (profile.emergencyContact.name ||
              profile.emergencyContact.phone ||
              profile.emergencyContact.relationship) ? (
              <>
                <div className="profile-field-row">
                  <span className="profile-field-label">Contact Name</span>
                  <span
                    className="profile-field-value"
                    data-testid="emergency-contact-name"
                  >
                    {profile.emergencyContact.name || "—"}
                  </span>
                </div>

                <div className="profile-field-row">
                  <span className="profile-field-label">Contact Phone</span>
                  <span
                    className="profile-field-value"
                    data-testid="emergency-contact-phone"
                  >
                    {profile.emergencyContact.phone || "—"}
                  </span>
                </div>

                <div className="profile-field-row">
                  <span className="profile-field-label">Relationship</span>
                  <span
                    className="profile-field-value"
                    data-testid="emergency-contact-relationship"
                  >
                    {profile.emergencyContact.relationship || "—"}
                  </span>
                </div>
              </>
            ) : (
              <div
                style={{
                  padding: "var(--space-4)",
                  backgroundColor: "var(--manvia-slate-50)",
                  borderRadius: "var(--radius-md)",
                  border: "1px dashed var(--manvia-slate-300)",
                  textAlign: "center",
                  color: "var(--color-text-muted)",
                }}
              >
                <p className="body-regular" style={{ margin: 0 }}>
                  No emergency contact designated.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                  style={{ marginTop: "var(--space-2)" }}
                >
                  Add Emergency Contact
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preferences & Locale */}
        <Card>
          <CardHeader>
            <CardTitle>Interface & Locale</CardTitle>
            <CardDescription>
              Preferred communication language and local timezone.
            </CardDescription>
          </CardHeader>
          <CardContent
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            <div className="profile-field-row">
              <span className="profile-field-label">Preferred Language</span>
              <span
                className="profile-field-value"
                data-testid="profile-language"
              >
                <Badge variant="neutral">{profile.preferredLanguage}</Badge>
              </span>
            </div>

            <div className="profile-field-row">
              <span className="profile-field-label">Timezone</span>
              <span
                className="profile-field-value"
                data-testid="profile-timezone"
              >
                {profile.timezone}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <style>{`
        .profile-field-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-2) 0;
          border-bottom: 1px solid var(--color-border-subtle);
        }
        .profile-field-row:last-child {
          border-bottom: none;
        }
        .profile-field-label {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
        }
        .profile-field-value {
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
          color: var(--color-text-primary);
        }
      `}</style>
    </div>
  );
};
