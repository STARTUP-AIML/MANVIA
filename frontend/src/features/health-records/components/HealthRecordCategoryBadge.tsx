import type { HealthRecordCategory } from '@/types/healthRecords';
import { HEALTH_RECORD_CATEGORY_LABELS } from '@/types/healthRecords';

interface HealthRecordCategoryBadgeProps {
  category: HealthRecordCategory;
}

export function HealthRecordCategoryBadge({ category }: HealthRecordCategoryBadgeProps) {
  const styles: Record<HealthRecordCategory, { bg: string; color: string; border: string; icon: string }> = {
    LAB_REPORT: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', icon: '🧪' },
    PRESCRIPTION: { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', icon: '💊' },
    CLINICAL_SUMMARY: { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', icon: '📋' },
    IMAGING: { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd', icon: '🩻' },
    DISCHARGE_SUMMARY: { bg: '#fffbeb', color: '#b45309', border: '#fde68a', icon: '🏥' },
    OTHER: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', icon: '📄' },
  };

  const current = styles[category] || styles.OTHER;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 9px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: current.bg,
        color: current.color,
        border: `1px solid ${current.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden="true">{current.icon}</span>
      {HEALTH_RECORD_CATEGORY_LABELS[category] || category}
    </span>
  );
}
