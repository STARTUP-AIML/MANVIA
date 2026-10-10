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

export interface AdminDashboardOverview {
  users: {
    total: number;
    byRole: {
      PATIENT: number;
      DOCTOR: number;
      ADMIN: number;
    };
    byStatus: {
      ACTIVE: number;
      SUSPENDED: number;
    };
  };
  doctorVerifications: {
    total: number;
    byStatus: Record<string, number>;
    pendingReviewCount: number;
  };
  appointments: {
    total: number;
    byStatus: Record<string, number>;
  };
  finances: {
    totalSucceededRevenue: number;
    totalSucceededTransactions: number;
    pendingRefundsCount: number;
    pendingPayoutsCount: number;
  };
  operationalAlerts: Array<{
    id: string;
    type: 'WARNING' | 'CRITICAL' | 'INFO';
    message: string;
  }>;
  recentActivity: AdminAuditLogItem[];
  timestamp: string;
}

export interface AdminAppointmentListItem {
  id: string;
  publicAppointmentId: string;
  patientId: string;
  doctorId: string;
  startAt: string;
  endAt: string;
  status: string;
  reservationState: string;
  patient?: {
    id: string;
    publicPatientId: string;
    displayName: string;
  };
  doctor?: {
    id: string;
    publicDoctorId: string;
    displayName: string;
  };
}

export interface PaginatedAdminAppointmentsResponse {
  items: AdminAppointmentListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminAppointmentDetail {
  id: string;
  publicAppointmentId: string;
  status: string;
  reservationState: string;
  startAt: string;
  endAt: string;
  confirmedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  cancelledBy?: string | null;
  declineReason?: string | null;
  declinedAt?: string | null;
  createdAt: string;
  patient?: {
    id: string;
    publicPatientId: string;
    displayName: string;
    user?: {
      id: string;
      email: string;
      phone?: string | null;
    };
  };
  doctor?: {
    id: string;
    publicDoctorId: string;
    displayName: string;
    medicalRegistrationNumber?: string;
    licensingCouncil?: string;
    user?: {
      id: string;
      email: string;
    };
  };
  consultationOffer?: {
    id: string;
    title: string;
    consultationType: string;
    durationMinutes: number;
    fee: number | string;
    currency: string;
  };
  cancellation?: {
    id: string;
    cancelledBy: string;
    cancellationActorType: string;
    reason: string;
    reasonCode?: string;
    cancelledAt: string;
  } | null;
}

export interface CancelAdminAppointmentPayload {
  reason: string;
  reasonCode?: string;
  requestRefund?: boolean;
}

export interface SubsystemState {
  subsystem: string;
  enabled: boolean;
  lastModifiedBy?: string;
  lastModifiedAt: string;
  justification?: string;
}

export interface AdminSystemStatus {
  status: 'OPERATIONAL' | 'DEGRADED_EMERGENCY_SHUTDOWN' | string;
  uptimeSeconds: number;
  timestamp: string;
  subsystems: SubsystemState[];
}

export interface PlatformReadinessResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptimeSeconds: number;
  components: Record<
    string,
    {
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTimeMs?: number;
      error?: string;
      details?: Record<string, unknown>;
    }
  >;
}
