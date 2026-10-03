import React from 'react';
import { Button } from '@/components/ui/Button';

export interface CommonEmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  icon?: string;
}

export function EmptyState({
  title = "No data found",
  description = "There are no records to display at this time.",
  action,
  actionLabel,
  onAction,
  icon = "📭",
}: CommonEmptyStateProps) {
  return (
    <div className="manvia-state-container" role="status">
      <div className="manvia-state-icon manvia-state-icon-neutral" aria-hidden="true">
        {icon}
      </div>
      <h3 className="heading-3">{title}</h3>
      <p className="body-regular">{description}</p>
      {action ? (
        <div style={{ marginTop: "0.5rem" }}>{action}</div>
      ) : actionLabel && onAction ? (
        <Button variant="primary" size="md" onClick={onAction} style={{ marginTop: "0.5rem" }}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export default EmptyState;
