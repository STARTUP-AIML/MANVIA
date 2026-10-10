import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import { PatientSettingsRoute } from "@/routes/PatientSettingsRoute";
import { DoctorCard } from "@/features/doctors/components/DoctorCard";
import { PatientShell } from "@/layouts/PatientShell";
import type { DoctorPublic } from "@/types/doctors";
import type { AuthState } from "@/auth/types";

const mockAuthState: Partial<AuthState> = {
  user: {
    id: "usr-pat-1",
    email: "babu2005@gmail.com",
    roles: ["PATIENT"],
    status: "ACTIVE",
    emailVerified: true,
    phone: "+91 7890654723",
    phoneVerified: true,
    createdAt: "2026-01-01T00:00:00Z",
  },
  status: "AUTHENTICATED",
};

// Mock patient profile hook
vi.mock("@/features/patient", () => ({
  usePatientProfileQuery: () => ({
    data: {
      id: "pat-prof-1",
      publicPatientId: "PAT-87906541",
      legalFirstName: "Patient",
      legalLastName: "User",
      emergencyContact: {
        name: "Emergency Contact",
        phone: "+91 7890654723",
      },
      dateOfBirth: "1995-05-15",
      biologicalSex: "MALE" as const,
      bloodGroup: "O+",
      preferredLanguage: "en",
      timezone: "Asia/Kolkata",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    isLoading: false,
    refetch: vi.fn(),
  }),
  useUpdatePatientProfileMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  ProfileForm: () => <div data-testid="profile-form">Profile Form</div>,
}));

// Mock notification preferences partially
vi.mock("@/hooks", async (importOriginal: any) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNotifications: () => ({
      data: { data: [], total: 0, unreadCount: 0 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any),
    useNotificationPreferences: () => ({
      data: {
        inAppEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        appointmentReminders: true,
        marketingUpdates: true,
      },
    }),
    useUpdateNotificationPreferences: () => ({
      mutate: vi.fn(),
    }),
  };
});

describe("Phase 6 — Consolidated My Account & Settings Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Settings heading and sub-navigation according to reference design", () => {
    renderWithProviders(<PatientSettingsRoute />, {
      initialAuthState: mockAuthState,
    });

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(
      screen.getByText("Manage your account, profile, preferences, security, and more in one place.")
    ).toBeInTheDocument();

    // Verify sub-navigation items exist
    expect(screen.getAllByText("Profile & Account").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Personal Information").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Security & Password").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Notifications").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Connected Devices").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Privacy & Data").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Appearance").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Language & Region").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the Profile & Account Overview card with verified patient badges", () => {
    renderWithProviders(<PatientSettingsRoute />, {
      initialAuthState: mockAuthState,
    });

    expect(screen.getByText("Profile & Account Overview")).toBeInTheDocument();
    expect(screen.getByText("Patient User")).toBeInTheDocument();
    expect(screen.getAllByText("babu2005@gmail.com").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("📞 +91 7890654723")).toBeInTheDocument();
    expect(screen.getByText("👤 Patient Account")).toBeInTheDocument();
    expect(screen.getByText("✏️ Edit Profile")).toBeInTheDocument();
  });

  it("renders Account Information and Security & Password cards with live controls", () => {
    renderWithProviders(<PatientSettingsRoute />, {
      initialAuthState: mockAuthState,
    });

    expect(screen.getByText("Account Information")).toBeInTheDocument();
    expect(screen.getByText("Your login credentials and account status.")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();

    expect(screen.getAllByText("Security & Password").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Change")).toBeInTheDocument();
    expect(screen.getByText("Login Alerts")).toBeInTheDocument();
  });

  it("renders Connected Devices, Billing, Legal, Language and Appearance controls", () => {
    renderWithProviders(<PatientSettingsRoute />, {
      initialAuthState: mockAuthState,
    });

    expect(screen.getAllByText("Connected Devices").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Windows • Chrome")).toBeInTheDocument();

    expect(screen.getAllByText("Language & Region").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Appearance").length).toBeGreaterThanOrEqual(2);

    expect(screen.getByText("Account Actions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign Out/i })).toBeInTheDocument();
  });
});

describe("Phase 6 — Doctor Card & Navigation Consolidation", () => {
  const mockDemoDoctor: DoctorPublic = {
    publicDoctorId: "DOC-IN-01",
    displayName: "Dr. Ananya Rao",
    bio: "Consultant Psychiatrist specializing in mood disorders (Fictional Demo Clinician).",
    primarySpecialty: "Psychiatry",
    subSpecialties: ["Mood Disorders", "Adult ADHD"],
    languages: ["English", "Hindi", "Kannada"],
    yearsOfExperience: 12,
    defaultConsultationFee: 1200,
    currency: "INR",
    verificationStatus: "VERIFIED",
    clinicName: "MindWell Neuropsychiatric Clinic",
    city: "Bengaluru",
    state: "Karnataka",
    contactDisplay: "DEMO-87421903",
    isDemo: true,
    qualifications: [],
  };

  it("renders DoctorCard with Indian currency symbol (₹) and clinic location", () => {
    renderWithProviders(<DoctorCard doctor={mockDemoDoctor} />, {
      initialAuthState: mockAuthState,
    });

    expect(screen.getByText("Dr. Ananya Rao")).toBeInTheDocument();
    expect(screen.getByText("Psychiatry")).toBeInTheDocument();
    expect(screen.getByText("📍 MindWell Neuropsychiatric Clinic • Bengaluru")).toBeInTheDocument();
    expect(screen.getByText("₹ 1200")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View Profile/i })).toHaveAttribute(
      "href",
      "/app/doctors/DOC-IN-01"
    );
  });

  it("verifies PatientShell contains unified My Account link and excludes separate Account/Profile links", () => {
    renderWithProviders(<PatientShell />, {
      initialAuthState: mockAuthState,
    });

    expect(screen.getByText("My Account")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Account$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Profile$/i })).not.toBeInTheDocument();
  });
});
