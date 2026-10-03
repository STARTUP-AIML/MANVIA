/**
 * MANVIA Patient Profile Page Route
 * Accessible, responsive patient profile management.
 * Handles view state, edit state, 404 initialization state, loading skeletons,
 * and server error handling with retry capability.
 */

import React, { useState } from "react";
import {
  usePatientProfileQuery,
  useCreatePatientProfileMutation,
  useUpdatePatientProfileMutation,
  ProfileView,
  ProfileForm,
  type CreatePatientProfileDto,
  type UpdatePatientProfileDto,
} from "@/features/patient";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/feedback/Toast/ToastContext";

export const PatientProfileRoute: React.FC = () => {
  const { data: profile, isLoading, error, refetch } = usePatientProfileQuery();
  const createMutation = useCreatePatientProfileMutation();
  const updateMutation = useUpdatePatientProfileMutation();
  const toast = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Check if profile is not found (404) -> prompt creation
  const isProfileNotFound = error?.statusCode === 404;

  const handleCreate = async (data: CreatePatientProfileDto) => {
    setFormError(null);
    try {
      await createMutation.mutateAsync(data);
      toast.success("Patient profile created successfully!");
      setIsEditing(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create profile";
      setFormError(message);
    }
  };

  const handleUpdate = async (data: UpdatePatientProfileDto) => {
    setFormError(null);
    try {
      await updateMutation.mutateAsync(data);
      toast.success("Profile changes saved successfully!");
      setIsEditing(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update profile";
      setFormError(message);
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
      data-testid="patient-profile-page"
    >
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-3)",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <h1 className="heading-1" style={{ margin: 0 }}>
              Patient Profile
            </h1>
            <Badge variant="primary">Self-Service</Badge>
          </div>
          <p
            className="body-regular"
            style={{
              color: "var(--color-text-secondary)",
              margin: "var(--space-1) 0 0 0",
            }}
          >
            Manage your personal healthcare identification, clinical baselines,
            and emergency contacts.
          </p>
        </div>
      </div>

      {/* Loading Skeleton State */}
      {isLoading && (
        <div
          data-testid="profile-loading-skeleton"
          aria-busy="true"
          aria-label="Loading patient profile..."
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          <Card>
            <CardContent
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-4)",
                padding: "var(--space-6)",
              }}
            >
              <Skeleton width="64px" height="64px" variant="circular" />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                  flex: 1,
                }}
              >
                <Skeleton width="40%" height="28px" />
                <Skeleton width="25%" height="16px" />
              </div>
            </CardContent>
          </Card>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "var(--space-4)",
            }}
          >
            <Card>
              <CardContent style={{ padding: "var(--space-6)" }}>
                <Skeleton
                  width="60%"
                  height="24px"
                  style={{ marginBottom: "1rem" }}
                />
                <Skeleton
                  width="100%"
                  height="18px"
                  style={{ marginBottom: "0.5rem" }}
                />
                <Skeleton
                  width="90%"
                  height="18px"
                  style={{ marginBottom: "0.5rem" }}
                />
                <Skeleton width="75%" height="18px" />
              </CardContent>
            </Card>
            <Card>
              <CardContent style={{ padding: "var(--space-6)" }}>
                <Skeleton
                  width="60%"
                  height="24px"
                  style={{ marginBottom: "1rem" }}
                />
                <Skeleton
                  width="100%"
                  height="18px"
                  style={{ marginBottom: "0.5rem" }}
                />
                <Skeleton
                  width="85%"
                  height="18px"
                  style={{ marginBottom: "0.5rem" }}
                />
                <Skeleton width="70%" height="18px" />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Error State (Non-404) */}
      {!isLoading && error && !isProfileNotFound && (
        <Card data-testid="profile-error-card">
          <CardContent
            style={{
              padding: "var(--space-6)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "var(--space-4)",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "var(--radius-full)",
                backgroundColor: "var(--manvia-danger-50)",
                color: "var(--manvia-danger-600)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
              }}
              aria-hidden="true"
            >
              ⚠️
            </div>
            <div>
              <h2 className="heading-3">Unable to Load Patient Profile</h2>
              <p
                className="body-regular"
                style={{
                  color: "var(--color-text-secondary)",
                  maxWidth: "480px",
                  margin: "var(--space-2) auto 0",
                }}
              >
                {error.message ||
                  "A network or server error occurred while retrieving your profile."}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => refetch()}
              data-testid="profile-retry-button"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 404 Initial Setup State */}
      {!isLoading && isProfileNotFound && (
        <div data-testid="profile-onboarding-section">
          <div
            style={{
              padding: "var(--space-4)",
              backgroundColor: "var(--manvia-primary-50)",
              border: "1px solid var(--manvia-primary-200)",
              borderRadius: "var(--radius-md)",
              marginBottom: "var(--space-4)",
            }}
          >
            <h2
              className="heading-3"
              style={{ color: "var(--manvia-primary-900)", margin: 0 }}
            >
              Welcome to MANVIA Care
            </h2>
            <p
              className="body-regular"
              style={{
                color: "var(--manvia-primary-700)",
                margin: "var(--space-1) 0 0 0",
              }}
            >
              Your user account is active, but your clinical care profile has
              not been initialized yet. Complete the form below to set up your
              demographic baseline and emergency contact.
            </p>
          </div>

          <ProfileForm
            initialProfile={null}
            onSubmit={handleCreate}
            onCancel={() => {}}
            isLoading={createMutation.isPending}
            serverError={formError}
          />
        </div>
      )}

      {/* Normal Profile Flow: View or Edit */}
      {!isLoading && profile && !isProfileNotFound && (
        <>
          {isEditing ? (
            <ProfileForm
              initialProfile={profile}
              onSubmit={handleUpdate}
              onCancel={() => {
                setIsEditing(false);
                setFormError(null);
              }}
              isLoading={updateMutation.isPending}
              serverError={formError}
            />
          ) : (
            <ProfileView
              profile={profile}
              onEdit={() => {
                setIsEditing(true);
                setFormError(null);
              }}
            />
          )}
        </>
      )}
    </div>
  );
};
