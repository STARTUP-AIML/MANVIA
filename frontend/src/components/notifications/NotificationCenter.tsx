import React, { useState } from 'react';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from '@/hooks';
import type { NotificationResponseDto } from '@/types';

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading, isError, refetch } = useNotifications({
    unreadOnly: unreadOnly ? true : undefined,
    limit: 20,
  });

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotif = useDeleteNotification();

  const notifications = data?.data ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      refetch();
    }
  };

  const handleMarkRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markRead.mutate(id);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotif.mutate(id);
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  return (
    <div style={{ position: 'relative' }} data-testid="notification-center">
      <button
        type="button"
        onClick={handleToggle}
        data-testid="notification-bell-button"
        aria-label="Open notifications"
        style={{
          background: 'transparent',
          border: '1px solid #e2e8f0',
          borderRadius: '50%',
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          fontSize: '16px',
          color: '#334155',
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            data-testid="notification-badge"
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              borderRadius: '9999px',
              fontSize: '10px',
              fontWeight: 700,
              minWidth: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: '2px solid #ffffff',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 998,
            }}
          />
          <div
            data-testid="notification-dropdown"
            style={{
              position: 'absolute',
              top: '44px',
              right: 0,
              width: '380px',
              maxWidth: '90vw',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
              zIndex: 999,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '520px',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#fafafa',
              }}
            >
              <div>
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span
                    style={{
                      marginLeft: '8px',
                      fontSize: '11px',
                      backgroundColor: '#e0f2fe',
                      color: '#0369a1',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {unreadCount} unread
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  data-testid="mark-all-read-button"
                  onClick={handleMarkAllRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#096ed3',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid #f1f5f9',
                padding: '0 16px',
                gap: '12px',
                backgroundColor: '#ffffff',
              }}
            >
              <button
                type="button"
                onClick={() => setUnreadOnly(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: !unreadOnly ? '2px solid #096ed3' : '2px solid transparent',
                  padding: '8px 4px',
                  fontSize: '12px',
                  fontWeight: !unreadOnly ? 700 : 500,
                  color: !unreadOnly ? '#096ed3' : '#64748b',
                  cursor: 'pointer',
                }}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setUnreadOnly(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: unreadOnly ? '2px solid #096ed3' : '2px solid transparent',
                  padding: '8px 4px',
                  fontSize: '12px',
                  fontWeight: unreadOnly ? 700 : 500,
                  color: unreadOnly ? '#096ed3' : '#64748b',
                  cursor: 'pointer',
                }}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Content List */}
            <div
              style={{
                overflowY: 'auto',
                flex: 1,
              }}
            >
              {isLoading ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  Loading notifications...
                </div>
              ) : isError ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#ef4444', fontSize: '13px' }}>
                  Failed to load notifications.
                </div>
              ) : notifications.length === 0 ? (
                <div
                  data-testid="notifications-empty-state"
                  style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>📬</div>
                  <div>No notifications right now</div>
                </div>
              ) : (
                notifications.map((item: NotificationResponseDto) => (
                  <div
                    key={item.id}
                    data-testid={`notification-item-${item.id}`}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: item.isRead ? '#ffffff' : '#f8fafc',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {!item.isRead && (
                      <span
                        data-testid="unread-indicator"
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#096ed3',
                          marginTop: '6px',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: item.isRead ? 600 : 700,
                          color: '#1e293b',
                          marginBottom: '2px',
                        }}
                      >
                        {item.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                        {item.body}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginTop: '6px',
                          fontSize: '11px',
                          color: '#94a3b8',
                        }}
                      >
                        <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>•</span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            color:
                              item.severity === 'CRITICAL' || item.severity === 'HIGH'
                                ? '#b91c1c'
                                : '#0369a1',
                          }}
                        >
                          {item.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {!item.isRead && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkRead(item.id, e)}
                          title="Mark read"
                          data-testid={`mark-read-${item.id}`}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '13px',
                            color: '#096ed3',
                            padding: '2px 4px',
                          }}
                        >
                          ✓
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(item.id, e)}
                        title="Delete"
                        data-testid={`delete-${item.id}`}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '13px',
                          color: '#94a3b8',
                          padding: '2px 4px',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
