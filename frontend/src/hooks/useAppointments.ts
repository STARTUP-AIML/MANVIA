/**
 * Phase 7: TanStack Query Hooks for Appointments & Booking
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import {
  createAppointmentApi,
  reserveSlotApi,
  getPatientAppointmentsApi,
  getAppointmentByIdApi,
  cancelAppointmentApi,
  getPreConsultationApi,
  saveDraftPreConsultationApi,
  submitPreConsultationApi,
  getDoctorAppointmentsApi,
  acceptDoctorAppointmentApi,
  declineDoctorAppointmentApi,
  cancelDoctorAppointmentApi,
  startDoctorAppointmentApi,
  completeDoctorAppointmentApi,
  markNoShowDoctorAppointmentApi,
} from '@/api/';
import type {
  CreateAppointmentDto,
  ReserveSlotDto,
  AppointmentQueryParams,
  PreConsultationDraftDto,
} from '@/types/';

export const APPOINTMENT_KEYS = {
  all: ['appointments'] as const,
  list: (params?: AppointmentQueryParams) => ['appointments', 'list', params] as const,
  detail: (id: string) => ['appointments', 'detail', id] as const,
  preConsultation: (appointmentId: string) => ['appointments', 'preConsultation', appointmentId] as const,
};

/**
 * Mutation hook to request/book a doctor appointment
 */
export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateAppointmentDto) => createAppointmentApi(dto),
    onSuccess: (_data, variables) => {
      // Invalidate relevant queries: patient's appointment list and doctor availability
      queryClient.invalidateQueries({ queryKey: APPOINTMENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['doctors', 'availability', variables.doctorId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['health-timeline'] });
    },
  });
}

/**
 * Mutation hook to reserve a slot temporarily
 */
export function useReserveSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: ReserveSlotDto) => reserveSlotApi(dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['doctors', 'availability', variables.doctorId] });
    },
  });
}

/**
 * Query hook to fetch patient's appointments
 */
export function usePatientAppointments(params?: AppointmentQueryParams, options?: { enabled?: boolean }) {
  const { isAuthenticated, status } = useAuth();
  const isAuthReady = isAuthenticated && status === "AUTHENTICATED";
  const query = useQuery({
    queryKey: APPOINTMENT_KEYS.list(params),
    queryFn: () => getPatientAppointmentsApi(params),
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
 * Query hook to fetch a single appointment by id
 */
export function useAppointmentDetail(appointmentId: string | null | undefined, options?: { enabled?: boolean }) {
  const { isAuthenticated, status } = useAuth();
  const isAuthReady = isAuthenticated && status === "AUTHENTICATED";
  return useQuery({
    queryKey: appointmentId ? APPOINTMENT_KEYS.detail(appointmentId) : ['appointments', 'detail', 'none'],
    queryFn: () => {
      if (!appointmentId) throw new Error('Appointment ID is required');
      return getAppointmentByIdApi(appointmentId);
    },
    ...options,
    enabled: isAuthReady && Boolean(appointmentId) && (options?.enabled ?? true),
  });
}

/**
 * Mutation hook to cancel an appointment
 */
export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId, reason }: { appointmentId: string; reason: string }) =>
      cancelAppointmentApi(appointmentId, reason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: APPOINTMENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: APPOINTMENT_KEYS.detail(variables.appointmentId) });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['health-timeline'] });
    },
  });
}

/**
 * Query hook to fetch pre-consultation intake for an appointment
 */
export function usePreConsultation(appointmentId: string | null | undefined) {
  return useQuery({
    queryKey: appointmentId ? APPOINTMENT_KEYS.preConsultation(appointmentId) : ['appointments', 'preConsultation', 'none'],
    queryFn: () => {
      if (!appointmentId) throw new Error('Appointment ID is required');
      return getPreConsultationApi(appointmentId);
    },
    enabled: Boolean(appointmentId),
    retry: false,
  });
}

/**
 * Mutation hook to save/update pre-consultation draft
 */
export function useSaveDraftPreConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId, dto }: { appointmentId: string; dto: PreConsultationDraftDto }) =>
      saveDraftPreConsultationApi(appointmentId, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: APPOINTMENT_KEYS.preConsultation(variables.appointmentId) });
      queryClient.invalidateQueries({ queryKey: APPOINTMENT_KEYS.detail(variables.appointmentId) });
    },
  });
}

/**
 * Mutation hook to submit and lock pre-consultation intake
 */
export function useSubmitPreConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appointmentId: string) => submitPreConsultationApi(appointmentId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: APPOINTMENT_KEYS.preConsultation(variables) });
      queryClient.invalidateQueries({ queryKey: APPOINTMENT_KEYS.detail(variables) });
      queryClient.invalidateQueries({ queryKey: APPOINTMENT_KEYS.all });
    },
  });
}

export const DOCTOR_APPOINTMENT_KEYS = {
  all: ['doctor', 'appointments'] as const,
  list: (params?: AppointmentQueryParams) => ['doctor', 'appointments', 'list', params] as const,
  detail: (id: string) => ['doctor', 'appointments', 'detail', id] as const,
};

/**
 * Query hook to fetch doctor's appointments
 */
export function useDoctorAppointments(params?: AppointmentQueryParams, options?: { enabled?: boolean }) {
  const { isAuthenticated, status } = useAuth();
  const isAuthReady = isAuthenticated && status === "AUTHENTICATED";
  return useQuery({
    queryKey: DOCTOR_APPOINTMENT_KEYS.list(params),
    queryFn: () => getDoctorAppointmentsApi(params),
    staleTime: 30 * 1000,
    ...options,
    enabled: isAuthReady && (options?.enabled ?? true),
  });
}

/**
 * Mutation hook for doctor to accept an appointment
 */
export function useAcceptDoctorAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appointmentId: string) => acceptDoctorAppointmentApi(appointmentId),
    onSuccess: (_data, appointmentId) => {
      queryClient.invalidateQueries({ queryKey: DOCTOR_APPOINTMENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: DOCTOR_APPOINTMENT_KEYS.detail(appointmentId) });
    },
  });
}

/**
 * Mutation hook for doctor to decline an appointment
 */
export function useDeclineDoctorAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ appointmentId, reason }: { appointmentId: string; reason: string }) =>
      declineDoctorAppointmentApi(appointmentId, reason),
    onSuccess: (_data, { appointmentId }) => {
      queryClient.invalidateQueries({ queryKey: DOCTOR_APPOINTMENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: DOCTOR_APPOINTMENT_KEYS.detail(appointmentId) });
    },
  });
}

/**
 * Mutation hook for doctor to cancel an appointment
 */
export function useCancelDoctorAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ appointmentId, reason }: { appointmentId: string; reason: string }) =>
      cancelDoctorAppointmentApi(appointmentId, reason),
    onSuccess: (_data, { appointmentId }) => {
      queryClient.invalidateQueries({ queryKey: DOCTOR_APPOINTMENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: DOCTOR_APPOINTMENT_KEYS.detail(appointmentId) });
    },
  });
}

/**
 * Mutation hook for doctor to start an appointment
 */
export function useStartDoctorAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appointmentId: string) => startDoctorAppointmentApi(appointmentId),
    onSuccess: (_data, appointmentId) => {
      queryClient.invalidateQueries({ queryKey: DOCTOR_APPOINTMENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: DOCTOR_APPOINTMENT_KEYS.detail(appointmentId) });
    },
  });
}

/**
 * Mutation hook for doctor to complete an appointment
 */
export function useCompleteDoctorAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appointmentId: string) => completeDoctorAppointmentApi(appointmentId),
    onSuccess: (_data, appointmentId) => {
      queryClient.invalidateQueries({ queryKey: DOCTOR_APPOINTMENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: DOCTOR_APPOINTMENT_KEYS.detail(appointmentId) });
    },
  });
}

/**
 * Mutation hook for doctor to mark patient no-show
 */
export function useMarkNoShowDoctorAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appointmentId: string) => markNoShowDoctorAppointmentApi(appointmentId),
    onSuccess: (_data, appointmentId) => {
      queryClient.invalidateQueries({ queryKey: DOCTOR_APPOINTMENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: DOCTOR_APPOINTMENT_KEYS.detail(appointmentId) });
    },
  });
}
