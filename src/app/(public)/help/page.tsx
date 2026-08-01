import type { Metadata } from "next";
import { LegalLayout, Section } from "@/components/public/LegalLayout";

export const metadata: Metadata = {
  title: "Help & Contact — Squadpitch",
  description:
    "Get help with Squadpitch — billing, channel connections, AI generation, scheduling, and Autopilot.",
};

export default function HelpPage() {
  return (
    <LegalLayout title="Help & Contact" lastUpdated="May 5, 2026">
      <p>
        Squadpitch is small enough that a real person reads every email. The
        fastest way to get unstuck is to write to{" "}
        <a
          href="mailto:support@squadpitch.com"
          className="text-[#1DBF60] hover:underline"
        >
          support@squadpitch.com
        </a>
        . Include your account email and a screenshot if something looks wrong —
        that's usually enough for us to find the problem in seconds.
      </p>

      <Section heading="Common questions">
        <p>
          <strong>How do I connect a social account?</strong> From inside a
          workspace, go to Settings → Channels, pick the channel, and finish the
          OAuth flow with the provider. You can disconnect any time. Tokens are
          encrypted at rest.
        </p>
        <p>
          <strong>How does scheduling work?</strong> Approve a draft from the
          Planner, pick a date/time, and our scheduled-publish worker posts it
          on your behalf. If a connection has expired, the post stays in your
          queue and surfaces an error so you can reconnect and retry.
        </p>
        <p>
          <strong>What is Autopilot?</strong> Autopilot is a Pro+ feature
          (currently real-estate only) that watches for new listings,
          milestones, and content gaps and auto-generates draft posts for you to
          approve. It defaults to draft-only — nothing publishes without your
          sign-off.
        </p>
        <p>
          <strong>Why is my post wrong?</strong> AI captions and images can be
          inaccurate. Always review what you're about to publish, and edit the
          draft before approving it. We surface every warning the system finds,
          but there's no substitute for a human read.
        </p>
        <p>
          <strong>How do I upgrade or cancel?</strong> Go to Settings → Billing.
          Upgrades happen with proration via Stripe. Cancellations stay active
          until the end of your paid period.
        </p>
        <p>
          <strong>I hit a usage limit — what now?</strong> Limits reset on the
          first of each calendar month. If you need more right now, upgrading to
          the next tier raises the cap immediately.
        </p>
      </Section>

      <Section heading="Specific issues">
        <p>
          <strong>OAuth/Connection problems</strong> — most of these are token
          expirations. Reconnect from Settings → Channels. If the provider is
          rejecting our app, email us and we'll dig in.
        </p>
        <p>
          <strong>Billing or refund</strong> — email support and reference the
          invoice if you have it.
        </p>
        <p>
          <strong>Outage or "not loading"</strong> — try a hard refresh. If it's
          still broken, email support. We'll surface a status page here once
          we've got one stood up.
        </p>
        <p>
          <strong>Security or privacy concerns</strong> — please email{" "}
          <a
            href="mailto:support@squadpitch.com"
            className="text-[#1DBF60] hover:underline"
          >
            support@squadpitch.com
          </a>{" "}
          with details. We aim to respond within 24 hours.
        </p>
      </Section>

      <Section heading="Reach a human">
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            Support email:{" "}
            <a
              href="mailto:support@squadpitch.com"
              className="text-[#1DBF60] hover:underline"
            >
              support@squadpitch.com
            </a>
          </li>
          <li>Response time: usually within one business day.</li>
        </ul>
      </Section>

      <Section heading="Related">
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <a href="/privacy" className="text-[#1DBF60] hover:underline">
              Privacy Policy
            </a>{" "}
            — what data we collect and why.
          </li>
          <li>
            <a href="/terms" className="text-[#1DBF60] hover:underline">
              Terms of Service
            </a>{" "}
            — the rules of using Squadpitch.
          </li>
          <li>
            <a href="/sms-consent" className="text-[#1DBF60] hover:underline">
              SMS consent
            </a>{" "}
            — current unavailable status and historical consent information.
          </li>
        </ul>
      </Section>
    </LegalLayout>
  );
}
