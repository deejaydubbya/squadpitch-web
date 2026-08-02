'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Terminal, X, LogOut, Zap } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBanner } from '@/components/common/StatusBanner';
import { useClients, useDeleteWorkspace } from '@/hooks/useSquadpitch';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUsage, useCreateCheckout, useChangePlan, type PlanTier } from '@/hooks/useBilling';
import { ClientCard } from '@/components/studio/ClientCard';
import { shouldRedirectToOnboarding } from '@/lib/onboardingRedirect';

export default function WorkspacesPage() {
  const router = useRouter();
  const { data: clients, isLoading, error } = useClients();
  const { isAdmin, isDeveloper } = useCurrentUser();
  const deleteWorkspace = useDeleteWorkspace();

  // First-time activation: a brand-new authenticated user lands here with
  // zero workspaces. Push them straight into onboarding instead of showing
  // a confusing empty list. Only fire once per mount to avoid loops if the
  // /onboarding page navigates back before the clients query refetches.
  const hasRedirectedRef = useRef(false);
  const shouldRedirect = shouldRedirectToOnboarding({ isLoading, error, clients });

  useEffect(() => {
    if (shouldRedirect && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      router.replace('/onboarding');
    }
  }, [shouldRedirect, router]);
  const [deletingClient, setDeletingClient] = useState<{ id: string; name: string } | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const { data: usageData } = useUsage();
  const checkout = useCreateCheckout();
  const changePlan = useChangePlan();

  const showDevConsole = isAdmin || isDeveloper;
  const workspaceLimit = usageData?.limits.workspaces ?? Infinity;
  const currentTier: PlanTier = usageData?.tier ?? 'FREE';
  const atWorkspaceLimit = (clients?.length ?? 0) >= workspaceLimit;
  const NEXT_TIER: Partial<Record<PlanTier, PlanTier>> = { FREE: 'PRO', STARTER: 'PRO' };
  const upgradeTier = NEXT_TIER[currentTier] ?? null;
  const hasSubscription = currentTier !== 'FREE';
  const isUpgrading = checkout.isPending || changePlan.isPending;
  const canConfirm = deletingClient !== null && confirmText === deletingClient.name;

  function handleStartDelete(e: React.MouseEvent, id: string, name: string) {
    e.preventDefault();
    e.stopPropagation();
    setDeletingClient({ id, name });
    setConfirmText('');
  }

  function handleConfirmDelete() {
    if (!canConfirm) return;
    deleteWorkspace.mutate(deletingClient!.id, {
      onSettled: () => {
        setDeletingClient(null);
        setConfirmText('');
      },
    });
  }

  function handleCancelDelete() {
    setDeletingClient(null);
    setConfirmText('');
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white-100 flex items-center gap-3">
              <Image src="/icon-192.png" alt="Squadpitch" width={32} height={32} />
              Squadpitch
            </h1>
            <p className="text-white-60 mt-1">
              Build and manage your AI-powered content systems.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {showDevConsole && (
              <Link
                href="/admin"
                target="_blank"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white-40 hover:text-white-100 hover:bg-white-5 transition-colors"
              >
                <Terminal className="w-4 h-4" />
                Dev Console
              </Link>
            )}
            <a
              href="/auth/logout"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white-40 hover:text-white-100 hover:bg-white-5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </a>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 py-8">
            <LoadingSpinner size="sm" />
            <span className="text-white-40 text-sm">Loading workspaces…</span>
          </div>
        )}

        {error && <StatusBanner error={(error as Error).message} />}

        {/* Brand-new user — clients loaded, list is empty.
            useEffect above is firing router.replace('/onboarding'); show
            a clear interim state instead of an empty grid. */}
        {shouldRedirect && (
          <div className="card p-6 max-w-xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-green-110/10 border border-accent-green-110/20 flex items-center justify-center flex-shrink-0">
                <LoadingSpinner size="sm" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-white-100 font-semibold text-lg">
                  Setting up your first workspace…
                </h2>
                <p className="text-sm text-white-40 mt-1">
                  Taking you to onboarding so you can paste a listing or
                  website and generate your first posts.
                </p>
                <Link
                  href="/onboarding"
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-green-110 text-sp-bg text-sm font-semibold hover:bg-accent-green-120 transition-colors"
                >
                  Continue to onboarding
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl">
          {clients?.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onDelete={(e) => handleStartDelete(e, client.id, client.name)}
            />
          ))}
          {atWorkspaceLimit ? (
          <div className="card p-5 border-accent-green-110/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-green-110/10 border border-accent-green-110/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-accent-green-110" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white-100 font-semibold text-lg">
                  Workspace limit reached
                </h3>
                <p className="text-sm text-white-40 mt-1">
                  Your {currentTier} plan includes {workspaceLimit} workspace{workspaceLimit === 1 ? '' : 's'}.
                </p>
                {upgradeTier && (
                <button
                  onClick={() => {
                    if (hasSubscription) {
                      changePlan.mutate({ tier: upgradeTier });
                    } else {
                      checkout.mutate({
                        tier: upgradeTier,
                        successUrl: window.location.href,
                        cancelUrl: window.location.href,
                      });
                    }
                  }}
                  disabled={isUpgrading}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-green-110 text-sp-bg text-sm font-semibold hover:bg-accent-green-120 transition-colors disabled:opacity-50"
                >
                  {isUpgrading ? <LoadingSpinner size="sm" /> : <Zap className="w-3.5 h-3.5" />}
                  Upgrade to {upgradeTier}
                </button>
                )}
              </div>
            </div>
          </div>
          ) : (
          <Link
            href="/onboarding"
            className="card p-5 border-dashed hover:border-accent-green-110/50 transition-colors group text-left w-full block"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white-5 border border-dashed border-white-20 flex items-center justify-center flex-shrink-0 group-hover:border-accent-green-110/50">
                <Plus className="w-6 h-6 text-white-40 group-hover:text-accent-green-110" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white-100 font-semibold text-lg group-hover:text-accent-green-110 transition-colors">
                  Create new workspace
                </h3>
                <p className="text-sm text-white-40 mt-1">
                  Paste your website → generate your first posts in seconds
                </p>
              </div>
            </div>
          </Link>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deletingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-sp-bg border border-white-10 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white-100">Delete workspace</h3>
              <button
                onClick={handleCancelDelete}
                className="p-1 rounded-lg text-white-40 hover:text-white-100 hover:bg-white-5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-white-60 mb-4">
              This will permanently delete <span className="font-semibold text-white-100">{deletingClient.name}</span> and all its content. This action cannot be undone.
            </p>
            <label className="block text-sm text-white-40 mb-2">
              Type <span className="font-mono text-white-60">{deletingClient.name}</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={deletingClient.name}
              className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm placeholder:text-white-20 focus:outline-none focus:border-white-20 transition-colors"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canConfirm) handleConfirmDelete();
                if (e.key === 'Escape') handleCancelDelete();
              }}
            />
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 rounded-lg text-sm text-white-60 hover:text-white-100 hover:bg-white-5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={!canConfirm || deleteWorkspace.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleteWorkspace.isPending ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
