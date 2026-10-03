import React from 'react';
import { Link } from 'react-router-dom';
import type { DoctorPublic } from '@/types/doctors';
import { DoctorVerificationBadge } from './DoctorVerificationBadge';

interface DoctorCardProps {
  doctor: DoctorPublic;
}

export const DoctorCard: React.FC<DoctorCardProps> = ({ doctor }) => {
  const primarySpec = doctor.primarySpecialty || 'General Practice';
  const feeDisplay =
    doctor.defaultConsultationFee > 0
      ? `${doctor.currency} ${doctor.defaultConsultationFee.toFixed(2)}`
      : 'Consultation upon request';

  return (
    <article
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div>
        {/* Top Header: Specialty & Verification Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              color: '#073a78',
              backgroundColor: '#e0f2fe',
              padding: '3px 8px',
              borderRadius: '6px',
            }}
          >
            {primarySpec}
          </span>
          <DoctorVerificationBadge status={doctor.verificationStatus} size="sm" />
        </div>

        {/* Doctor Name & Identifier */}
        <h3
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#0f172a',
            margin: '0 0 4px 0',
          }}
        >
          {doctor.displayName}
        </h3>
        <div
          style={{
            fontSize: '11px',
            color: '#94a3b8',
            fontFamily: 'monospace',
            marginBottom: '12px',
          }}
        >
          ID: {doctor.publicDoctorId}
        </div>

        {/* Biography Snippet */}
        {doctor.bio && (
          <p
            style={{
              fontSize: '13px',
              lineHeight: '1.5',
              color: '#475569',
              margin: '0 0 16px 0',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {doctor.bio}
          </p>
        )}

        {/* Sub-specialties tags */}
        {doctor.subSpecialties && doctor.subSpecialties.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
            {doctor.subSpecialties.map((sub, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '11px',
                  color: '#0284c7',
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                {sub}
              </span>
            ))}
          </div>
        )}

        {/* Metadata Details: Experience, Languages */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            padding: '12px',
            backgroundColor: '#f8fafc',
            borderRadius: '10px',
            marginBottom: '16px',
            fontSize: '12px',
          }}
        >
          <div>
            <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '2px' }}>
              Experience
            </div>
            <div style={{ fontWeight: 600, color: '#1e293b' }}>
              {doctor.yearsOfExperience > 0
                ? `${doctor.yearsOfExperience}+ Years`
                : 'Clinical Practice'}
            </div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '2px' }}>
              Languages
            </div>
            <div
              style={{
                fontWeight: 600,
                color: '#1e293b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {doctor.languages && doctor.languages.length > 0
                ? doctor.languages.join(', ')
                : 'English'}
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer: Fee & Action */}
      <div
        style={{
          borderTop: '1px solid #f1f5f9',
          paddingTop: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>
            Starting at
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{feeDisplay}</div>
        </div>

        <Link
          to={`/doctors/${doctor.publicDoctorId}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '9px 16px',
            borderRadius: '10px',
            backgroundColor: '#096ed3',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 700,
            textDecoration: 'none',
            transition: 'background-color 0.15s ease',
          }}
        >
          View Profile &rarr;
        </Link>
      </div>
    </article>
  );
};
