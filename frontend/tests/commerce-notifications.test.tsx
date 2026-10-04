import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import * as notifApi from '@/api/notifications';

vi.mock('@/api/notifications', () => ({
  getNotificationsApi: vi.fn(),
  getNotificationByIdApi: vi.fn(),
  markNotificationReadApi: vi.fn(),
  markAllNotificationsReadApi: vi.fn(),
  deleteNotificationApi: vi.fn(),
  getNotificationPreferencesApi: vi.fn(),
  updateNotificationPreferencesApi: vi.fn(),
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe('NotificationCenter Component (Frontend M5)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('renders notification bell icon and unread count badge', async () => {
    vi.mocked(notifApi.getNotificationsApi).mockResolvedValue({
      data: [
        {
          id: 'notif-1',
          publicNotificationId: 'NOT-12345678',
          userId: 'user-1',
          type: 'APPOINTMENT_CONFIRMED',
          title: 'Appointment Confirmed',
          body: 'Your consultation with Dr. House has been confirmed.',
          severity: 'INFO',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      unreadCount: 1,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <NotificationCenter />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('notification-bell-button')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('notification-badge')).toHaveTextContent('1');
    });
  });

  it('opens drawer and displays notification items with mark read and mark all read controls', async () => {
    vi.mocked(notifApi.getNotificationsApi).mockResolvedValue({
      data: [
        {
          id: 'notif-1',
          publicNotificationId: 'NOT-12345678',
          userId: 'user-1',
          type: 'PAYMENT_SUCCESS',
          title: 'Payment Succeeded',
          body: 'Invoice INV-202610-001 issued.',
          severity: 'INFO',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      unreadCount: 1,
    });
    vi.mocked(notifApi.markNotificationReadApi).mockResolvedValue({
      id: 'notif-1',
      publicNotificationId: 'NOT-12345678',
      userId: 'user-1',
      type: 'PAYMENT_SUCCESS',
      title: 'Payment Succeeded',
      body: 'Invoice INV-202610-001 issued.',
      severity: 'INFO',
      isRead: true,
      readAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <NotificationCenter />
      </QueryClientProvider>,
    );

    const bell = screen.getByTestId('notification-bell-button');
    fireEvent.click(bell);

    expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Payment Succeeded')).toBeInTheDocument();
      expect(screen.getByText('Invoice INV-202610-001 issued.')).toBeInTheDocument();
    });

    const markReadBtn = screen.getByTestId('mark-read-notif-1');
    fireEvent.click(markReadBtn);
    await waitFor(() => {
      expect(notifApi.markNotificationReadApi).toHaveBeenCalledWith('notif-1');
    });
  });

  it('displays empty state when there are no notifications', async () => {
    vi.mocked(notifApi.getNotificationsApi).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
      unreadCount: 0,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <NotificationCenter />
      </QueryClientProvider>,
    );

    const bell = screen.getByTestId('notification-bell-button');
    fireEvent.click(bell);

    await waitFor(() => {
      expect(screen.getByTestId('notifications-empty-state')).toBeInTheDocument();
      expect(screen.getByText('No notifications right now')).toBeInTheDocument();
    });
  });
});
