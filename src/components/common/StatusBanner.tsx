import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface StatusBannerProps {
  error?: string;
  warning?: string;
  info?: string;
  success?: boolean;
  message?: string;
}

export function StatusBanner({ error, warning, info, success, message }: StatusBannerProps) {
  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-accent-red/10 text-accent-red text-sm">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }
  if (warning) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-accent-orange/10 text-accent-orange text-sm">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span>{warning}</span>
      </div>
    );
  }
  if (info) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-accent-blue/10 text-accent-blue text-sm">
        <Info className="w-4 h-4 flex-shrink-0" />
        <span>{info}</span>
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
