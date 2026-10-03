import React from 'react';
import type { DoctorConsultationOffer } from '../../types/doctors.js';

interface DoctorOffersPreviewProps {
  offers: DoctorConsultationOffer[];
  isLoading: boolean;
}

export const DoctorOffersPreview: React.FC<DoctorOffersPreviewProps> = ({
  offers,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div
        style={{
          padding: '24px',
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '13px',
        }}
      >
        Loading consultation options...
      </div>
    );
  }

  if (offers.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#0f172a',
            margin: 0,
          }}
        >
          Consultation Services & Formats
        </h3>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#475569',
            backgroundColor: '#f1f5f9',
            padding: '4px 10px',
            borderRadius: '12px',
          }}
        >
          Authoritative Service Catalog
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        {offers.map((offer) => (
          <div
            key={offer.id}
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '8px',
                  marginBottom: '8px',
                }}
              >
                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#1e293b',
                    margin: 0,
                  }}
                >
                  {offer.title}
                </h4>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#073a78',
                    backgroundColor: '#e0f2fe',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {offer.consultationType}
                </span>
              </div>

              {offer.description && (
                <p
                  style={{
                    fontSize: '12px',
                    color: '#64748b',
                    lineHeight: '1.4',
                    margin: '0 0 12px 0',
                  }}
                >
                  {offer.description}
                </p>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '10px',
                marginTop: '10px',
              }}
            >
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {offer.durationMinutes} mins
              </span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                {offer.currency} {offer.fee.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
