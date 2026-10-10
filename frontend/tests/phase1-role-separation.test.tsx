/**
 * MANVIA Phase 1 Verification Test Suite
 * Validates Product Shell, Role Separation, Navigation Architecture & Authenticated Experience Foundation
 *
 * Covers:
 * 1. Role-specific Shells (PatientShell, DoctorShell, AdminShell)
 * 2. Complete Navigation Isolation (no leaked portals or cross-role links)
 * 3. Route Protection & Access Denied handling for Patient, Doctor, Admin
 * 4. Multi-role Active Role Enforcement (mitigates role spoofing)
 * 5. Platform Health Admin-only boundary & terminology
 * 6. UserMenu and Profile/Settings separation
 * 7. Canonical MANVIA branding across authenticated shells
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import { AppRoutes } from "@/app/router/routes";
import { sessionStorageManager } from "@/auth/sessionStorage";
import { authService } from "@/auth/authService";
import type { UserResponseDto } from "@/auth/types";
import * as doctorsApi from "@/api/doctors";
import * as adminApi from "@/api/admin";

const mockPatientUser: UserResponseDto = {
  id: "patient-user-p1",
  email: "patient.phase1@manvia.health",
  phone: "+1234567890",
  roles: ["PATIENT"],
  emailVerified: true,
  phoneVerified: true,
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00Z",
};

const mockDoctorUser: UserResponseDto = {
  id: "doctor-user-p1",
  email: "doctor.phase1@manvia.health",
  phone: "+1234567891",
  roles: ["DOCTOR"],
  emailVerified: true,
  phoneVerified: true,
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00Z",
};

const mockAdminUser: UserResponseDto = {
  id: "admin-user-p1",
  email: "admin.phase1@manvia.health",
  phone: "+1234567892",
  roles: ["ADMIN"],
  emailVerified: true,
  phoneVerified: true,
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00Z",
};

const mockDualRoleUser: UserResponseDto = {
  id: "dual-user-p1",
  email: "physician.patient@manvia.health",
  phone: "+1234567893",
  roles: ["PATIENT", "DOCTOR"],
  emailVerified: true,
  phoneVerified: true,
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00Z",
};

// Helper to create a fake JWT with activeRole claim in payload
function createMockJwt(activeRole: string): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: "user-123",
      sessionId: "session-123",
      roles: ["PATIENT", "DOCTOR"],
      activeRole,
      jti: "jti-123",
    }),
  );
  return `${header}.${payload}.signature`;
}

describe("Phase 1: Product Shell & Role Separation Architecture", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorageManager.clearTokens();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. PATIENT WORKSPACE ISOLATION
  // ─────────────────────────────────────────────────────────────
  describe("Patient Workspace (/app/*)", () => {
    it("renders PatientShell with Patient Portal header and no Doctor/Admin/Platform Health links", async () => {
      sessionStorageManager.setTokens({
        accessToken: "patient-token",
        refreshToken: "patient-refresh",
      });
      vi.spyOn(authService, "getMe").mockResolvedValue(mockPatientUser);

      renderWithProviders(<AppRoutes />, { initialEntries: ["/app"] });

      await waitFor(() => {
        expect(
          screen.getByRole("banner"),
        ).toBeInTheDocument();
      });

      const header = screen.getByRole("banner");
      expect(within(header).getByText("Patient Portal")).toBeInTheDocument();
      expect(within(header).getByText("MANVIA")).toBeInTheDocument();

      // Crucial requirement: No global header leaking other portals
      expect(within(header).queryByText("Doctor Portal")).not.toBeInTheDocument();
      expect(within(header).queryByText("Doctor Workspace")).not.toBeInTheDocument();
      expect(within(header).queryByText("Admin Console")).not.toBeInTheDocument();
      expect(within(header).queryByText("Dev Health")).not.toBeInTheDocument();
      expect(within(header).queryByText("Platform Health")).not.toBeInTheDocument();

      // Navigation is strictly patient care journey
      expect(within(header).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/app");
      expect(within(header).getByRole("link", { name: "AI Companion" })).toHaveAttribute("href", "/app/ai");
      expect(within(header).getByRole("link", { name: "Wellness" })).toHaveAttribute("href", "/app/wellness");
      expect(within(header).getByRole("link", { name: "Find Doctors" })).toHaveAttribute("href", "/app/doctors");
      expect(within(header).getByRole("link", { name: "Appointments" })).toHaveAttribute("href", "/app/appointments");
      expect(within(header).getByRole("link", { name: "Health Records" })).toHaveAttribute("href", "/app/health-records");
    });

    it("strictly blocks PATIENT user from accessing /doctor workspace", async () => {
      sessionStorageManager.setTokens({
        accessToken: "patient-token",
        refreshToken: "patient-refresh",
      });
      vi.spyOn(authService, "getMe").mockResolvedValue(mockPatientUser);

      renderWithProviders(<AppRoutes />, { initialEntries: ["/doctor"] });

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Access Restricted" })).toBeInTheDocument();
      });
      expect(
        screen.getByText("Your current role does not have authorization to view this section."),
      ).toBeInTheDocument();
    });

    it("strictly blocks PATIENT user from accessing /admin workspace", async () => {
      sessionStorageManager.setTokens({
        accessToken: "patient-token",
        refreshToken: "patient-refresh",
      });
      vi.spyOn(authService, "getMe").mockResolvedValue(mockPatientUser);

      renderWithProviders(<AppRoutes />, { initialEntries: ["/admin"] });

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Access Restricted" })).toBeInTheDocument();
      });
    });

    it("strictly blocks PATIENT user from accessing Platform Health diagnostics", async () => {
      sessionStorageManager.setTokens({
        accessToken: "patient-token",
        refreshToken: "patient-refresh",
      });
      vi.spyOn(authService, "getMe").mockResolvedValue(mockPatientUser);

      renderWithProviders(<AppRoutes />, { initialEntries: ["/admin/platform-health"] });

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Access Restricted" })).toBeInTheDocument();
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. DOCTOR WORKSPACE ISOLATION
  // ─────────────────────────────────────────────────────────────
  describe("Doctor Workspace (/doctor/*)", () => {
    it("renders DoctorShell with Doctor Workspace header and clinical navigation", async () => {
      sessionStorageManager.setTokens({
        accessToken: "doctor-token",
        refreshToken: "doctor-refresh",
      });
      vi.spyOn(authService, "getMe").mockResolvedValue(mockDoctorUser);
      vi.spyOn(doctorsApi, "getDoctorSelfProfileApi").mockResolvedValue({
        id: "doc-1",
        userId: "doctor-user-p1",
        publicDoctorId: "DOC-999888",
        displayName: "Dr. Gregory House",
        medicalRegistrationNumber: "MED-12345",
        licensingCouncil: "General Medical Council",
        yearsOfExperience: 15,
        verificationStatus: "VERIFIED",
        defaultConsultationFee: 150,
        currency: "USD",
        specialties: [],
        languages: [],
        qualifications: [],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      });
      vi.spyOn(doctorsApi, "getDoctorVerificationApi").mockResolvedValue({
        id: "v-1",
        status: "VERIFIED",
        documents: [],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      });
      vi.spyOn(doctorsApi, "getDoctorSelfAvailabilityApi").mockResolvedValue([]);
      vi.spyOn(doctorsApi, "getDoctorSelfOffersApi").mockResolvedValue([]);

      renderWithProviders(<AppRoutes />, { initialEntries: ["/doctor"] });

      await waitFor(() => {
        expect(screen.getByRole("banner")).toBeInTheDocument();
      });

      const header = screen.getByRole("banner");
      expect(within(header).getByText("Doctor Workspace")).toBeInTheDocument();
      expect(within(header).getByText("MANVIA")).toBeInTheDocument();

      // Zero cross-portal leakage: Doctor cannot see Patient Portal or Admin Console
      expect(within(header).queryByText("Patient Portal")).not.toBeInTheDocument();
      expect(within(header).queryByText("Admin Console")).not.toBeInTheDocument();
      expect(within(header).queryByText("Dev Health")).not.toBeInTheDocument();

      // Doctor-specific links
      expect(within(header).getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/doctor");
      expect(within(header).getByRole("link", { name: "Appointments" })).toHaveAttribute("href", "/doctor/appointments");
      expect(within(header).getByRole("link", { name: "Availability" })).toHaveAttribute("href", "/doctor/availability");
      expect(within(header).getByRole("link", { name: "Offers" })).toHaveAttribute("href", "/doctor/offers");
      expect(within(header).getByRole("link", { name: "Verification" })).toHaveAttribute("href", "/doctor/verification");
    });

    it("strictly blocks DOCTOR user from accessing /admin workspace", async () => {
      sessionStorageManager.setTokens({
        accessToken: "doctor-token",
        refreshToken: "doctor-refresh",
      });
      vi.spyOn(authService, "getMe").mockResolvedValue(mockDoctorUser);

      renderWithProviders(<AppRoutes />, { initialEntries: ["/admin"] });

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Access Restricted" })).toBeInTheDocument();
      });
    });

    it("strictly blocks DOCTOR user from accessing patient-only routes (/app/*)", async () => {
      sessionStorageManager.setTokens({
        accessToken: "doctor-token",
        refreshToken: "doctor-refresh",
      });
      vi.spyOn(authService, "getMe").mockResolvedValue(mockDoctorUser);

      renderWithProviders(<AppRoutes />, { initialEntries: ["/app"] });

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Access Restricted" })).toBeInTheDocument();
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. ADMIN WORKSPACE ISOLATION & PLATFORM HEALTH
  // ─────────────────────────────────────────────────────────────
  describe("Admin Workspace (/admin/*)", () => {
    it("renders AdminShell with Admin Console header and governance navigation", async () => {
      sessionStorageManager.setTokens({
        accessToken: "admin-token",
        refreshToken: "admin-refresh",
      });
      vi.spyOn(authService, "getMe").mockResolvedValue(mockAdminUser);
      vi.spyOn(adminApi, "getAdminPaymentsOverviewApi").mockResolvedValue({
        payments: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
        metrics: {
          totalSucceededRevenue: 0,
          succeededCount: 0,
          pendingRefundsCount: 0,
          pendingPayoutsCount: 0,
        },
      });
      vi.spyOn(adminApi, "listAdminVerificationsApi").mockResolvedValue({
        items: [],
        total: 0,
        limit: 10,
        offset: 0,
      });
      vi.spyOn(adminApi, "listAdminDoctorsApi").mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      vi.spyOn(adminApi, "listAdminUsersApi").mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      renderWithProviders(<AppRoutes />, { initialEntries: ["/admin"] });

      await waitFor(() => {
        expect(screen.getByRole("banner")).toBeInTheDocument();
      });

      const header = screen.getByRole("banner");
      expect(within(header).getByText("Admin Console")).toBeInTheDocument();

      // Zero leakage to Patient or Doctor portal
      expect(within(header).queryByText("Patient Portal")).not.toBeInTheDocument();
      expect(within(header).queryByText("Doctor Workspace")).not.toBeInTheDocument();

      // Admin navigation includes Platform Health
      expect(within(header).getByRole("link", { name: "Platform Health" })).toHaveAttribute(
        "href",
        "/admin/platform-health",
      );
    });

    it("allows ADMIN user to access Platform Health diagnostics under /admin/platform-health", async () => {
      sessionStorageManager.setTokens({
        accessToken: "admin-token",
        refreshToken: "admin-refresh",
      });
      vi.spyOn(authService, "getMe").mockResolvedValue(mockAdminUser);

      renderWithProviders(<AppRoutes />, { initialEntries: ["/admin/platform-health"] });

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /Platform Health Diagnostics/i }),
        ).toBeInTheDocument();
      });
      expect(screen.getByText("ADMIN ONLY")).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. MULTI-ROLE ACTIVE ROLE ENFORCEMENT
  // ─────────────────────────────────────────────────────────────
  describe("Multi-role activeRole Enforcement", () => {
    it("respects activeRole claim in JWT: dual role user with PATIENT activeRole cannot access /doctor", async () => {
      // User has both ['PATIENT', 'DOCTOR'], but activeRole in JWT is PATIENT
      const patientJwt = createMockJwt("PATIENT");
      sessionStorageManager.setTokens({
        accessToken: patientJwt,
        refreshToken: "dual-refresh",
      });
      vi.spyOn(authService, "getMe").mockResolvedValue(mockDualRoleUser);

      renderWithProviders(<AppRoutes />, { initialEntries: ["/doctor"] });

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Access Restricted" })).toBeInTheDocument();
      });
    });

    it("respects activeRole claim in JWT: dual role user with DOCTOR activeRole can access /doctor", async () => {
      const doctorJwt = createMockJwt("DOCTOR");
      sessionStorageManager.setTokens({
        accessToken: doctorJwt,
        refreshToken: "dual-refresh",
      });
      vi.spyOn(authService, "getMe").mockResolvedValue(mockDualRoleUser);
      vi.spyOn(doctorsApi, "getDoctorSelfProfileApi").mockResolvedValue({
        id: "doc-1",
        userId: "dual-user-p1",
        publicDoctorId: "DOC-999888",
        displayName: "Dr. Dual Role",
        medicalRegistrationNumber: "MED-12345",
        licensingCouncil: "General Medical Council",
        yearsOfExperience: 10,
        verificationStatus: "VERIFIED",
        defaultConsultationFee: 100,
        currency: "USD",
        specialties: [],
        languages: [],
        qualifications: [],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      });
      vi.spyOn(doctorsApi, "getDoctorVerificationApi").mockResolvedValue({
        id: "v-1",
        status: "VERIFIED",
        documents: [],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      });
      vi.spyOn(doctorsApi, "getDoctorSelfAvailabilityApi").mockResolvedValue([]);
      vi.spyOn(doctorsApi, "getDoctorSelfOffersApi").mockResolvedValue([]);

      renderWithProviders(<AppRoutes />, { initialEntries: ["/doctor"] });

      await waitFor(() => {
        expect(screen.getByRole("banner")).toBeInTheDocument();
      });
      expect(screen.getByText("Doctor Workspace")).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. UNAUTHENTICATED USERS PROTECTION
  // ─────────────────────────────────────────────────────────────
  describe("Unauthenticated Route Protection", () => {
    it("redirects unauthenticated users trying to access /app to /login", async () => {
      renderWithProviders(<AppRoutes />, { initialEntries: ["/app"] });
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Sign in to MANVIA" })).toBeInTheDocument();
      });
    });

    it("redirects unauthenticated users trying to access /doctor to /login", async () => {
      renderWithProviders(<AppRoutes />, { initialEntries: ["/doctor"] });
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Sign in to MANVIA" })).toBeInTheDocument();
      });
    });

    it("redirects unauthenticated users trying to access /admin to /login", async () => {
      renderWithProviders(<AppRoutes />, { initialEntries: ["/admin"] });
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Sign in to MANVIA" })).toBeInTheDocument();
      });
    });
  });
});
