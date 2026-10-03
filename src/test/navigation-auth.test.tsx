import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext.js';
import App from '../App.js';

vi.mock('../api/wellness.js', async () => {
  const actual = await vi.importActual('../api/wellness.js');
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

vi.mock('../api/timeline.js', async () => {
  const actual = await vi.importActual('../api/timeline.js');
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

describe('Navigation & Auth Protection — Phase 5', () => {
  it('renders landing page on root route /', () => {
    renderAppWithRoute('/');
    expect(screen.getByText(/Your health journey,/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open Wellness Hub/i })).toBeInTheDocument();
  });

  it('redirects unauthenticated user accessing /wellness to login', async () => {
    sessionStorage.clear();
    renderAppWithRoute('/wellness');
    expect(screen.getByText('Welcome to MANVIA')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In to Wellness & Timeline/i })).toBeInTheDocument();
  });

  it('redirects unauthenticated user accessing /health-timeline to login', async () => {
    sessionStorage.clear();
    renderAppWithRoute('/health-timeline');
    expect(screen.getByText('Welcome to MANVIA')).toBeInTheDocument();
  });

  it('allows authenticated patient to access /wellness and /health-timeline', async () => {
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
    expect(screen.getByText('Patient Care Hub')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Health Timeline/i })[0]).toBeInTheDocument();
  });

  it('preserves Phase 2 Account route for authenticated patient', async () => {
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

  it('preserves Phase 4 AI Companion route', async () => {
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
      expect(screen.getByRole('heading', { name: /AI Health Companion/i })).toBeInTheDocument();
    });
  });
});

