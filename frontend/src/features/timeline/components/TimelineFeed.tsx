import { useState } from 'react';
import type { TimelineEventType } from '@/types/timeline';
import { useHealthTimeline } from '@/hooks/useHealthTimeline';
import { TimelineFilterBar } from './TimelineFilterBar';
import { TimelineEventCard } from './TimelineEventCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { EmptyState } from '@/components/common/EmptyState';

export function TimelineFeed() {
  const [selectedFilter, setSelectedFilter] = useState<TimelineEventType | 'ALL'>('ALL');
  const [page, setPage] = useState<number>(1);
  const limit = 15;

  const { data, isLoading, isError, error, refetch } = useHealthTimeline({
    page,
    limit,
    eventType: selectedFilter === 'ALL' ? undefined : selectedFilter,
  });

  const handleFilterChange = (newFilter: TimelineEventType | 'ALL') => {
    setSelectedFilter(newFilter);
    setPage(1); // reset to page 1 on filter change
  };

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
      <div style={{ marginBottom: '16px' }}>
        <div className="eyebrow">CARE JOURNEY FEED</div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '4px 0 0', color: '#073a78' }}>
          Longitudinal Health Timeline
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
          A chronological unified feed of your authorized health and wellness activity.
        </p>
      </div>

      {/* Filter Tabs */}
      <TimelineFilterBar
        selected={selectedFilter}
        onSelect={handleFilterChange}
      />

      {isLoading && <LoadingSpinner message="Retrieving timeline events..." />}

      {isError && (
        <ErrorAlert
          title="Could not load health timeline"
          message={error.message}
          onRetry={() => refetch()}
        />
      )}

      {data && !isLoading && (
        <>
          {data.data.length === 0 ? (
            <EmptyState
              title="No timeline events found"
              description={
                selectedFilter === 'ALL'
                  ? 'Your health timeline is currently empty. Completing wellness check-ins or scheduling consultations will populate this feed.'
                  : `No events found for the category '${selectedFilter}'. Try selecting 'All Activity'.`
              }
              icon="◷"
            />
          ) : (
            <div style={{ position: 'relative', marginTop: '16px' }}>
              {/* Vertical connector line */}
              <div
                style={{
                  position: 'absolute',
                  top: '14px',
                  bottom: '20px',
                  left: '13px',
                  width: '2px',
                  backgroundColor: '#e2e8f0',
                  zIndex: 1,
                }}
              />

              {data.data.map((evt) => (
                <TimelineEventCard key={evt.id} event={evt} />
              ))}

              {/* Pagination controls */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '12px',
                  paddingTop: '16px',
                  borderTop: '1px solid #f1f5f9',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Page {data.page} of {data.totalPages} ({data.total} total events)
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
            </div>
          )}
        </>
      )}
    </div>
  );
}
