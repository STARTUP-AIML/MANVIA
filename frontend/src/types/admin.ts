/**
 * Admin Oversight, Governance & Audit Trail Types
 * Matches backend contracts in backend/src/modules/admin/
 */

export interface AdminDoctorListItem {
  id: string;
  publicDoctorId: string;
  displayName: string;
  medicalRegistrationNumber: string;
  licensingCouncil: string;
  verificationStatus: string;
  yearsOfExperience: number;
  createdAt: string;
  specialties?: Array<{
    isPrimary: boolean;
    specialty: {
      name: string;
    };
  }>;
  user?: {
    id: string;
    email: string;
    status: string;
  };
}

export interface PaginatedAdminDoctorsResponse {
  items: AdminDoctorListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  phone?: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  status: 'ACTIVE' | 'SUSPENDED' | 'LOCKED' | 'DEACTIVATED' | string;
  roles: string[];
  failedLoginAttempts: number;
  lockoutUntil?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  patientProfile?: {
    id: string;
    publicPatientId: string;
    displayName: string;
  } | null;
  doctorProfile?: {
    id: string;
    publicDoctorId: string;
    displayName: string;
    verificationStatus: string;
  } | null;
  activeSessionCount: number;
}

export interface PaginatedAdminUsersResponse {
  items: AdminUserListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminAuditLogItem {
  id: string;
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  status: 'SUCCESS' | 'FAILURE' | string;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown> | null;
  createdAt: string;
}

export interface PaginatedAdminAuditLogsResponse {
  items: AdminAuditLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminPaymentsOverview {
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
    invoices?: Array<{
      id: string;
      invoiceNumber: string;
      status: string;
    }>;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  metrics: {
    totalSucceededRevenue: number;
    succeededCount: number;
    pendingRefundsCount: number;
    pendingPayoutsCount: number;
  };
}
