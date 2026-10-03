import { useState } from 'react';
import type { WellnessCheckInResponse } from '@/types/wellness';
import { useWellnessCheckIns, useDeleteWellnessCheckIn } from '@/hooks/useWellness';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { EmptyState } from '@/components/common/EmptyState';
import { formatDateTime, formatDurationMinutes, getUserTimezone } from '@/lib/date';
import { EditCheckInModal } from './EditCheckInModal';

export function WellnessHistoryTable({
  onOpenCheckIn,
}: {
  onOpenCheckIn: () => void;
}) {
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [editingItem, setEditingItem] = useState<WellnessCheckInResponse | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const timezone = getUserTimezone();
  const { data, isLoading, isError, error, refetch } = useWellnessCheckIns({
    page,
    limit,
    timezone,
  });

  const deleteMutation = useDeleteWellnessCheckIn();

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      setDeleteConfirmId(null);
    } catch {
      // Handled in mutation state
    }
  };

  const getMetricBadge = (val: number, label: string) => (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '11px',
        padding: '3px 8px',
        borderRadius: '8px',
        background: '#f1f5f9',
        color: '#1e293b',
        fontWeight: 600,
      }}
    >
      <span style={{ color: '#64748b' }}>{label}:</span>
      <span>{val}/5</span>
    </span>
  );

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '20px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div className="eyebrow">HISTORICAL RECORDS</div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '2px 0 0', color: '#073a78' }}>
            Check-in History
          </h2>
        </div>

        <button
          type="button"
          onClick={onOpenCheckIn}
          className="primary small"
          style={{ padding: '8px 16px' }}
        >
          + New Check-in
        </button>
      </div>

      {isLoading && <LoadingSpinner message="Loading historical check-ins..." />}

      {isError && (
        <ErrorAlert
          title="Could not load check-in history"
          message={error.message}
          onRetry={() => refetch()}
        />
      )}

      {data && !isLoading && (
        <>
          {data.data.length === 0 ? (
            <EmptyState
              title="No wellness check-ins yet"
              description="Start recording your daily mood, stress, energy, and sleep to view trends and longitudinal history."
              actionLabel="Log your first check-in"
              onAction={onOpenCheckIn}
              icon="◌"
            />
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontSize: '13px',
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <th style={{ padding: '12px 14px' }}>Date & Time</th>
                      <th style={{ padding: '12px 14px' }}>Core Metrics</th>
                      <th style={{ padding: '12px 14px' }}>Sleep Duration</th>
                      <th style={{ padding: '12px 14px' }}>Reflection / Note</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((item) => (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '14px', fontWeight: 600, color: '#073a78', whiteSpace: 'nowrap' }}>
                          {formatDateTime(item.recordedAt)}
                        </td>
                        <td style={{ padding: '14px' }}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {getMetricBadge(item.mood, 'Mood')}
                            {getMetricBadge(item.stress, 'Stress')}
                            {getMetricBadge(item.energy, 'Energy')}
                            {getMetricBadge(item.sleepQuality, 'Sleep')}
                          </div>
                        </td>
                        <td style={{ padding: '14px', color: '#475569', whiteSpace: 'nowrap' }}>
                          {formatDurationMinutes(item.sleepDurationMinutes)}
                        </td>
                        <td style={{ padding: '14px', color: '#475569', maxWidth: '280px' }}>
                          {item.note ? (
                            <span style={{ fontStyle: 'normal', color: '#334155' }}>{item.note}</span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>None</span>
                          )}
                        </td>
                        <td style={{ padding: '14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {deleteConfirmId === item.id ? (
                            <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                              <span style={{ fontSize: '11px', color: '#be123c', fontWeight: 600 }}>Confirm?</span>
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id)}
                                disabled={deleteMutation.isPending}
                                style={{
                                  border: '1px solid #f43f5e',
                                  background: '#fff1f2',
                                  color: '#e11d48',
                                  borderRadius: '6px',
                                  padding: '3px 8px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                style={{
                                  border: '1px solid #cbd5e1',
                                  background: '#fff',
                                  color: '#64748b',
                                  borderRadius: '6px',
                                  padding: '3px 8px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'inline-flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => setEditingItem(item)}
                                style={{
                                  border: '1px solid #cbd5e1',
                                  background: '#fff',
                                  color: '#096ed3',
                                  borderRadius: '8px',
                                  padding: '4px 10px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(item.id)}
                                style={{
                                  border: '1px solid #fee2e2',
                                  background: '#fff',
                                  color: '#e11d48',
                                  borderRadius: '8px',
                                  padding: '4px 10px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '20px',
                  paddingTop: '16px',
                  borderTop: '1px solid #f1f5f9',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Showing page {data.page} of {data.totalPages} ({data.total} total check-ins)
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    disabled={data.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      background: data.page <= 1 ? '#f8fafc' : '#fff',
                      color: data.page <= 1 ? '#94a3b8' : '#073a78',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: data.page <= 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ← Previous
                  </button>
                  <button
                    type="button"
                    disabled={data.page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      background: data.page >= data.totalPages ? '#f8fafc' : '#fff',
                      color: data.page >= data.totalPages ? '#94a3b8' : '#073a78',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: data.page >= data.totalPages ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {editingItem && (
        <EditCheckInModal
          checkIn={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}
