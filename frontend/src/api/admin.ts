/**
 * Admin Governance, Oversight & Audit Trail API Client
 * Derived strictly from backend controllers in backend/src/modules/admin/
 */

import { apiFetch } from './client';
import type {
  PaginatedAdminDoctorsResponse,
  PaginatedAdminUsersResponse,
  PaginatedAdminAuditLogsResponse,
  AdminPaymentsOverview,
  AdminUserListItem,
} from '@/types/';

export {
  listAdminVerificationsApi,
  getAdminVerificationDetailApi,
  approveDoctorVerificationApi,
  rejectDoctorVerificationApi,
  getAdminDocumentAccessUrlApi,
} from './doctors';

export interface AdminDoctorsQueryParams {
  page?: number;
  limit?: number;
  specialty?: string;
  verificationStatus?: string;
  search?: string;
}

/**
 * List doctor accounts and credential verification status (Admin Only)
 * GET /api/v1/admin/doctors
 */
export async function listAdminDoctorsApi(
  params?: AdminDoctorsQueryParams
): Promise<PaginatedAdminDoctorsResponse> {
  const query = new URLSearchParams();
  if (params?.page !== undefined) query.set('page', String(params.page));
  if (params?.limit !== undefined) query.set('limit', String(params.limit));
  if (params?.specialty) query.set('specialty', params.specialty);
  if (params?.verificationStatus) query.set('verificationStatus', params.verificationStatus);
  if (params?.search) query.set('search', params.search);

  const qs = query.toString();
  const endpoint = qs ? `/admin/doctors?${qs}` : '/admin/doctors';
  return apiFetch<PaginatedAdminDoctorsResponse>(endpoint);
}

export interface AdminUsersQueryParams {
  page?: number;
  limit?: number;
  role?: string;
  status?: string;
  search?: string;
}

/**
 * List users with administrative filters (Admin Only)
 * GET /api/v1/admin/users
 */
export async function listAdminUsersApi(
  params?: AdminUsersQueryParams
): Promise<PaginatedAdminUsersResponse> {
  const query = new URLSearchParams();
  if (params?.page !== undefined) query.set('page', String(params.page));
  if (params?.limit !== undefined) query.set('limit', String(params.limit));
  if (params?.role) query.set('role', params.role);
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);

  const qs = query.toString();
  const endpoint = qs ? `/admin/users?${qs}` : '/admin/users';
  return apiFetch<PaginatedAdminUsersResponse>(endpoint);
}

/**
 * Retrieve user details (Admin Only)
 * GET /api/v1/admin/users/:userId
 */
export async function getAdminUserByIdApi(userId: string): Promise<AdminUserListItem> {
  return apiFetch<AdminUserListItem>(`/admin/users/${encodeURIComponent(userId)}`);
}

/**
 * Update user account status with mandatory reason (Admin Only)
 * POST /api/v1/admin/users/:userId/status
 */
export async function updateAdminUserStatusApi(
  userId: string,
  dto: { status: string; reason: string }
): Promise<AdminUserListItem> {
  return apiFetch<AdminUserListItem>(`/admin/users/${encodeURIComponent(userId)}/status`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export interface AdminAuditQueryParams {
  page?: number;
  limit?: number;
  actorUserId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Search immutable audit logs (Admin Only)
 * GET /api/v1/admin/audit-logs
 */
export async function queryAdminAuditLogsApi(
  params?: AdminAuditQueryParams
): Promise<PaginatedAdminAuditLogsResponse> {
  const query = new URLSearchParams();
  if (params?.page !== undefined) query.set('page', String(params.page));
  if (params?.limit !== undefined) query.set('limit', String(params.limit));
  if (params?.actorUserId) query.set('actorUserId', params.actorUserId);
  if (params?.action) query.set('action', params.action);
  if (params?.resourceType) query.set('resourceType', params.resourceType);
  if (params?.resourceId) query.set('resourceId', params.resourceId);
  if (params?.status) query.set('status', params.status);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);

  const qs = query.toString();
  const endpoint = qs ? `/admin/audit-logs?${qs}` : '/admin/audit-logs';
  return apiFetch<PaginatedAdminAuditLogsResponse>(endpoint);
}

/**
 * Financial and billing oversight overview (Admin Only)
 * GET /api/v1/admin/payments/overview
 */
export async function getAdminPaymentsOverviewApi(): Promise<AdminPaymentsOverview> {
  return apiFetch<AdminPaymentsOverview>('/admin/payments/overview');
}
