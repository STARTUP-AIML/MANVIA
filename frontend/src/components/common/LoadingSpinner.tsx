import { Spinner } from '@/components/ui/Spinner';

export function LoadingSpinner({
  message = 'Loading...',
  size = 'lg',
}: {
  message?: string;
  size?: 'sm' | 'md' | 'lg' | string;
}) {
  const spinnerSize = size === 'sm' || size === 'md' ? size : 'lg';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        gap: '12px',
      }}
    >
      <Spinner size={spinnerSize} />
      <span style={{ fontSize: '13px', color: 'var(--color-neutral-600, #64748b)' }}>
        {message}
      </span>
    </div>
  );
}

export default LoadingSpinner;
