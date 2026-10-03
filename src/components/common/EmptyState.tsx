export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon = '◌',
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: string;
}) {
  return (
    <div
      style={{
        padding: '48px 24px',
        textAlign: 'center',
        background: '#fff',
        borderRadius: '20px',
        border: '1px dashed #d8ebf7',
        margin: '20px 0',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          margin: '0 auto 16px',
          borderRadius: '50%',
          background: '#f0f9ff',
          color: '#0284c7',
          display: 'grid',
          placeItems: 'center',
          fontSize: '24px',
          border: '1px solid #bae6fd',
        }}
      >
        {icon}
      </div>
      <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px', color: '#073a78' }}>{title}</h3>
      <p style={{ fontSize: '13px', color: '#617994', maxWidth: '420px', margin: '0 auto 20px', lineHeight: 1.5 }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="primary small"
          style={{ cursor: 'pointer' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
