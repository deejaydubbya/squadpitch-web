'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { ApiError } from '@/lib/apiFetch';
import { UpgradeModal } from '@/components/billing/UpgradeModal';
import { trackActivationEvent } from '@/lib/activationTracking';

interface UsageLimitContext {
  handleMutationError: (error: unknown, context?: string) => boolean;
}

const Ctx = createContext<UsageLimitContext>({
  handleMutationError: () => false,
});

export function useUsageLimitGuard() {
  return useContext(Ctx);
}

export function UsageLimitProvider({
  clientId,
  children,
}: {
  clientId: string;
  children: React.ReactNode;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContext, setModalContext] = useState('');

  const handleMutationError = useCallback(
    (error: unknown, context?: string): boolean => {
      if (
        error instanceof ApiError &&
        (error.status === 402 || error.code === 'USAGE_LIMIT')
      ) {
        setModalContext(context ?? error.message);
        setModalOpen(true);
        trackActivationEvent('limit_upgrade_prompt', {
          clientId,
          meta: { context, code: error.code },
        });
        return true;
      }
      return false;
    },
    [clientId],
  );

  return (
    <Ctx.Provider value={{ handleMutationError }}>
      {children}
      <UpgradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="You've hit a plan limit"
        description={modalContext || 'Upgrade your plan to continue.'}
        features={[
          'Higher post, image & video limits',
          'Autopilot for hands-free publishing',
          'Advanced scheduling & analytics',
        ]}
        targetTier="PRO"
        triggerSource="usage_limit_402"
        clientId={clientId}
      />
    </Ctx.Provider>
  );
}
