import React, { useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  useDoctorDetail,
  useDoctorAvailability,
  useDoctorOffers,
} from '@/hooks/useDoctors';
import { DoctorVerificationBadge } from '@/features/doctors/components/DoctorVerificationBadge';
import { DoctorAvailabilityPreview } from '@/features/doctors/components/DoctorAvailabilityPreview';
import { DoctorOffersPreview } from '@/features/doctors/components/DoctorOffersPreview';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';

export const DoctorProfilePage: React.FC = () => {
  const { doctorId } = useParams<{ doctorId: string }>();
  const location = useLocation();
  const [imageError, setImageError] = useState(false);

  const {
    data: doctor,
    isLoading: isLoadingDoctor,
    isError,
    error,
    refetch,
  } = useDoctorDetail(doctorId);

  const {
    data: availability = [],
    isLoading: isLoadingAvailability,
  } = useDoctorAvailability(doctor?.publicDoctorId);

  const {
    data: offers = [],
    isLoading: isLoadingOffers,
  } = useDoctorOffers(doctor?.publicDoctorId);

  const backPath = location.pathname.startsWith('/app') ? '/app/doctors' : '/doctors';

  if (isLoadingDoctor) {
    return <LoadingSpinner message="Retrieving physician profile..." />;
  }

  if (isError || !doctor) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 0' }}>
        <Link
          to={backPath}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#096ed3',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
            marginBottom: '20px',
          }}
        >
          &larr; Back to Doctor Discovery
        </Link>
        <ErrorAlert
          title="Physician Profile Unavailable"
          message={
            error instanceof Error
              ? error.message
              : 'Could not locate the requested doctor profile. Please return to the directory.'
          }
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const primarySpec = doctor.primarySpecialty || 'General Practice';

  const formatFeeDisplay = () => {
    if (doctor.defaultConsultationFee <= 0) {
      return 'Consultation fee provided upon request';
    }
    if (doctor.currency === 'INR') {
      return `₹ ${Number(doctor.defaultConsultationFee).toLocaleString('en-IN')}`;
    }
    return `${doctor.currency} ${Number(doctor.defaultConsultationFee).toFixed(2)}`;
  };

  const getInitials = (name: string) => {
    const clean = name.replace(/^Dr\.\s*/i, '').trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]?.[0] || ''}${parts[parts.length - 1]?.[0] || ''}`.toUpperCase();
    }
    return (parts[0]?.substring(0, 2) || 'DR').toUpperCase();
  };

  const bookingPath = location.pathname.startsWith('/app')
    ? `/app/doctors/${doctor.publicDoctorId}/book`
    : `/doctors/${doctor.publicDoctorId}/book`;

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '80px' }}>
      {/* Back Link */}
      <div style={{ marginBottom: '20px' }}>
        <Link
          to={backPath}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#096ed3',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          &larr; Back to Doctor Discovery
        </Link>
      </div>

      {/* Healthcare Integrity / Demonstration Environment Notice */}
      {doctor.isDemo && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            backgroundColor: '#fef3c7',
            borderRadius: '12px',
            border: '1px solid #fde68a',
            color: '#92400e',
            fontSize: '13px',
            marginBottom: '20px',
          }}
          role="note"
          aria-label="Fictional Demo Clinician Notice"
        >
          <span style={{ fontSize: '16px' }}>ℹ️</span>
          <div>
            <strong>Demo clinician ({doctor.displayName}):</strong> Demonstration environment profile designed for evaluation of consultation scheduling and care pathways.
          </div>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          padding: '32px',
          marginBottom: '28px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '20px',
            marginBottom: '16px',
          }}
        >
          {/* Avatar & Title Group */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            {/* Large Avatar */}
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                overflow: 'hidden',
                backgroundColor: '#e0f2fe',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '22px',
                flexShrink: 0,
                border: '3px solid #bae6fd',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
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

            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    color: '#073a78',
                    backgroundColor: '#e0f2fe',
                    padding: '4px 10px',
                    borderRadius: '6px',
                  }}
                >
                  {primarySpec}
                </span>

                <DoctorVerificationBadge status={doctor.verificationStatus} />

                {doctor.isDemo && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: '#b45309',
                      backgroundColor: '#fef3c7',
                      border: '1px solid #fde68a',
                      padding: '3px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    Demo Clinician
                  </span>
                )}
              </div>

              <h1
                style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  color: '#0f172a',
                  margin: '0 0 6px 0',
                  letterSpacing: '-0.5px',
                }}
              >
                {doctor.displayName}
              </h1>

              <div
                style={{
                  fontSize: '12px',
                  color: '#94a3b8',
                  fontFamily: 'monospace',
                }}
              >
                Identifier: {doctor.publicDoctorId}
              </div>
            </div>
          </div>

          {/* Quick Metrics Badge */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#f8fafc',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              textAlign: 'right',
            }}
          >
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>
              Base Consultation
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
              {formatFeeDisplay()}
            </div>
          </div>
        </div>

        {/* Doctor Bio */}
        {doctor.bio && (
          <div style={{ marginTop: '20px' }}>
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#334155',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px',
              }}
            >
              About the Physician
            </h3>
            <p
              style={{
                fontSize: '14px',
                lineHeight: '1.6',
                color: '#475569',
                margin: 0,
              }}
            >
              {doctor.bio}
            </p>
          </div>
        )}

        {/* Practice Highlights Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid #f1f5f9',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
              Years of Experience
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
              {doctor.yearsOfExperience > 0
                ? `${doctor.yearsOfExperience} Years Clinical Practice`
                : 'Licensed Practice'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
              Spoken Languages
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
              {doctor.languages && doctor.languages.length > 0
                ? doctor.languages.join(', ')
                : 'English'}
            </div>
          </div>

          {doctor.clinicName && (
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                Clinic / Workplace
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                {doctor.clinicName}
                {doctor.city ? ` (${doctor.city}, ${doctor.state})` : ''}
              </div>
            </div>
          )}

          {doctor.contactDisplay && (
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                Demo Contact ID
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f766e', fontFamily: 'monospace' }}>
                {doctor.contactDisplay}
              </div>
            </div>
          )}

          {doctor.clinicalInterests && doctor.clinicalInterests.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                Clinical Focus
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0284c7' }}>
                {doctor.clinicalInterests.join(' • ')}
              </div>
            </div>
          )}

          {doctor.subSpecialties && doctor.subSpecialties.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                Secondary Specialties
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0369a1' }}>
                {doctor.subSpecialties.join(' • ')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Qualifications Section */}
      {doctor.qualifications && doctor.qualifications.length > 0 && (
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 16px 0',
            }}
          >
            Education & Board Certifications
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {doctor.qualifications.map((q, idx) => (
              <div
                key={idx}
                style={{
                  padding: '14px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
                    {q.qualification}
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    {q.institution}
                    {q.fieldOfStudy ? ` — ${q.fieldOfStudy}` : ''}
                  </div>
                </div>

                {q.graduationYear && (
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#475569',
                      backgroundColor: '#e2e8f0',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontWeight: 600,
                    }}
                  >
                    {q.graduationYear}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consultation Offers Section */}
      <DoctorOffersPreview offers={offers} isLoading={isLoadingOffers} />

      {/* Availability Schedule Preview Section */}
      <DoctorAvailabilityPreview
        availability={availability}
        isLoading={isLoadingAvailability}
      />

      {/* Consultation Booking Action */}
      <div
        style={{
          padding: '24px',
          backgroundColor: '#f0fdfa',
          borderRadius: '16px',
          border: '1px solid #ccfbf1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ fontWeight: 700, color: '#0f766e', fontSize: '15px', marginBottom: '2px' }}>
            Ready to consult with {doctor.displayName}?
          </div>
          <div style={{ fontSize: '13px', color: '#115e59' }}>
            Select an active consultation offer and reserve an available appointment slot.
          </div>
        </div>

        <Link
          to={bookingPath}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 24px',
            borderRadius: '12px',
            backgroundColor: '#0d9488',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '14px',
            textDecoration: 'none',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            transition: 'background-color 0.15s ease',
          }}
        >
          Book Consultation
        </Link>
      </div>
    </div>
  );
};
