/**
 * MANVIA Patient Profile TanStack Query Hooks
 * Server-state management for patient profile query & mutations.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import { patientService } from '@/features/patient/api/patientService';
import type {
  PatientProfileResponseDto,
  CreatePatientProfileDto,
  UpdatePatientProfileDto,
} from "../types";
import { ApiError } from "@/api/errors/apiError";

export const PATIENT_PROFILE_QUERY_KEY = ["patient", "profile", "me"] as const;

/**
 * Hook to retrieve the current authenticated patient's profile.
 */
export function usePatientProfileQuery(options?: {
  enabled?: boolean;
  retry?: boolean | ((failureCount: number, error: ApiError) => boolean);
}): UseQueryResult<PatientProfileResponseDto, ApiError> {
  return useQuery<PatientProfileResponseDto, ApiError>({
    queryKey: PATIENT_PROFILE_QUERY_KEY,
    queryFn: () => patientService.getMyProfile(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

/**
 * Hook to initialize a new patient profile (POST /api/v1/patients/me).
 */
export function useCreatePatientProfileMutation(): UseMutationResult<
  PatientProfileResponseDto,
  ApiError,
  CreatePatientProfileDto
> {
  const queryClient = useQueryClient();

  return useMutation<
    PatientProfileResponseDto,
    ApiError,
    CreatePatientProfileDto
  >({
    mutationFn: (dto: CreatePatientProfileDto) =>
      patientService.createMyProfile(dto),
    onSuccess: (newProfile) => {
      queryClient.setQueryData(PATIENT_PROFILE_QUERY_KEY, newProfile);
      queryClient.invalidateQueries({ queryKey: PATIENT_PROFILE_QUERY_KEY });
    },
  });
}

/**
 * Hook to update an existing patient profile (PATCH /api/v1/patients/me).
 */
export function useUpdatePatientProfileMutation(): UseMutationResult<
  PatientProfileResponseDto,
  ApiError,
  UpdatePatientProfileDto
> {
  const queryClient = useQueryClient();

  return useMutation<
    PatientProfileResponseDto,
    ApiError,
    UpdatePatientProfileDto
  >({
    mutationFn: (dto: UpdatePatientProfileDto) =>
      patientService.updateMyProfile(dto),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(PATIENT_PROFILE_QUERY_KEY, updatedProfile);
      queryClient.invalidateQueries({ queryKey: PATIENT_PROFILE_QUERY_KEY });
    },
  });
}
