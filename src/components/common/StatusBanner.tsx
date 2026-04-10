import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface StatusBannerProps {
  error?: string;
  success?: boolean;
  message?: string;
}

export function StatusBanner({ error, success, message }: StatusBannerProps) {
  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-accent-red/10 text-accent-red text-sm">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }
  if (success) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-zone-green/10 text-zone-green text-sm">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        <span>{message || 'Success'}</span>
      </div>
    );
  }
  return null;
}
