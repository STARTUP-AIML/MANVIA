/**
 * MANVIA Patient Profile Form Component
 * Form for initializing or updating a patient profile.
 * Strictly enforces backend DTO validation constraints.
 */

import React, { useState } from "react";
import type {
  BiologicalSex,
  CreatePatientProfileDto,
  PatientProfileResponseDto,
  UpdatePatientProfileDto,
} from "../types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export interface ProfileFormProps {
  initialProfile?: PatientProfileResponseDto | null;
  onSubmit: (
    data: CreatePatientProfileDto | UpdatePatientProfileDto,
  ) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  serverError?: string | null;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({
  initialProfile,
  onSubmit,
  onCancel,
  isLoading = false,
  serverError = null,
}) => {
  const isEditing = Boolean(initialProfile);

  // Form State
  const [legalFirstName, setLegalFirstName] = useState(
    initialProfile?.legalFirstName ?? "",
  );
  const [legalLastName, setLegalLastName] = useState(
    initialProfile?.legalLastName ?? "",
  );
  const [dateOfBirth, setDateOfBirth] = useState(
    initialProfile?.dateOfBirth ?? "",
  );
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex | "">(
    initialProfile?.biologicalSex ?? "",
  );
  const [bloodGroup, setBloodGroup] = useState(
    initialProfile?.bloodGroup ?? "",
  );

  // Emergency Contact State
  const [emergencyName, setEmergencyName] = useState(
    initialProfile?.emergencyContact?.name ?? "",
  );
  const [emergencyPhone, setEmergencyPhone] = useState(
    initialProfile?.emergencyContact?.phone ?? "",
  );
  const [emergencyRelationship, setEmergencyRelationship] = useState(
    initialProfile?.emergencyContact?.relationship ?? "",
  );

  // Preferences State
  const [preferredLanguage, setPreferredLanguage] = useState(
    initialProfile?.preferredLanguage ?? "en",
  );
  const [timezone, setTimezone] = useState(
    initialProfile?.timezone ??
      (Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"),
  );

  // Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (legalFirstName.length > 100) {
      newErrors.legalFirstName =
        "Legal first name cannot exceed 100 characters";
    }

    if (legalLastName.length > 100) {
      newErrors.legalLastName = "Legal last name cannot exceed 100 characters";
    }

    if (dateOfBirth) {
      const parsedDate = new Date(dateOfBirth);
      if (isNaN(parsedDate.getTime())) {
        newErrors.dateOfBirth = "Date of birth must be a valid date";
      } else if (parsedDate > new Date()) {
        newErrors.dateOfBirth = "Date of birth cannot be in the future";
      }
    }

    if (bloodGroup.length > 10) {
      newErrors.bloodGroup = "Blood group cannot exceed 10 characters";
    }

    if (emergencyName.length > 150) {
      newErrors.emergencyName =
        "Emergency contact name cannot exceed 150 characters";
    }

    if (emergencyPhone.length > 32) {
      newErrors.emergencyPhone =
        "Emergency contact phone cannot exceed 32 characters";
    }

    if (emergencyRelationship.length > 50) {
      newErrors.emergencyRelationship =
        "Emergency contact relationship cannot exceed 50 characters";
    }

    if (preferredLanguage.length > 10) {
      newErrors.preferredLanguage = "Language code cannot exceed 10 characters";
    }

    if (timezone.length > 64) {
      newErrors.timezone = "Timezone cannot exceed 64 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: UpdatePatientProfileDto = {
      legalFirstName: legalFirstName.trim() || undefined,
      legalLastName: legalLastName.trim() || undefined,
      dateOfBirth: dateOfBirth.trim() || undefined,
      biologicalSex: biologicalSex
        ? (biologicalSex as BiologicalSex)
        : undefined,
      bloodGroup: bloodGroup.trim() || undefined,
      preferredLanguage: preferredLanguage.trim() || undefined,
      timezone: timezone.trim() || undefined,
    };

    if (
      emergencyName.trim() ||
      emergencyPhone.trim() ||
      emergencyRelationship.trim()
    ) {
      payload.emergencyContact = {
        name: emergencyName.trim() || undefined,
        phone: emergencyPhone.trim() || undefined,
        relationship: emergencyRelationship.trim() || undefined,
      };
    }

    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} noValidate data-testid="patient-profile-form">
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing ? "Edit Patient Profile" : "Complete Your Profile"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "Update your demographic information and personal preferences."
              : "Please provide your details to establish your clinical care baseline."}
          </CardDescription>
        </CardHeader>

        <CardContent
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-6)",
          }}
        >
          {serverError && (
            <div
              role="alert"
              style={{
                padding: "var(--space-3) var(--space-4)",
                backgroundColor: "var(--manvia-danger-50)",
                border: "1px solid var(--manvia-danger-200)",
                borderRadius: "var(--radius-md)",
                color: "var(--manvia-danger-700)",
                fontSize: "var(--font-size-sm)",
              }}
            >
              <strong>Error: </strong>
              {serverError}
            </div>
          )}

          {/* Section 1: Demographics */}
          <div>
            <h3
              className="heading-3"
              style={{
                marginBottom: "var(--space-4)",
                borderBottom: "1px solid var(--color-border-subtle)",
                paddingBottom: "var(--space-2)",
              }}
            >
              1. Demographics & Identification
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "var(--space-4)",
              }}
            >
              <Input
                label="Legal First Name"
                id="legalFirstName"
                name="legalFirstName"
                value={legalFirstName}
                onChange={(e) => setLegalFirstName(e.target.value)}
                errorText={errors.legalFirstName}
                placeholder="e.g. Priya"
                maxLength={100}
                data-testid="input-first-name"
              />

              <Input
                label="Legal Last Name"
                id="legalLastName"
                name="legalLastName"
                value={legalLastName}
                onChange={(e) => setLegalLastName(e.target.value)}
                errorText={errors.legalLastName}
                placeholder="e.g. Sharma"
                maxLength={100}
                data-testid="input-last-name"
              />

              <Input
                label="Date of Birth"
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                errorText={errors.dateOfBirth}
                data-testid="input-dob"
              />

              <div className="manvia-input-group">
                <label htmlFor="biologicalSex" className="manvia-label">
                  Biological Sex
                </label>
                <div className="manvia-input-wrapper">
                  <select
                    id="biologicalSex"
                    name="biologicalSex"
                    value={biologicalSex}
                    onChange={(e) =>
                      setBiologicalSex(e.target.value as BiologicalSex | "")
                    }
                    className="manvia-input"
                    data-testid="select-biological-sex"
                  >
                    <option value="">Unspecified</option>
                    <option value="FEMALE">Female</option>
                    <option value="MALE">Male</option>
                    <option value="INTERSEX">Intersex</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <span className="manvia-helper-text">
                  Used exclusively for clinical reference standards.
                </span>
              </div>

              <div className="manvia-input-group">
                <label htmlFor="bloodGroup" className="manvia-label">
                  Blood Group
                </label>
                <div className="manvia-input-wrapper">
                  <select
                    id="bloodGroup"
                    name="bloodGroup"
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="manvia-input"
                    data-testid="select-blood-group"
                  >
                    <option value="">Unspecified</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Emergency Contact */}
          <div>
            <h3
              className="heading-3"
              style={{
                marginBottom: "var(--space-4)",
                borderBottom: "1px solid var(--color-border-subtle)",
                paddingBottom: "var(--space-2)",
              }}
            >
              2. Emergency Contact Information
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "var(--space-4)",
              }}
            >
              <Input
                label="Contact Full Name"
                id="emergencyName"
                name="emergencyName"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                errorText={errors.emergencyName}
                placeholder="e.g. Anil Sharma"
                maxLength={150}
                data-testid="input-emergency-name"
              />

              <Input
                label="Contact Phone Number"
                id="emergencyPhone"
                name="emergencyPhone"
                type="tel"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                errorText={errors.emergencyPhone}
                placeholder="e.g. +14155552671"
                maxLength={32}
                data-testid="input-emergency-phone"
              />

              <Input
                label="Relationship to Patient"
                id="emergencyRelationship"
                name="emergencyRelationship"
                value={emergencyRelationship}
                onChange={(e) => setEmergencyRelationship(e.target.value)}
                errorText={errors.emergencyRelationship}
                placeholder="e.g. SPOUSE, PARENT, SIBLING"
                maxLength={50}
                data-testid="input-emergency-relationship"
              />
            </div>
          </div>

          {/* Section 3: Interface & Locale */}
          <div>
            <h3
              className="heading-3"
              style={{
                marginBottom: "var(--space-4)",
                borderBottom: "1px solid var(--color-border-subtle)",
                paddingBottom: "var(--space-2)",
              }}
            >
              3. Interface & Locale Preferences
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "var(--space-4)",
              }}
            >
              <div className="manvia-input-group">
                <label htmlFor="preferredLanguage" className="manvia-label">
                  Preferred Language
                </label>
                <div className="manvia-input-wrapper">
                  <select
                    id="preferredLanguage"
                    name="preferredLanguage"
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="manvia-input"
                    data-testid="select-preferred-language"
                  >
                    <option value="en">English (en)</option>
                    <option value="es">Spanish (es)</option>
                    <option value="hi">Hindi (hi)</option>
                    <option value="fr">French (fr)</option>
                    <option value="de">German (de)</option>
                  </select>
                </div>
              </div>

              <Input
                label="Timezone (IANA)"
                id="timezone"
                name="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                errorText={errors.timezone}
                placeholder="e.g. Asia/Kolkata, UTC"
                maxLength={64}
                data-testid="input-timezone"
              />
            </div>
          </div>
        </CardContent>

        <CardFooter
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "var(--space-3)",
            padding: "var(--space-6)",
            borderTop: "1px solid var(--color-border-subtle)",
          }}
        >
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="cancel-profile-button"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            disabled={isLoading}
            data-testid="save-profile-button"
          >
            {isEditing ? "Save Changes" : "Create Profile"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};
