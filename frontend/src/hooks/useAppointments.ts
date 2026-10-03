/**
 * Phase 7: TanStack Query Hooks for Appointments & Booking
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createAppointmentApi,
  reserveSlotApi,
  getPatientAppointmentsApi,
  getAppointmentByIdApi,
  cancelAppointmentApi,
  getPreConsultationApi,
  saveDraftPreConsultationApi,
  submitPreConsultationApi,
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
export function usePatientAppointments(params?: AppointmentQueryParams) {
  return useQuery({
    queryKey: APPOINTMENT_KEYS.list(params),
    queryFn: () => getPatientAppointmentsApi(params),
    staleTime: 60 * 1000,
  });
}

/**
 * Query hook to fetch a single appointment by id
 */
export function useAppointmentDetail(appointmentId: string | null | undefined) {
  return useQuery({
    queryKey: appointmentId ? APPOINTMENT_KEYS.detail(appointmentId) : ['appointments', 'detail', 'none'],
    queryFn: () => {
      if (!appointmentId) throw new Error('Appointment ID is required');
      return getAppointmentByIdApi(appointmentId);
    },
    enabled: Boolean(appointmentId),
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
