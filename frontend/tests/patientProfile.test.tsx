import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/testUtils";
import { PatientProfileRoute } from "@/routes/PatientProfileRoute";
import { patientService } from "@/features/patient/api/patientService";
import type { PatientProfileResponseDto } from "@/features/patient/types";
import { ApiError } from "@/api/errors/apiError";

const mockProfile: PatientProfileResponseDto = {
  id: "profile-uuid-1234",
  publicPatientId: "PAT-48291048",
  legalFirstName: "Priya",
  legalLastName: "Sharma",
  dateOfBirth: "1988-05-20",
  biologicalSex: "FEMALE",
  bloodGroup: "B+",
  emergencyContact: {
    name: "Anil Sharma",
    phone: "+14155552671",
    relationship: "SPOUSE",
  },
  preferredLanguage: "en",
  timezone: "Asia/Kolkata",
  createdAt: "2026-01-10T08:30:00.000Z",
  updatedAt: "2026-01-10T08:30:00.000Z",
};

describe("MANVIA Patient Profile Component & Workflow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders loading skeleton while patient profile is loading", () => {
    vi.spyOn(patientService, "getMyProfile").mockReturnValue(
      new Promise(() => {}), // Pending promise
    );

    renderWithProviders(<PatientProfileRoute />, {
      initialEntries: ["/app/profile"],
    });

    expect(screen.getByTestId("profile-loading-skeleton")).toBeInTheDocument();
  });

  it("renders patient profile demographic data and emergency contact when loaded", async () => {
    vi.spyOn(patientService, "getMyProfile").mockResolvedValueOnce(mockProfile);

    renderWithProviders(<PatientProfileRoute />, {
      initialEntries: ["/app/profile"],
    });

    await waitFor(() => {
      expect(screen.getByTestId("patient-profile-view")).toBeInTheDocument();
    });

    expect(screen.getByTestId("profile-patient-id")).toHaveTextContent(
      "PAT-48291048",
    );
    expect(screen.getByTestId("profile-full-name")).toHaveTextContent(
      "Priya Sharma",
    );
    expect(screen.getByTestId("profile-first-name")).toHaveTextContent("Priya");
    expect(screen.getByTestId("profile-last-name")).toHaveTextContent("Sharma");
    expect(screen.getByTestId("profile-biological-sex")).toHaveTextContent(
      "FEMALE",
    );
    expect(screen.getByTestId("profile-blood-group")).toHaveTextContent("B+");
    expect(screen.getByTestId("emergency-contact-name")).toHaveTextContent(
      "Anil Sharma",
    );
    expect(screen.getByTestId("emergency-contact-phone")).toHaveTextContent(
      "+14155552671",
    );
    expect(
      screen.getByTestId("emergency-contact-relationship"),
    ).toHaveTextContent("SPOUSE");
    expect(screen.getByTestId("profile-language")).toHaveTextContent("en");
    expect(screen.getByTestId("profile-timezone")).toHaveTextContent(
      "Asia/Kolkata",
    );
  });

  it("toggles edit mode, updates profile, and reflects changes", async () => {
    vi.spyOn(patientService, "getMyProfile").mockResolvedValueOnce(mockProfile);

    const updatedProfile: PatientProfileResponseDto = {
      ...mockProfile,
      legalFirstName: "Priyanka",
      preferredLanguage: "hi",
    };

    const updateSpy = vi
      .spyOn(patientService, "updateMyProfile")
      .mockResolvedValueOnce(updatedProfile);

    renderWithProviders(<PatientProfileRoute />, {
      initialEntries: ["/app/profile"],
    });

    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByTestId("edit-profile-button")).toBeInTheDocument();
    });

    // Enter edit mode
    await user.click(screen.getByTestId("edit-profile-button"));

    expect(screen.getByTestId("patient-profile-form")).toBeInTheDocument();
    const firstNameInput = screen.getByTestId("input-first-name");
    expect(firstNameInput).toHaveValue("Priya");

    // Modify first name
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Priyanka");

    // Submit form
    await user.click(screen.getByTestId("save-profile-button"));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          legalFirstName: "Priyanka",
        }),
      );
    });
  });

  it("cancels edit mode without updating server data", async () => {
    vi.spyOn(patientService, "getMyProfile").mockResolvedValueOnce(mockProfile);

    renderWithProviders(<PatientProfileRoute />, {
      initialEntries: ["/app/profile"],
    });

    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByTestId("edit-profile-button")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("edit-profile-button"));
    expect(screen.getByTestId("patient-profile-form")).toBeInTheDocument();

    const firstNameInput = screen.getByTestId("input-first-name");
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "DifferentName");

    // Click cancel
    await user.click(screen.getByTestId("cancel-profile-button"));

    // Returns to view mode with original name
    await waitFor(() => {
      expect(screen.getByTestId("patient-profile-view")).toBeInTheDocument();
      expect(screen.getByTestId("profile-first-name")).toHaveTextContent(
        "Priya",
      );
    });
  });

  it("handles 404 profile not found by rendering onboarding/creation flow", async () => {
    vi.spyOn(patientService, "getMyProfile").mockRejectedValueOnce(
      new ApiError({
        statusCode: 404,
        error: "NOT_FOUND",
        message: "Patient profile not found",
      }),
    );

    const createdProfile: PatientProfileResponseDto = {
      ...mockProfile,
      legalFirstName: "John",
      legalLastName: "Doe",
    };

    const createSpy = vi
      .spyOn(patientService, "createMyProfile")
      .mockResolvedValueOnce(createdProfile);

    renderWithProviders(<PatientProfileRoute />, {
      initialEntries: ["/app/profile"],
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("profile-onboarding-section"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Welcome to MANVIA Care")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByTestId("input-first-name"), "John");
    await user.type(screen.getByTestId("input-last-name"), "Doe");
    await user.click(screen.getByTestId("save-profile-button"));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          legalFirstName: "John",
          legalLastName: "Doe",
        }),
      );
    });
  });

  it("handles server error with retry capability", async () => {
    const getMyProfileSpy = vi
      .spyOn(patientService, "getMyProfile")
      .mockRejectedValueOnce(
        new ApiError({
          statusCode: 500,
          error: "INTERNAL_SERVER_ERROR",
          message: "Internal server error occurred",
        }),
      );

    renderWithProviders(<PatientProfileRoute />, {
      initialEntries: ["/app/profile"],
    });

    await waitFor(() => {
      expect(screen.getByTestId("profile-error-card")).toBeInTheDocument();
      expect(
        screen.getByText(/Internal server error occurred/i),
      ).toBeInTheDocument();
    });

    // Provide successful response on retry
    getMyProfileSpy.mockResolvedValueOnce(mockProfile);

    const user = userEvent.setup();
    await user.click(screen.getByTestId("profile-retry-button"));

    await waitFor(() => {
      expect(screen.getByTestId("patient-profile-view")).toBeInTheDocument();
    });
  });

  it("validates that date of birth cannot be in the future", async () => {
    vi.spyOn(patientService, "getMyProfile").mockResolvedValueOnce(mockProfile);

    renderWithProviders(<PatientProfileRoute />, {
      initialEntries: ["/app/profile"],
    });

    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByTestId("edit-profile-button")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("edit-profile-button"));

    // Enter future date
    const dobInput = screen.getByTestId("input-dob");
    await user.clear(dobInput);
    await user.type(dobInput, "2099-01-01");

    await user.click(screen.getByTestId("save-profile-button"));

    expect(
      screen.getByText("Date of birth cannot be in the future"),
    ).toBeInTheDocument();
  });
});
