/**
 * Phase 9: TanStack Query Hooks for Health Records & Consents
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import {
  createUploadIntentApi,
  uploadFileToPresignedUrlApi,
  finalizeUploadApi,
  createHealthRecordDirectApi,
  getPatientHealthRecordsApi,
  getHealthRecordByIdApi,
  getRecordDownloadUrlApi,
  updateHealthRecordApi,
  deleteHealthRecordApi,
  getPatientConsentsApi,
  grantConsentApi,
  getConsentDetailsApi,
  revokeConsentApi,
} from '@/api/';
import type {
  CreateUploadIntentDto,
  CreateHealthRecordDto,
  HealthRecordQueryParams,
  UpdateHealthRecordDto,
  GrantConsentDto,
  RevokeConsentDto,
} from '@/types/';

export const HEALTH_RECORD_KEYS = {
  all: ['health-records'] as const,
  list: (params?: HealthRecordQueryParams) => ['health-records', 'list', params] as const,
  detail: (recordId: string) => ['health-records', 'detail', recordId] as const,
  downloadUrl: (recordId: string) => ['health-records', 'download', recordId] as const,
};

export const CONSENT_KEYS = {
  all: ['consents'] as const,
  list: () => ['consents', 'list'] as const,
  detail: (id: string) => ['consents', 'detail', id] as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// Health Records Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to retrieve paginated health records with filters
 */
export function useHealthRecords(params?: HealthRecordQueryParams, options?: { enabled?: boolean }) {
  const { isAuthenticated, status } = useAuth();
  const isAuthReady = isAuthenticated && status === "AUTHENTICATED";
  const query = useQuery({
    queryKey: HEALTH_RECORD_KEYS.list(params),
    queryFn: () => getPatientHealthRecordsApi(params),
    staleTime: 60 * 1000,
    ...options,
    enabled: isAuthReady && (options?.enabled ?? true),
  });

  return {
    ...query,
    isLoading: query.isLoading || !isAuthReady,
  };
}

/**
 * Hook to retrieve details for a specific health record
 */
export function useHealthRecordDetail(recordId: string, enabled = true) {
  const { isAuthenticated, status } = useAuth();
  const isAuthReady = isAuthenticated && status === "AUTHENTICATED";
  const query = useQuery({
    queryKey: HEALTH_RECORD_KEYS.detail(recordId),
    queryFn: () => getHealthRecordByIdApi(recordId),
    enabled: isAuthReady && Boolean(recordId) && enabled,
    staleTime: 60 * 1000,
  });

  return {
    ...query,
    isLoading: query.isLoading || !isAuthReady,
  };
}

/**
 * Hook to fetch a time-limited signed download URL
 */
export function useRecordDownloadUrl(recordId: string, enabled = false) {
  const { isAuthenticated, status } = useAuth();
  const isAuthReady = isAuthenticated && status === "AUTHENTICATED";
  return useQuery({
    queryKey: HEALTH_RECORD_KEYS.downloadUrl(recordId),
    queryFn: () => getRecordDownloadUrlApi(recordId),
    enabled: isAuthReady && Boolean(recordId) && enabled,
    // Do not cache sensitive temporary signed URLs long term
    staleTime: 0,
    gcTime: 2 * 60 * 1000,
  });
}

/**
 * Hook for initiating an upload intent
 */
export function useCreateUploadIntent() {
  return useMutation({
    mutationFn: (dto: CreateUploadIntentDto) => createUploadIntentApi(dto),
  });
}

/**
 * Hook to execute the full presigned upload workflow:
 * 1. Request upload intent -> 2. Binary PUT to presigned URL -> 3. Finalize record
 */
export function useUploadHealthRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      intentDto,
      file,
    }: {
      intentDto: CreateUploadIntentDto;
      file: File | Blob;
    }) => {
      // Step 1: Create upload intent with metadata
      const intent = await createUploadIntentApi(intentDto);

      // Step 2: Binary PUT directly to presigned upload URL
      await uploadFileToPresignedUrlApi(intent.uploadUrl, file, intent.requiredHeaders);

      // Step 3: Finalize upload with backend
      const finalized = await finalizeUploadApi(intent.recordId);
      return finalized;
    },
    onSuccess: () => {
      // Invalidate health records list and timeline (since a timeline event is created)
      queryClient.invalidateQueries({ queryKey: HEALTH_RECORD_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}

/**
 * Hook for direct Base64 document creation (fallback / lightweight ingest)
 */
export function useDirectCreateHealthRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateHealthRecordDto) => createHealthRecordDirectApi(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HEALTH_RECORD_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}

/**
 * Hook to update health record metadata
 */
export function useUpdateHealthRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recordId, dto }: { recordId: string; dto: UpdateHealthRecordDto }) =>
      updateHealthRecordApi(recordId, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: HEALTH_RECORD_KEYS.all });
      queryClient.invalidateQueries({ queryKey: HEALTH_RECORD_KEYS.detail(variables.recordId) });
    },
  });
}

/**
 * Hook to soft-delete / archive a health record
 */
export function useDeleteHealthRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recordId: string) => deleteHealthRecordApi(recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HEALTH_RECORD_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Consent Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to list patient consents
 */
export function useConsents(options?: { enabled?: boolean }) {
  const { isAuthenticated, status } = useAuth();
  const isAuthReady = isAuthenticated && status === "AUTHENTICATED";
  const query = useQuery({
    queryKey: CONSENT_KEYS.list(),
    queryFn: () => getPatientConsentsApi(),
    staleTime: 60 * 1000,
    ...options,
    enabled: isAuthReady && (options?.enabled ?? true),
  });

  return {
    ...query,
    isLoading: query.isLoading || !isAuthReady,
  };
}

/**
 * Hook to get consent details and immutable audit trail
 */
export function useConsentDetail(id: string, enabled = true) {
  const { isAuthenticated, status } = useAuth();
  const isAuthReady = isAuthenticated && status === "AUTHENTICATED";
  const query = useQuery({
    queryKey: CONSENT_KEYS.detail(id),
    queryFn: () => getConsentDetailsApi(id),
    enabled: isAuthReady && Boolean(id) && enabled,
    staleTime: 60 * 1000,
  });

  return {
    ...query,
    isLoading: query.isLoading || !isAuthReady,
  };
}

/**
 * Hook to grant consent to a physician
 */
export function useGrantConsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: GrantConsentDto) => grantConsentApi(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONSENT_KEYS.all });
    },
  });
}

/**
 * Hook to revoke active consent
 */
export function useRevokeConsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: RevokeConsentDto }) =>
      revokeConsentApi(id, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: CONSENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: CONSENT_KEYS.detail(variables.id) });
    },
  });
}
