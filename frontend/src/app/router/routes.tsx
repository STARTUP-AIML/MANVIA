/**
 * MANVIA Application Route Definitions
 * Integrates Public, Canonical Patient (/app/*), Doctor, and Admin workspaces.
 */

import React from "react";
import {
  Route,
  Routes,
  Navigate,
  useParams,
  useLocation,
} from "react-router-dom";
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

// Domain views
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
import { AccountPage } from "@/features/patient/AccountPage";

// Helper components for preserving query strings and route params during redirects
const RedirectWithSearch: React.FC<{ to: string }> = ({ to }) => {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
};

const RedirectWithParams: React.FC<{
  to: (params: Record<string, string | undefined>) => string;
}> = ({ to }) => {
  const params = useParams();
  const location = useLocation();
  return <Navigate to={`${to(params)}${location.search}`} replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingRoute />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/register" element={<RegisterRoute />} />
      <Route path="/get-started" element={<Navigate to="/register" replace />} />
      <Route path="/dev-health" element={<DevHealthRoute />} />

      {/* Legacy Patient Routes -> Redirects to Canonical /app/* */}
      <Route path="/wellness" element={<RedirectWithSearch to="/app/wellness" />} />
      <Route
        path="/health-timeline"
        element={<RedirectWithSearch to="/app/health-timeline" />}
      />
      <Route
        path="/timeline"
        element={<RedirectWithSearch to="/app/health-timeline" />}
      />
      <Route path="/doctors" element={<RedirectWithSearch to="/app/doctors" />} />
      <Route
        path="/care/doctors"
        element={<RedirectWithSearch to="/app/doctors" />}
      />
      <Route
        path="/doctors/:doctorId"
        element={
          <RedirectWithParams
            to={(p) => `/app/doctors/${encodeURIComponent(p.doctorId || "")}`}
          />
        }
      />
      <Route
        path="/care/doctors/:doctorId"
        element={
          <RedirectWithParams
            to={(p) => `/app/doctors/${encodeURIComponent(p.doctorId || "")}`}
          />
        }
      />
      <Route
        path="/doctors/:doctorId/book"
        element={
          <RedirectWithParams
            to={(p) => `/app/doctors/${encodeURIComponent(p.doctorId || "")}/book`}
          />
        }
      />
      <Route
        path="/care/doctors/:doctorId/book"
        element={
          <RedirectWithParams
            to={(p) => `/app/doctors/${encodeURIComponent(p.doctorId || "")}/book`}
          />
        }
      />
      <Route
        path="/appointments"
        element={<RedirectWithSearch to="/app/appointments" />}
      />
      <Route
        path="/care/appointments"
        element={<RedirectWithSearch to="/app/appointments" />}
      />
      <Route
        path="/appointments/:appointmentId"
        element={
          <RedirectWithParams
            to={(p) => `/app/appointments/${encodeURIComponent(p.appointmentId || "")}`}
          />
        }
      />
      <Route
        path="/appointments/:appointmentId/pre-consultation"
        element={
          <RedirectWithParams
            to={(p) =>
              `/app/appointments/${encodeURIComponent(p.appointmentId || "")}/pre-consultation`
            }
          />
        }
      />
      <Route
        path="/health-records"
        element={<RedirectWithSearch to="/app/health-records" />}
      />
      <Route
        path="/care/health-records"
        element={<RedirectWithSearch to="/app/health-records" />}
      />
      <Route
        path="/health-records/:recordId"
        element={
          <RedirectWithParams
            to={(p) => `/app/health-records/${encodeURIComponent(p.recordId || "")}`}
          />
        }
      />
      <Route
        path="/consents"
        element={<RedirectWithSearch to="/app/health-records?tab=consents" />}
      />
      <Route path="/account" element={<RedirectWithSearch to="/app/account" />} />
      <Route path="/ai-companion" element={<RedirectWithSearch to="/app/ai" />} />

      {/* Canonical Patient Domain (Protected via PatientShell + Outlet) */}
      <Route
        path="/app"
        element={
          <ProtectedRoute allowedRoles={["PATIENT"]}>
            <PatientShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<PatientHomeRoute />} />
        <Route path="ai" element={<AiCompanionRoute />} />
        <Route path="ai/:conversationId" element={<AiCompanionRoute />} />
        <Route path="wellness" element={<WellnessPage />} />
        <Route path="health-timeline" element={<HealthTimelinePage />} />
        <Route path="doctors" element={<DoctorDiscoveryPage />} />
        <Route path="doctors/:doctorId" element={<DoctorProfilePage />} />
        <Route path="doctors/:doctorId/book" element={<DoctorBookingPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="appointments/:appointmentId" element={<AppointmentDetailPage />} />
        <Route
          path="appointments/:appointmentId/pre-consultation"
          element={<PreConsultationPage />}
        />
        <Route path="health-records" element={<HealthRecordsPage />} />
        <Route path="health-records/:recordId" element={<HealthRecordDetailPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="profile" element={<PatientProfileRoute />} />
        <Route path="settings" element={<PatientSettingsRoute />} />
        <Route path="records" element={<Navigate to="/app/health-records" replace />} />
        <Route path="consultations" element={<Navigate to="/app/doctors" replace />} />
        <Route path="*" element={<NotFoundRoute />} />
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
