import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext.js';
import App from '../App.js';

vi.mock('../api/doctors.js', async () => {
  const actual = await vi.importActual('../api/doctors.js');
  return {
    ...actual,
    searchDoctorsApi: vi.fn().mockResolvedValue({
      data: [
        {
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
        },
      ],
      total: 1,
      limit: 12,
      offset: 0,
    }),
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
    getSpecialtiesApi: vi.fn().mockResolvedValue([]),
    getLanguagesApi: vi.fn().mockResolvedValue([]),
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

describe('Doctor Navigation & Route Protection — Phase 6', () => {
  it('redirects unauthenticated user accessing /doctors to login', async () => {
    sessionStorage.clear();
    renderAppWithRoute('/doctors');
    expect(screen.getByText('Welcome to MANVIA')).toBeInTheDocument();
  });

  it('allows authenticated patient to access /doctors and displays discovery UI', async () => {
    sessionStorage.setItem(
      'manvia_auth_user',
      JSON.stringify({
        id: 'pat-auth-test',
        email: 'patient.auth@manvia.health',
        roles: ['PATIENT'],
      })
    );
    sessionStorage.setItem('manvia_auth_token', 'test-valid-bearer-token');

    renderAppWithRoute('/doctors');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Doctor Discovery/i })).toBeInTheDocument();
      expect(screen.getByText('Dr. Emily Carter, MD')).toBeInTheDocument();
    });
    expect(screen.getAllByRole('link', { name: /Find Doctors/i })[0]).toBeInTheDocument();
  });

  it('allows authenticated patient to navigate to doctor profile /doctors/:doctorId', async () => {
    sessionStorage.setItem(
      'manvia_auth_user',
      JSON.stringify({
        id: 'pat-auth-test',
        email: 'patient.auth@manvia.health',
        roles: ['PATIENT'],
      })
    );
    sessionStorage.setItem('manvia_auth_token', 'test-valid-bearer-token');

    renderAppWithRoute('/doctors/DOC-NAV-TEST');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Dr. Emily Carter, MD' })).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /Back to Doctor Discovery/i })).toBeInTheDocument();
    expect(screen.getByText(/Pediatric specialist/i)).toBeInTheDocument();
  });

  it('preserves existing Phase 5 Wellness route alongside Doctor navigation', async () => {
    sessionStorage.setItem(
      'manvia_auth_user',
      JSON.stringify({
        id: 'pat-auth-test',
        email: 'patient.auth@manvia.health',
        roles: ['PATIENT'],
      })
    );
    sessionStorage.setItem('manvia_auth_token', 'test-valid-bearer-token');

    renderAppWithRoute('/wellness');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Wellness & Daily Check-ins/i })).toBeInTheDocument();
    });
    expect(screen.getAllByRole('link', { name: /Find Doctors/i })[0]).toBeInTheDocument();
  });
});
