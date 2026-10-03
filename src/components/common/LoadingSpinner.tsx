export function LoadingSpinner({
  message = 'Loading...',
  size = 'medium',
}: {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}) {
  const sizeMap = {
    small: '18px',
    medium: '32px',
    large: '48px',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        gap: '12px',
      }}
    >
      <div
        style={{
          width: sizeMap[size],
          height: sizeMap[size],
          border: '3px solid #dcecf6',
          borderTopColor: '#0ba9e7',
          borderRadius: '50%',
          animation: 'manvia-spin 0.8s linear infinite',
        }}
      />
      <span style={{ fontSize: '13px', color: '#5d7696', fontWeight: 500 }}>{message}</span>
    </div>
  );
}
