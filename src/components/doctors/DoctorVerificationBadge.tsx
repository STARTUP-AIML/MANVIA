import React from 'react';
import type { DoctorVerificationStatus } from '../../types/doctors.js';

interface DoctorVerificationBadgeProps {
  status: DoctorVerificationStatus | string;
  size?: 'sm' | 'md';
}

export const DoctorVerificationBadge: React.FC<DoctorVerificationBadgeProps> = ({
  status,
  size = 'md',
}) => {
  const normalized = (status || '').toUpperCase();

  let label = 'Unverified';
  let icon = '•';
  let bg = '#f1f5f9';
  let color = '#475569';
  let border = '#cbd5e1';

  if (normalized === 'VERIFIED') {
    label = 'Verified Physician';
    icon = '✓';
    bg = '#ecfdf5';
    color = '#047857';
    border = '#a7f3d0';
  } else if (normalized === 'PENDING_REVIEW') {
    label = 'Verification Under Review';
    icon = '⏳';
    bg = '#fffbeb';
    color = '#b45309';
    border = '#fde68a';
  } else if (normalized === 'DRAFT') {
    label = 'Draft Profile';
    icon = '✎';
    bg = '#f8fafc';
    color = '#64748b';
    border = '#e2e8f0';
  } else if (normalized === 'REJECTED') {
    label = 'Not Verified';
    icon = '✕';
    bg = '#fef2f2';
    color = '#b91c1c';
    border = '#fecaca';
  }

  const isSmall = size === 'sm';

  return (
    <span
      role="status"
      aria-label={`Doctor verification status: ${label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: isSmall ? '2px 8px' : '4px 10px',
        borderRadius: '16px',
        fontSize: isSmall ? '11px' : '12px',
        fontWeight: 600,
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: isSmall ? '10px' : '12px' }}>
        {icon}
      </span>
      <span>{label}</span>
    </span>
  );
};
