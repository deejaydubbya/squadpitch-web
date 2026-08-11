"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { trackActivationEvent } from "@/lib/activationTracking";
import {
  hasWebhookActivated,
  parseCheckoutReturn,
  parseSignupPaidPlan,
  shouldStartCheckout,
  type SignupPaidPlan,
} from "@/lib/signupPlanHandoff";
import type { PlanTier } from "@/hooks/useBilling";

type IntentState = {
  intent?: {
    desiredTier: SignupPaidPlan;
    status: "SELECTED" | "CHECKOUT_CREATED" | "ACTIVATED";
  } | null;
  desiredTier?: SignupPaidPlan;
  effectiveTier: PlanTier;
};

function SignupPlanContinueContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = parseSignupPaidPlan(searchParams.get("selectedPlan"));
  const checkoutReturn = parseCheckoutReturn(searchParams.get("checkout"));
  const startedRef = useRef(false);
  const [state, setState] = useState<IntentState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    const next = await apiFetch<IntentState>("billing/signup-plan");
    setState(next);
    if (hasWebhookActivated(next.effectiveTier)) {
      trackActivationEvent("signup_checkout_activated", {
        meta: { tier: next.effectiveTier },
      });
      router.replace("/onboarding");
    }
    return next;
  }, [router]);

  const startCheckout = useCallback(
    async (plan?: SignupPaidPlan) => {
      setBusy(true);
      setError(null);
      try {
        if (plan) {
          await apiFetch("billing/signup-plan", {
            method: "PUT",
            body: JSON.stringify({ tier: plan }),
          });
          trackActivationEvent("signup_plan_selected", {
            meta: { tier: plan },
          });
        }
        const result = await apiFetch<{
          status: string;
          url?: string;
          effectiveTier?: PlanTier;
        }>("billing/signup-plan/checkout", { method: "POST" });
        if (result.status === "ACTIVATED") {
          router.replace("/onboarding");
          return;
        }
        if (!result.url)
          throw new Error("Checkout is temporarily unavailable.");
        trackActivationEvent("signup_checkout_started", {
          meta: { tier: plan ?? state?.intent?.desiredTier },
        });
        window.location.assign(result.url);
      } catch (checkoutError) {
        setError(
          checkoutError instanceof Error
            ? checkoutError.message
            : "Checkout is temporarily unavailable.",
        );
        setBusy(false);
      }
    },
    [router, state?.intent?.desiredTier],
  );

  useEffect(() => {
    trackActivationEvent("signup_plan_handoff_viewed", {
      meta: { selectedPlan, checkoutReturn },
    });
    if (checkoutReturn === "cancel") {
      trackActivationEvent("signup_checkout_canceled", {
        meta: { selectedPlan },
      });
    }
    if (
      shouldStartCheckout({
        selectedPlan,
        checkoutReturn,
        started: startedRef.current,
      })
    ) {
      startedRef.current = true;
      void startCheckout(selectedPlan!);
      return;
    }
    void loadState().catch(() => {
      setError(
        "We couldn’t load your plan selection. Your Free account is still available.",
      );
    });
  }, [checkoutReturn, loadState, selectedPlan, startCheckout]);

  useEffect(() => {
    if (checkoutReturn !== "success") return;
    const interval = window.setInterval(() => void loadState(), 1500);
    const timeout = window.setTimeout(
      () => window.clearInterval(interval),
      30000,
    );
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [checkoutReturn, loadState]);

  const desiredTier =
    selectedPlan ?? state?.intent?.desiredTier ?? state?.desiredTier;

  return (
    <main className="safe-area-top min-h-dvh bg-sp-bg px-4 py-6 text-white-100 sm:py-16">
      <div className="mx-auto max-w-lg rounded-2xl border border-white-10 bg-white-5 p-5 sm:p-8">
        {checkoutReturn === "success" ? (
          <>
            <Loader2 className="h-9 w-9 animate-spin text-accent-green-110" />
            <h1 className="mt-5 text-2xl font-semibold">
              Confirming your plan
            </h1>
            <p className="mt-2 text-sm text-white-60">
              Stripe accepted Checkout. We’re waiting for the signed webhook
              before enabling paid features.
            </p>
          </>
        ) : checkoutReturn === "cancel" ? (
          <>
            <CheckCircle2 className="h-9 w-9 text-accent-green-110" />
            <h1 className="mt-5 text-2xl font-semibold">
              Your account is ready
            </h1>
            <p className="mt-2 text-sm text-white-60">
              Checkout was canceled. Nothing was charged, and you can continue
              onboarding on the Free plan.
            </p>
          </>
        ) : (
          <>
            <CreditCard className="h-9 w-9 text-accent-green-110" />
            <h1 className="mt-5 text-2xl font-semibold">
              {desiredTier
                ? `Continue with ${desiredTier}`
                : "Choose when to upgrade"}
            </h1>
            <p className="mt-2 text-sm text-white-60">
              Your account works on Free even if you finish Checkout later.
            </p>
          </>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-200"
          >
            {error}
          </p>
        )}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          {desiredTier && checkoutReturn !== "success" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void startCheckout()}
              className="rounded-xl bg-accent-green-110 px-5 py-3 text-sm font-semibold text-sp-bg disabled:opacity-50"
            >
              {busy
                ? "Opening Checkout…"
                : `Continue to ${desiredTier} Checkout`}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              trackActivationEvent("signup_checkout_continue_free", {
                meta: { desiredTier },
              });
              router.push("/onboarding");
            }}
            className="rounded-xl border border-white-15 px-5 py-3 text-sm font-semibold text-white-80"
          >
            Continue on Free
          </button>
        </div>
      </div>
    </main>
  );
}

export default function SignupPlanContinuePage() {
  return (
    <Suspense
      fallback={
        <main className="safe-area-top min-h-dvh bg-sp-bg px-4 py-6 text-white-100 sm:py-16">
          <div className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-white-10 bg-white-5 p-5 sm:p-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent-green-110" />
            <span>Loading your plan selection…</span>
          </div>
        </main>
      }
    >
      <SignupPlanContinueContent />
    </Suspense>
  );
}
