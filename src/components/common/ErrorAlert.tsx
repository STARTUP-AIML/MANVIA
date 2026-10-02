export function ErrorAlert({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      style={{
        padding: '16px 20px',
        borderRadius: '16px',
        backgroundColor: '#fff1f2',
        border: '1px solid #fecdd3',
        color: '#9f1239',
        margin: '16px 0',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{title}</div>
      {message && <div style={{ fontSize: '13px', lineHeight: 1.5, color: '#be123c' }}>{message}</div>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            marginTop: '10px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '12px',
            border: '1px solid #fda4af',
            background: '#fff',
            color: '#9f1239',
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      )}
    </div>
  );
}
