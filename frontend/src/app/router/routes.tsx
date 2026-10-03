/**
 * MANVIA Application Route Definitions
 */

import React from "react";
import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";

// Shells
import { PatientShell } from "@/layouts/PatientShell";
import { DoctorShell } from "@/layouts/DoctorShell";
import { AdminShell } from "@/layouts/AdminShell";

// Routes
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

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingRoute />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/register" element={<RegisterRoute />} />
      <Route path="/dev-health" element={<DevHealthRoute />} />

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
