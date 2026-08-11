import { Monitor } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function MobilePageContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8', className)} {...props} />;
}

export function ResponsiveStack({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex min-w-0 flex-col gap-4 sm:gap-5', className)} {...props} />;
}

export function ResponsiveGrid({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3', className)} {...props} />;
}

export function ResponsiveCardList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid min-w-0 grid-cols-1 gap-3 md:gap-4', className)} {...props} />;
}

export function DesktopRecommendedNotice({ children = 'This advanced workflow is easier to complete on a larger screen.' }: { children?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white-10 bg-white-5 p-3 text-sm text-white-60" role="note">
      <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-accent-green-110" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function TouchActionBar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'sticky bottom-[calc(var(--sp-mobile-nav-height)+env(safe-area-inset-bottom,0px))] z-20 -mx-4 flex min-h-14 items-center gap-2 border-t border-white-10 bg-sp-bg/95 px-4 py-2 backdrop-blur lg:static lg:mx-0 lg:min-h-0 lg:border-0 lg:bg-transparent lg:p-0',
        className,
      )}
      {...props}
    />
  );
}
