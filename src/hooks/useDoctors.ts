import { useQuery } from '@tanstack/react-query';
import {
  searchDoctorsApi,
  getDoctorByIdApi,
  getSpecialtiesApi,
  getLanguagesApi,
  getDoctorAvailabilityApi,
  getDoctorOffersApi,
} from '../api/doctors.js';
import type { DoctorQueryParams } from '../types/doctors.js';

export const doctorQueryKeys = {
  all: ['doctors'] as const,
  lists: () => [...doctorQueryKeys.all, 'list'] as const,
  list: (filters: DoctorQueryParams) => [...doctorQueryKeys.lists(), filters] as const,
  details: () => [...doctorQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...doctorQueryKeys.details(), id] as const,
  specialties: () => [...doctorQueryKeys.all, 'specialties'] as const,
  languages: () => [...doctorQueryKeys.all, 'languages'] as const,
  availability: (publicDoctorId: string) =>
    [...doctorQueryKeys.all, 'availability', publicDoctorId] as const,
  offers: (publicDoctorId: string) =>
    [...doctorQueryKeys.all, 'offers', publicDoctorId] as const,
};

export function useDoctors(params: DoctorQueryParams = {}) {
  const { specialty, language, limit = 20, offset = 0 } = params;

  return useQuery({
    queryKey: doctorQueryKeys.list({ specialty, language, limit, offset }),
    queryFn: () => searchDoctorsApi({ specialty, language, limit, offset }),
    staleTime: 60 * 1000,
  });
}

export function useDoctorDetail(doctorId: string | undefined) {
  return useQuery({
    queryKey: doctorQueryKeys.detail(doctorId || ''),
    queryFn: () => getDoctorByIdApi(doctorId!),
    enabled: Boolean(doctorId && doctorId.trim().length > 0),
    staleTime: 60 * 1000,
  });
}

export function useSpecialties() {
  return useQuery({
    queryKey: doctorQueryKeys.specialties(),
    queryFn: () => getSpecialtiesApi(),
    staleTime: 5 * 60 * 1000, // Reference taxonomy rarely changes
  });
}

export function useLanguages() {
  return useQuery({
    queryKey: doctorQueryKeys.languages(),
    queryFn: () => getLanguagesApi(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDoctorAvailability(publicDoctorId: string | undefined) {
  return useQuery({
    queryKey: doctorQueryKeys.availability(publicDoctorId || ''),
    queryFn: () => getDoctorAvailabilityApi(publicDoctorId!),
    enabled: Boolean(publicDoctorId && publicDoctorId.trim().length > 0),
    staleTime: 60 * 1000,
  });
}

export function useDoctorOffers(publicDoctorId: string | undefined) {
  return useQuery({
    queryKey: doctorQueryKeys.offers(publicDoctorId || ''),
    queryFn: () => getDoctorOffersApi(publicDoctorId!),
    enabled: Boolean(publicDoctorId && publicDoctorId.trim().length > 0),
    staleTime: 60 * 1000,
  });
}
