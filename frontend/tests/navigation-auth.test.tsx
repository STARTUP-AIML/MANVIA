import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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

vi.mock('@/api/wellness', async () => {
  const actual = await vi.importActual('@/api/wellness');
  return {
    ...actual,
    getWellnessSummaryApi: vi.fn().mockResolvedValue({
      latestCheckIn: null,
      todayCheckIn: null,
      streakDays: 0,
      totalCheckIns: 0,
    }),
    getWellnessTrendsApi: vi.fn().mockResolvedValue({
      period: 'WEEK',
      totalCheckIns: 0,
      hasSufficientData: false,
      averageMood: null,
      averageStress: null,
      averageEnergy: null,
      averageSleepQuality: null,
      averageSleepDurationMinutes: null,
      previousPeriodComparison: null,
      descriptiveInsights: [],
    }),
    getWellnessCheckInsApi: vi.fn().mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    }),
  };
});

vi.mock('@/api/timeline', async () => {
  const actual = await vi.importActual('@/api/timeline');
  return {
    ...actual,
    getHealthTimelineApi: vi.fn().mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    }),
  };
});

vi.mock('@/features/ai-companion', async () => {
  const actual = await vi.importActual('@/features/ai-companion');
  return {
    ...actual,
    useAiConversationsQuery: vi.fn().mockReturnValue({
      data: { data: [] },
      isLoading: false,
      isError: false,
    }),
    useAiConversationQuery: vi.fn().mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    }),
    useCreateConversationMutation: vi.fn().mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    }),
    useSendAiMessageMutation: vi.fn().mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    }),
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

describe('Navigation & Auth Protection — Canonical /app/* Routing', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('renders landing page on root route /', () => {
    renderAppWithRoute('/');
    expect(screen.getByText(/Your health journey,/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open Wellness Hub/i })).toBeInTheDocument();
  });

  it('redirects unauthenticated user accessing /app to login', async () => {
    renderAppWithRoute('/app');
    await waitFor(() => {
      expect(screen.getByText('Welcome to MANVIA')).toBeInTheDocument();
    });
  });

  it('redirects unauthenticated user accessing /wellness to login', async () => {
    renderAppWithRoute('/wellness');
    await waitFor(() => {
      expect(screen.getByText('Welcome to MANVIA')).toBeInTheDocument();
    });
  });

  it('redirects unauthenticated user accessing /health-timeline to login', async () => {
    renderAppWithRoute('/health-timeline');
    await waitFor(() => {
      expect(screen.getByText('Welcome to MANVIA')).toBeInTheDocument();
    });
  });

  it('allows authenticated patient to access /app and renders PatientHomeRoute without stale Phase 0 shell', async () => {
    sessionStorage.setItem(
      'manvia_auth_user',
      JSON.stringify({
        id: 'pat-auth-test',
        email: 'patient.auth@manvia.health',
        roles: ['PATIENT'],
      })
    );
    sessionStorage.setItem('manvia_auth_token', 'test-valid-bearer-token');

    renderAppWithRoute('/app');
    await waitFor(() => {
      expect(screen.getByTestId('patient-home-dashboard')).toBeInTheDocument();
    });
    // Ensure stale Phase-0 shell is NOT rendered
    expect(screen.queryByText('Phase 0 Shell Active')).not.toBeInTheDocument();
    expect(screen.queryByText(/Planned: Phase 2/i)).not.toBeInTheDocument();
  });

  it('allows authenticated patient to access /wellness and /health-timeline inside PatientShell', async () => {
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
    // PatientShell sidebar title is "Patient Care"
    expect(screen.getByText('Patient Care')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Health Timeline/i })[0]).toBeInTheDocument();
  });

  it('patient navigation links point to canonical /app/* paths', async () => {
    sessionStorage.setItem(
      'manvia_auth_user',
      JSON.stringify({
        id: 'pat-auth-test',
        email: 'patient.auth@manvia.health',
        roles: ['PATIENT'],
      })
    );
    sessionStorage.setItem('manvia_auth_token', 'test-valid-bearer-token');

    renderAppWithRoute('/app');
    await waitFor(() => {
      expect(screen.getByTestId('patient-home-dashboard')).toBeInTheDocument();
    });

    const sidebar = screen.getByRole('complementary', { name: /Patient Care/i });
    const homeLink = within(sidebar).getByRole('link', { name: /Home/i });
    expect(homeLink).toHaveAttribute('href', '/app');

    const aiLink = within(sidebar).getByRole('link', { name: /AI Companion/i });
    expect(aiLink).toHaveAttribute('href', '/app/ai');

    const wellnessLink = within(sidebar).getByRole('link', { name: /Wellness/i });
    expect(wellnessLink).toHaveAttribute('href', '/app/wellness');

    const timelineLink = within(sidebar).getByRole('link', { name: /Health Timeline/i });
    expect(timelineLink).toHaveAttribute('href', '/app/health-timeline');

    const doctorsLink = within(sidebar).getByRole('link', { name: /Find Doctors/i });
    expect(doctorsLink).toHaveAttribute('href', '/app/doctors');

    const appointmentsLink = within(sidebar).getByRole('link', { name: /Appointments/i });
    expect(appointmentsLink).toHaveAttribute('href', '/app/appointments');

    const recordsLink = within(sidebar).getByRole('link', { name: /Health Records/i });
    expect(recordsLink).toHaveAttribute('href', '/app/health-records');

    const accountLink = within(sidebar).getByRole('link', { name: /Account/i });
    expect(accountLink).toHaveAttribute('href', '/app/account');
  });

  it('preserves legacy Account route by redirecting to /app/account', async () => {
    sessionStorage.setItem(
      'manvia_auth_user',
      JSON.stringify({
        id: 'pat-auth-test',
        email: 'patient.auth@manvia.health',
        roles: ['PATIENT'],
      })
    );
    sessionStorage.setItem('manvia_auth_token', 'test-valid-bearer-token');

    renderAppWithRoute('/account');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Account & Profile/i })).toBeInTheDocument();
    });
    expect(screen.getAllByText('patient.auth@manvia.health')[0]).toBeInTheDocument();
  });

  it('preserves legacy AI Companion route by redirecting to /app/ai', async () => {
    sessionStorage.setItem(
      'manvia_auth_user',
      JSON.stringify({
        id: 'pat-auth-test',
        email: 'patient.auth@manvia.health',
        roles: ['PATIENT'],
      })
    );
    sessionStorage.setItem('manvia_auth_token', 'test-valid-bearer-token');

    renderAppWithRoute('/ai-companion');
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /MANVIA AI Companion/i })
      ).toBeInTheDocument();
    });
  });

  it('blocks patient from accessing doctor and admin areas', async () => {
    sessionStorage.setItem(
      'manvia_auth_user',
      JSON.stringify({
        id: 'pat-auth-test',
        email: 'patient.auth@manvia.health',
        roles: ['PATIENT'],
      })
    );
    sessionStorage.setItem('manvia_auth_token', 'test-valid-bearer-token');

    renderAppWithRoute('/doctor');
    await waitFor(() => {
      expect(screen.getByText(/Access Restricted/i)).toBeInTheDocument();
    });
  });

  it('renders NotFound on unknown subpaths under /app and unknown global routes', async () => {
    sessionStorage.setItem(
      'manvia_auth_user',
      JSON.stringify({
        id: 'pat-auth-test',
        email: 'patient.auth@manvia.health',
        roles: ['PATIENT'],
      })
    );
    sessionStorage.setItem('manvia_auth_token', 'test-valid-bearer-token');

    renderAppWithRoute('/app/unknown-subroute');
    await waitFor(() => {
      expect(screen.getByText('Page Not Found')).toBeInTheDocument();
    });
  });
});
