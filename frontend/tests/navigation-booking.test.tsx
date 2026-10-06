import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/auth/AuthContext';
import App from '@/app/app';

vi.mock('@/auth/authService', async () => {
  const actual = await vi.importActual<typeof import('@/auth/authService')>('@/auth/authService');
  return {
    ...actual,
    authService: {
      ...actual.authService,
      getMe: vi.fn().mockImplementation(async () => {
        const storedUser = sessionStorage.getItem('manvia_auth_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            return {
              id: parsed.id || 'pat-auth-test',
              email: parsed.email || 'patient.auth@manvia.health',
              phone: null,
              roles: parsed.roles || ['PATIENT'],
              emailVerified: true,
              phoneVerified: false,
              status: 'ACTIVE',
              createdAt: new Date().toISOString(),
            };
          } catch {
            // ignore
          }
        }
        return {
          id: 'pat-auth-test',
          email: 'patient.auth@manvia.health',
          phone: null,
          roles: ['PATIENT'],
          emailVerified: true,
          phoneVerified: false,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        };
      }),
    },
  };
});

vi.mock('@/api/doctors', async () => {
  const actual = await vi.importActual('@/api/doctors');
  return {
    ...actual,
    getDoctorByIdApi: vi.fn().mockResolvedValue({
      publicDoctorId: 'DOC-NAV-TEST',
      displayName: 'Dr. Emily Carter, MD',
      bio: 'Pediatric specialist.',
      primarySpecialty: 'Pediatrics',
      subSpecialties: [],
      languages: ['English'],
      yearsOfExperience: 10,
      defaultConsultationFee: 90,
      currency: 'USD',
      verificationStatus: 'VERIFIED',
      qualifications: [],
    }),
    getDoctorAvailabilityApi: vi.fn().mockResolvedValue([]),
    getDoctorOffersApi: vi.fn().mockResolvedValue([]),
  };
});

function renderAppWithRoute(initialRoute: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <App />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Booking Navigation & Route Protection — Phase 7', () => {
  it('redirects unauthenticated user accessing /doctors/:doctorId/book to login', async () => {
    sessionStorage.clear();
    renderAppWithRoute('/doctors/DOC-NAV-TEST/book');
    expect(screen.getByText('Welcome to MANVIA')).toBeInTheDocument();
  });

  it('allows authenticated patient to access /doctors/:doctorId/book', async () => {
    sessionStorage.setItem(
      'manvia_auth_user',
      JSON.stringify({
        id: 'pat-auth-test',
        email: 'patient.auth@manvia.health',
        roles: ['PATIENT'],
      })
    );
    sessionStorage.setItem('manvia_auth_token', 'test-valid-bearer-token');

    renderAppWithRoute('/doctors/DOC-NAV-TEST/book');
    await waitFor(() => {
      expect(screen.getByText('Book with Dr. Emily Carter, MD')).toBeInTheDocument();
    });
    expect(screen.getByText(/step 1: choose a consultation offer/i)).toBeInTheDocument();
  });

  it('supports deep-linking via /care/doctors/:doctorId/book route', async () => {
    sessionStorage.setItem(
      'manvia_auth_user',
      JSON.stringify({
        id: 'pat-auth-test',
        email: 'patient.auth@manvia.health',
        roles: ['PATIENT'],
      })
    );
    sessionStorage.setItem('manvia_auth_token', 'test-valid-bearer-token');

    renderAppWithRoute('/care/doctors/DOC-NAV-TEST/book');
    await waitFor(() => {
      expect(screen.getByText('Book with Dr. Emily Carter, MD')).toBeInTheDocument();
    });
  });

  it('blocks non-patient (DOCTOR role) from patient booking flow with Access Restricted', async () => {
    sessionStorage.setItem(
      'manvia_auth_user',
      JSON.stringify({
        id: 'doc-auth-test',
        email: 'doctor.auth@manvia.health',
        roles: ['DOCTOR'],
      })
    );
    sessionStorage.setItem('manvia_auth_token', 'test-valid-bearer-token');

    renderAppWithRoute('/doctors/DOC-NAV-TEST/book');
    await waitFor(() => {
      expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
    });
  });
});
