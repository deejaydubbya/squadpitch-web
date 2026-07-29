import { describe, expect, it } from "vitest";
import {
  hasWebhookActivated,
  parseCheckoutReturn,
  parseSignupPaidPlan,
  shouldStartCheckout,
} from "./signupPlanHandoff";

describe("signup plan handoff state", () => {
  it("accepts only server-known paid plan keys", () => {
    expect(parseSignupPaidPlan("starter")).toBe("STARTER");
    expect(parseSignupPaidPlan("PRO")).toBe("PRO");
    expect(parseSignupPaidPlan("price_123")).toBeNull();
    expect(parseSignupPaidPlan("FREE")).toBeNull();
  });

  it("starts checkout exactly once for a selected plan", () => {
    expect(
      shouldStartCheckout({
        selectedPlan: "PRO",
        checkoutReturn: null,
        started: false,
      }),
    ).toBe(true);
    expect(
      shouldStartCheckout({
        selectedPlan: "PRO",
        checkoutReturn: null,
        started: true,
      }),
    ).toBe(false);
  });

  it("does not restart checkout after cancel or success refresh", () => {
    for (const checkoutReturn of ["cancel", "success"] as const) {
      expect(
        shouldStartCheckout({
          selectedPlan: "STARTER",
          checkoutReturn,
          started: false,
        }),
      ).toBe(false);
    }
  });

  it("supports delayed webhook activation while Free remains usable", () => {
    expect(hasWebhookActivated("FREE")).toBe(false);
    expect(hasWebhookActivated("PRO")).toBe(true);
  });

  it("normalizes only known Checkout callback states", () => {
    expect(parseCheckoutReturn("cancel")).toBe("cancel");
    expect(parseCheckoutReturn("success")).toBe("success");
    expect(parseCheckoutReturn("anything")).toBeNull();
  });
});
