import { ErrorState } from '@/components/feedback/ErrorState';

export function ErrorAlert({
  title,
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return <ErrorState title={title} message={message} onRetry={onRetry} />;
}

export default ErrorAlert;
