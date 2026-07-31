import type { PlanTier } from "@/hooks/useBilling";

export type SignupPaidPlan = "STARTER" | "PRO" | "GROWTH";
export type CheckoutReturnState = "success" | "cancel" | null;

const PUBLIC_PLAN_ALIASES: Record<string, SignupPaidPlan> = {
  SOLO: "STARTER",
  STARTER: "STARTER",
  PRO: "PRO",
  TEAM: "GROWTH",
  GROWTH: "GROWTH",
};

export function parseSignupPaidPlan(
  value: string | null | undefined,
): SignupPaidPlan | null {
  const normalized = value?.trim().toUpperCase();
  return normalized ? PUBLIC_PLAN_ALIASES[normalized] ?? null : null;
}

export function parseCheckoutReturn(
  value: string | null | undefined,
): CheckoutReturnState {
  return value === "success" || value === "cancel" ? value : null;
}

export function shouldStartCheckout(input: {
  selectedPlan: SignupPaidPlan | null;
  checkoutReturn: CheckoutReturnState;
  started: boolean;
}): boolean {
  return Boolean(input.selectedPlan && !input.checkoutReturn && !input.started);
}

export function hasWebhookActivated(
  effectiveTier: PlanTier | undefined,
): boolean {
  return Boolean(effectiveTier && effectiveTier !== "FREE");
}
