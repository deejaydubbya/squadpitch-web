import type { PlanTier } from "@/hooks/useBilling";

export type SignupPaidPlan = Exclude<PlanTier, "FREE">;
export type CheckoutReturnState = "success" | "cancel" | null;

const PAID_PLANS = new Set<SignupPaidPlan>([
  "STARTER",
  "PRO",
  "GROWTH",
  "AGENCY",
]);

export function parseSignupPaidPlan(
  value: string | null | undefined,
): SignupPaidPlan | null {
  const normalized = value?.toUpperCase() as SignupPaidPlan | undefined;
  return normalized && PAID_PLANS.has(normalized) ? normalized : null;
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
