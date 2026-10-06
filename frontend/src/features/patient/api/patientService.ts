/**
 * MANVIA Authoritative Patient API Service
 * Interacts directly with backend endpoints:
 * - GET   /api/v1/patients/me
 * - POST  /api/v1/patients/me
 * - PATCH /api/v1/patients/me
 */

import { apiClient } from "@/api/client/apiClient";
import type {
  PatientProfileResponseDto,
  CreatePatientProfileDto,
  UpdatePatientProfileDto,
} from "../types";

export const patientService = {
  /**
   * Retrieves the current authenticated patient's profile.
   * Scoped to the requesting user (IDOR protected).
   * If the user does not have a profile, throws ApiError with status 404.
   */
  async getMyProfile(): Promise<PatientProfileResponseDto> {
    return apiClient.get<PatientProfileResponseDto>("patients/me");
  },

  /**
   * Initializes a new PatientProfile for the authenticated user.
   */
  async createMyProfile(
    dto: CreatePatientProfileDto,
  ): Promise<PatientProfileResponseDto> {
    return apiClient.post<PatientProfileResponseDto>("patients/me", dto);
  },

  /**
   * Updates demographic details and contact preferences.
   * Mass assignment protected.
   */
  async updateMyProfile(
    dto: UpdatePatientProfileDto,
  ): Promise<PatientProfileResponseDto> {
    return apiClient.patch<PatientProfileResponseDto>("patients/me", dto);
  },
};
