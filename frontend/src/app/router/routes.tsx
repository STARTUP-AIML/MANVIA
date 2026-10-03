/**
 * MANVIA Application Route Definitions
 * Integrates Public, Patient (Phases 1-9), Doctor, and Admin workspaces.
 */

import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";

// Shells
import { PatientShell } from "@/layouts/PatientShell";
import { DoctorShell } from "@/layouts/DoctorShell";
import { AdminShell } from "@/layouts/AdminShell";

// Base routes
import {
  LandingRoute,
  LoginRoute,
  RegisterRoute,
  PatientHomeRoute,
  PatientProfileRoute,
  PatientSettingsRoute,
  AiCompanionRoute,
  DoctorRoute,
  AdminRoute,
  DevHealthRoute,
  NotFoundRoute,
} from "@/routes";

// Migrated Phase 5-9 domain views
import { WellnessPage } from "@/features/wellness/WellnessPage";
import { HealthTimelinePage } from "@/features/timeline/HealthTimelinePage";
import { DoctorDiscoveryPage } from "@/features/doctors/DoctorDiscoveryPage";
import { DoctorProfilePage } from "@/features/doctors/DoctorProfilePage";
import { DoctorBookingPage } from "@/features/booking/DoctorBookingPage";
import { AppointmentsPage } from "@/features/appointments/AppointmentsPage";
import { AppointmentDetailPage } from "@/features/appointments/AppointmentDetailPage";
import { PreConsultationPage } from "@/features/appointments/PreConsultationPage";
import { HealthRecordsPage } from "@/features/health-records/HealthRecordsPage";
import { HealthRecordDetailPage } from "@/features/health-records/HealthRecordDetailPage";
import { PatientLayout } from "@/components/layout/PatientLayout";
import { AccountPage } from "@/features/patient/AccountPage";
import { AICompanionPage } from "@/features/ai-companion/AICompanionPage";

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingRoute />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/register" element={<RegisterRoute />} />
      <Route path="/get-started" element={<Navigate to="/register" replace />} />
      <Route path="/dev-health" element={<DevHealthRoute />} />

      {/* Top-level Patient Domain Routes (Phases 5-9 & Direct Patient Navigation) */}
      <Route
        path="/wellness"
        element={
          <ProtectedRoute allowedRoles={["PATIENT"]}>
            <WellnessPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/health-timeline"
        element={
          <ProtectedRoute allowedRoles={["PATIENT"]}>
            <HealthTimelinePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctors"
        element={
          <ProtectedRoute allowedRoles={["PATIENT"]}>
            <PatientLayout activeTab="doctors">
              <DoctorDiscoveryPage />
            </PatientLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/care/doctors" element={<Navigate to="/doctors" replace />} />
      <Route
        path="/doctors/:doctorId"
        element={
          <ProtectedRoute allowedRoles={["PATIENT"]}>
            <PatientLayout activeTab="doctors">
              <DoctorProfilePage />
            </PatientLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/care/doctors/:doctorId"
        element={
          <ProtectedRoute allowedRoles={["PATIENT"]}>
            <PatientLayout activeTab="doctors">
              <DoctorProfilePage />
            </PatientLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctors/:doctorId/book"
        element={
          <ProtectedRoute allowedRoles={["PATIENT"]}>
            <PatientLayout activeTab="doctors">
              <DoctorBookingPage />
            </PatientLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/care/doctors/:doctorId/book"
        element={
          <ProtectedRoute allowedRoles={["PATIENT"]}>
            <PatientLayout activeTab="doctors">
              <DoctorBookingPage />
            </PatientLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedRoute allowedRoles={["PATIENT"]}>
            <PatientLayout activeTab="appointments">
              <AppointmentsPage />
            </PatientLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/care/appointments"
        element={<Navigate to="/appointments" replace />}
      />
      <Route
        path="/appointments/:appointmentId"
        element={
          <ProtectedRoute allowedRoles={["PATIENT"]}>
            <PatientLayout activeTab="appointments">
              <AppointmentDetailPage />
            </PatientLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments/:appointmentId/pre-consultation"
        element={
          <ProtectedRoute allowedRoles={["PATIENT"]}>
            <PatientLayout activeTab="appointments">
              <PreConsultationPage />
            </PatientLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/health-records"
        element={
          <ProtectedRoute allowedRoles={["PATIENT"]}>
            <PatientLayout activeTab="records">
              <HealthRecordsPage />
            </PatientLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/care/health-records"
        element={<Navigate to="/health-records" replace />}
      />
      <Route
        path="/health-records/:recordId"
        element={
          <ProtectedRoute allowedRoles={["PATIENT"]}>
            <PatientLayout activeTab="records">
              <HealthRecordDetailPage />
            </PatientLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/consents"
        element={<Navigate to="/health-records?tab=consents" replace />}
      />
      <Route
        path="/account"
        element={
          <ProtectedRoute allowedRoles={["PATIENT"]}>
            <AccountPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-companion"
        element={
          <ProtectedRoute allowedRoles={["PATIENT"]}>
            <AICompanionPage />
          </ProtectedRoute>
        }
      />

      {/* Patient Domain (Protected) */}
      <Route
        path="/app"
        element={
          <ProtectedRoute allowedRoles={["PATIENT"]}>
            <PatientShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<PatientHomeRoute />} />
        <Route path="profile" element={<PatientProfileRoute />} />
        <Route path="settings" element={<PatientSettingsRoute />} />
        <Route path="ai" element={<AiCompanionRoute />} />
        <Route path="ai/:conversationId" element={<AiCompanionRoute />} />
        <Route path="wellness" element={<WellnessPage />} />
        <Route path="health-timeline" element={<HealthTimelinePage />} />
        <Route path="doctors" element={<DoctorDiscoveryPage />} />
        <Route path="doctors/:doctorId" element={<DoctorProfilePage />} />
        <Route path="doctors/:doctorId/book" element={<DoctorBookingPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="appointments/:appointmentId" element={<AppointmentDetailPage />} />
        <Route path="appointments/:appointmentId/pre-consultation" element={<PreConsultationPage />} />
        <Route path="health-records" element={<HealthRecordsPage />} />
        <Route path="health-records/:recordId" element={<HealthRecordDetailPage />} />
        <Route path="records" element={<Navigate to="/app/health-records" replace />} />
        <Route path="*" element={<PatientHomeRoute />} />
      </Route>

      {/* Doctor Domain (Protected) */}
      <Route
        path="/doctor"
        element={
          <ProtectedRoute allowedRoles={["DOCTOR"]}>
            <DoctorShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DoctorRoute />} />
        <Route path="*" element={<DoctorRoute />} />
      </Route>

      {/* Admin Domain (Protected) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminRoute />} />
        <Route path="*" element={<AdminRoute />} />
      </Route>

      {/* Catch-all 404 Route */}
      <Route path="*" element={<NotFoundRoute />} />
    </Routes>
  );
};
