import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DoctorCard } from '@/features/doctors/components/DoctorCard';
import { DoctorFilters } from '@/features/doctors/components/DoctorFilters';
import { DoctorVerificationBadge } from '@/features/doctors/components/DoctorVerificationBadge';
import { DoctorAvailabilityPreview } from '@/features/doctors/components/DoctorAvailabilityPreview';
import { DoctorOffersPreview } from '@/features/doctors/components/DoctorOffersPreview';
import { DoctorDiscoveryPage } from '@/features/doctors/DoctorDiscoveryPage';
import { DoctorProfilePage } from '@/features/doctors/DoctorProfilePage';
import type {
  DoctorPublic,
  Specialty,
  Language,
  DoctorAvailabilityWindow,
  DoctorConsultationOffer,
} from '@/types/doctors';
import * as doctorsApi from '@/api/doctors';

const mockDoctor1: DoctorPublic = {
  publicDoctorId: 'DOC-12345678',
  displayName: 'Dr. Sarah Mitchell, MD',
  bio: 'Specialist in preventative cardiology and cardiovascular wellness.',
  primarySpecialty: 'Cardiology',
  subSpecialties: ['Internal Medicine', 'Preventive Care'],
  languages: ['English', 'Spanish'],
  yearsOfExperience: 14,
  defaultConsultationFee: 120,
  currency: 'USD',
  verificationStatus: 'VERIFIED',
  qualifications: [
    {
      qualification: 'Doctor of Medicine (MD)',
      institution: 'Stanford University School of Medicine',
      fieldOfStudy: 'Cardiology',
      graduationYear: 2010,
    },
  ],
};

const mockDoctor2: DoctorPublic = {
  publicDoctorId: 'DOC-87654321',
  displayName: 'Dr. James Wilson, MD',
  bio: 'General practitioner with focus on holistic family health.',
  primarySpecialty: 'General Practice',
  subSpecialties: [],
  languages: ['English'],
  yearsOfExperience: 8,
  defaultConsultationFee: 80,
  currency: 'USD',
  verificationStatus: 'PENDING_REVIEW',
  qualifications: [],
};

const mockSpecialties: Specialty[] = [
  { id: 'spec-1', code: 'CARDIO', name: 'Cardiology', isActive: true },
  { id: 'spec-2', code: 'GENERAL_PRACTICE', name: 'General Practice', isActive: true },
];

const mockLanguages: Language[] = [
  { id: 'lang-1', code: 'en', name: 'English' },
  { id: 'lang-2', code: 'es', name: 'Spanish' },
];

const mockAvailability: DoctorAvailabilityWindow[] = [
  {
    id: 'avail-1',
    timezone: 'America/New_York',
    dayOfWeek: 'MONDAY',
    startTime: '09:00',
    endTime: '13:00',
  },
  {
    id: 'avail-2',
    timezone: 'America/New_York',
    dayOfWeek: 'WEDNESDAY',
    startTime: '14:00',
    endTime: '18:00',
  },
];

const mockOffers: DoctorConsultationOffer[] = [
  {
    id: 'offer-1',
    title: 'Comprehensive Cardiovascular Consultation',
    description: 'In-depth cardiac review and prevention roadmap.',
    consultationType: 'INITIAL',
    durationMinutes: 45,
    fee: 150,
    currency: 'USD',
  },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Doctor Module — Phase 6', () => {
  describe('DoctorVerificationBadge Component', () => {
    it('renders VERIFIED status with checkmark and non-color text indicator', () => {
      render(<DoctorVerificationBadge status="VERIFIED" />);
      expect(screen.getByText('Verified Physician')).toBeInTheDocument();
      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('renders PENDING_REVIEW status accurately', () => {
      render(<DoctorVerificationBadge status="PENDING_REVIEW" />);
      expect(screen.getByText('Verification Under Review')).toBeInTheDocument();
    });

    it('renders DRAFT status accurately', () => {
      render(<DoctorVerificationBadge status="DRAFT" />);
      expect(screen.getByText('Draft Profile')).toBeInTheDocument();
    });
  });

  describe('DoctorCard Component', () => {
    it('renders doctor information, primary specialty, experience, and fee', () => {
      render(<DoctorCard doctor={mockDoctor1} />, { wrapper: createWrapper() });
      expect(screen.getByText('Dr. Sarah Mitchell, MD')).toBeInTheDocument();
      expect(screen.getByText('ID: DOC-12345678')).toBeInTheDocument();
      expect(screen.getByText('Cardiology')).toBeInTheDocument();
      expect(screen.getByText('14+ Years')).toBeInTheDocument();
      expect(screen.getByText('USD 120.00')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /View Profile/i })).toBeInTheDocument();
    });
  });

  describe('DoctorFilters Component', () => {
    it('renders search input, specialty select, and language select', () => {
      const handleSearch = vi.fn();
      const handleSpecialty = vi.fn();
      const handleLanguage = vi.fn();
      const handleClear = vi.fn();

      render(
        <DoctorFilters
          searchQuery=""
          onSearchChange={handleSearch}
          selectedSpecialty=""
          onSpecialtyChange={handleSpecialty}
          selectedLanguage=""
          onLanguageChange={handleLanguage}
          specialties={mockSpecialties}
          languages={mockLanguages}
          onClearFilters={handleClear}
          isFiltered={false}
          totalResults={2}
        />
      );

      expect(screen.getByLabelText(/Search Doctor Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Medical Specialty/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Spoken Language/i)).toBeInTheDocument();
      expect(screen.getByText(/Cardiology/i)).toBeInTheDocument();
      expect(screen.getByText(/English/i)).toBeInTheDocument();
    });

    it('triggers search and filter change callbacks', () => {
      const handleSearch = vi.fn();
      const handleSpecialty = vi.fn();
      const handleLanguage = vi.fn();
      const handleClear = vi.fn();

      render(
        <DoctorFilters
          searchQuery=""
          onSearchChange={handleSearch}
          selectedSpecialty=""
          onSpecialtyChange={handleSpecialty}
          selectedLanguage=""
          onLanguageChange={handleLanguage}
          specialties={mockSpecialties}
          languages={mockLanguages}
          onClearFilters={handleClear}
          isFiltered={true}
          totalResults={1}
        />
      );

      const searchInput = screen.getByLabelText(/Search Doctor Name/i);
      fireEvent.change(searchInput, { target: { value: 'Mitchell' } });
      expect(handleSearch).toHaveBeenCalledWith('Mitchell');

      const specialtySelect = screen.getByLabelText(/Medical Specialty/i);
      fireEvent.change(specialtySelect, { target: { value: 'CARDIO' } });
      expect(handleSpecialty).toHaveBeenCalledWith('CARDIO');

      const clearBtn = screen.getByRole('button', { name: /Reset Filters/i });
      fireEvent.click(clearBtn);
      expect(handleClear).toHaveBeenCalled();
    });
  });

  describe('DoctorAvailabilityPreview Component', () => {
    it('renders recurring schedule with day, time range, and physician timezone', () => {
      render(
        <DoctorAvailabilityPreview
          availability={mockAvailability}
          isLoading={false}
        />
      );

      expect(screen.getByText(/Availability Schedule Preview/i)).toBeInTheDocument();
      expect(screen.getByText(/America\/New_York/i)).toBeInTheDocument();
      expect(screen.getByText('Monday')).toBeInTheDocument();
      expect(screen.getByText('9:00 AM – 1:00 PM')).toBeInTheDocument();
      expect(screen.getByText('Wednesday')).toBeInTheDocument();
      expect(screen.getByText('2:00 PM – 6:00 PM')).toBeInTheDocument();
    });

    it('renders empty message when no schedule published', () => {
      render(<DoctorAvailabilityPreview availability={[]} isLoading={false} />);
      expect(
        screen.getByText(/No recurring consultation windows currently published/i)
      ).toBeInTheDocument();
    });
  });

  describe('DoctorOffersPreview Component', () => {
    it('renders consultation offerings with duration and fee', () => {
      render(<DoctorOffersPreview offers={mockOffers} isLoading={false} />);
      expect(screen.getByText('Comprehensive Cardiovascular Consultation')).toBeInTheDocument();
      expect(screen.getByText('45 mins')).toBeInTheDocument();
      expect(screen.getByText('USD 150.00')).toBeInTheDocument();
      expect(screen.getByText('INITIAL')).toBeInTheDocument();
    });
  });

  describe('DoctorDiscoveryPage', () => {
    it('loads and renders doctors from backend API', async () => {
      vi.spyOn(doctorsApi, 'searchDoctorsApi').mockResolvedValue({
        data: [mockDoctor1, mockDoctor2],
        total: 2,
        limit: 12,
        offset: 0,
      });
      vi.spyOn(doctorsApi, 'getSpecialtiesApi').mockResolvedValue(mockSpecialties);
      vi.spyOn(doctorsApi, 'getLanguagesApi').mockResolvedValue(mockLanguages);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <DoctorDiscoveryPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Dr. Sarah Mitchell, MD')).toBeInTheDocument();
      });
      expect(screen.getByText('Dr. James Wilson, MD')).toBeInTheDocument();
      expect(screen.getByText(/Doctor Discovery/i)).toBeInTheDocument();
    });

    it('filters doctors by search input on the page', async () => {
      vi.spyOn(doctorsApi, 'searchDoctorsApi').mockResolvedValue({
        data: [mockDoctor1, mockDoctor2],
        total: 2,
        limit: 12,
        offset: 0,
      });
      vi.spyOn(doctorsApi, 'getSpecialtiesApi').mockResolvedValue(mockSpecialties);
      vi.spyOn(doctorsApi, 'getLanguagesApi').mockResolvedValue(mockLanguages);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <DoctorDiscoveryPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Dr. Sarah Mitchell, MD')).toBeInTheDocument();
      });

      const searchInput = screen.getByLabelText(/Search Doctor Name/i);
      fireEvent.change(searchInput, { target: { value: 'Wilson' } });

      expect(screen.queryByText('Dr. Sarah Mitchell, MD')).not.toBeInTheDocument();
      expect(screen.getByText('Dr. James Wilson, MD')).toBeInTheDocument();
    });

    it('renders empty state when search matches no doctors', async () => {
      vi.spyOn(doctorsApi, 'searchDoctorsApi').mockResolvedValue({
        data: [],
        total: 0,
        limit: 12,
        offset: 0,
      });
      vi.spyOn(doctorsApi, 'getSpecialtiesApi').mockResolvedValue(mockSpecialties);
      vi.spyOn(doctorsApi, 'getLanguagesApi').mockResolvedValue(mockLanguages);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <DoctorDiscoveryPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/No doctors currently registered/i)).toBeInTheDocument();
      });
    });
  });

  describe('DoctorProfilePage', () => {
    it('renders doctor details, qualifications, and booking limitation notice', async () => {
      vi.spyOn(doctorsApi, 'getDoctorByIdApi').mockResolvedValue(mockDoctor1);
      vi.spyOn(doctorsApi, 'getDoctorAvailabilityApi').mockResolvedValue(mockAvailability);
      vi.spyOn(doctorsApi, 'getDoctorOffersApi').mockResolvedValue(mockOffers);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/doctors/DOC-12345678']}>
            <Routes>
              <Route path="/doctors/:doctorId" element={<DoctorProfilePage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Dr. Sarah Mitchell, MD' })).toBeInTheDocument();
      });

      expect(screen.getByText(/Specialist in preventative cardiology/i)).toBeInTheDocument();
      expect(screen.getByText(/Stanford University School of Medicine/i)).toBeInTheDocument();
      expect(screen.getByText('2010')).toBeInTheDocument();
      expect(screen.getByText('USD 120.00')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText(/Comprehensive Cardiovascular Consultation/i)).toBeInTheDocument();
      });

      // Verify Phase 7 Book Consultation link is present and points to booking page
      const bookingLink = screen.getByRole('link', { name: /Book Consultation/i });
      expect(bookingLink).toBeInTheDocument();
      expect(bookingLink).toHaveAttribute('href', '/doctors/DOC-12345678/book');
    });

    it('renders 404 error state for non-existent doctor', async () => {
      vi.spyOn(doctorsApi, 'getDoctorByIdApi').mockRejectedValue(
        new Error("Doctor not found with identifier 'DOC-NONEXISTENT'")
      );

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/doctors/DOC-NONEXISTENT']}>
            <Routes>
              <Route path="/doctors/:doctorId" element={<DoctorProfilePage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Physician Profile Unavailable/i)).toBeInTheDocument();
      });
      expect(screen.getByRole('link', { name: /Back to Doctor Discovery/i })).toBeInTheDocument();
    });
  });
});
