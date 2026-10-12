import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { DoctorPublic } from '@/types/doctors';
import { DoctorVerificationBadge } from './DoctorVerificationBadge';

interface DoctorCardProps {
  doctor: DoctorPublic;
}

export const DoctorCard: React.FC<DoctorCardProps> = ({ doctor }) => {
  const [imageError, setImageError] = useState(false);
  const primarySpec = doctor.primarySpecialty || 'General Practice';

  // Currency & fee formatting
  const formatFee = () => {
    if (doctor.defaultConsultationFee <= 0) {
      return 'Consultation upon request';
    }
    if (doctor.currency === 'INR') {
      return `₹ ${doctor.defaultConsultationFee}`;
    }
    return `${doctor.currency} ${Number(doctor.defaultConsultationFee).toFixed(2)}`;
  };

  // Get initials for fallback avatar
  const getInitials = (name: string) => {
    const clean = name.replace(/^Dr\.\s*/i, '').trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]?.[0] || ''}${parts[parts.length - 1]?.[0] || ''}`.toUpperCase();
    }
    return (parts[0]?.substring(0, 2) || 'DR').toUpperCase();
  };

  const consultationModes = doctor.consultationModes || ['VIDEO', 'IN_PERSON'];

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
        {/* Top Header: Specialty & Badges */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
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

            {/* Fictional Demo Clinician Badge for Healthcare Integrity */}
            {doctor.isDemo && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#b45309',
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fde68a',
                  padding: '2px 7px',
                  borderRadius: '6px',
                }}
                title="Fictional clinician profile provided for platform testing and demonstration."
              >
                Demo Clinician
              </span>
            )}
          </div>

          <DoctorVerificationBadge status={doctor.verificationStatus} size="sm" />
        </div>

        {/* Doctor Header: Avatar + Name + ID */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '10px' }}>
          {/* Avatar / Portrait with graceful fallback */}
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              overflow: 'hidden',
              backgroundColor: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '16px',
              flexShrink: 0,
              border: '2px solid #bae6fd',
              boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
            }}
          >
            {doctor.profileImageUrl && !imageError ? (
              <img
                src={doctor.profileImageUrl}
                alt={`Portrait of ${doctor.displayName}`}
                onError={() => setImageError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span>{getInitials(doctor.displayName)}</span>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#0f172a',
                margin: '0 0 2px 0',
                lineHeight: 1.3,
              }}
            >
              {doctor.displayName}
            </h3>
            <div
              style={{
                fontSize: '11px',
                color: '#94a3b8',
                fontFamily: 'monospace',
                letterSpacing: '0.3px',
              }}
            >
              ID: {doctor.publicDoctorId}
            </div>
          </div>
        </div>

        {/* Clinic & Location */}
        {doctor.clinicName && (
          <div
            style={{
              fontSize: '12px',
              color: '#0f766e',
              fontWeight: 600,
              marginBottom: '10px',
            }}
          >
            📍 {doctor.clinicName}{doctor.city ? ` • ${doctor.city}` : ''}
          </div>
        )}

        {/* Biography Snippet */}
        {doctor.bio && (
          <p
            style={{
              fontSize: '13px',
              lineHeight: '1.5',
              color: '#475569',
              margin: '0 0 14px 0',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {doctor.bio}
          </p>
        )}

        {/* Consultation Modes */}
        {consultationModes.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
            {consultationModes.map((mode) => (
              <span
                key={mode}
                style={{
                  fontSize: '10.5px',
                  fontWeight: 600,
                  color: '#334155',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                {mode === 'VIDEO' && '📹 Video'}
                {mode === 'IN_PERSON' && '🏥 In-Person'}
                {mode === 'AUDIO' && '📞 Audio'}
                {!['VIDEO', 'IN_PERSON', 'AUDIO'].includes(mode) && mode}
              </span>
            ))}
          </div>
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
          <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Starting at
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{formatFee()}</div>
        </div>

        <Link
          to={`/app/doctors/${doctor.publicDoctorId}`}
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
