import type { Metadata } from 'next';
import { LegalLayout, Section } from '@/components/public/LegalLayout';

export const metadata: Metadata = {
  title: 'Terms of Service — Squadpitch',
  description:
    'The terms that apply when you use Squadpitch to generate, schedule, and publish social media content.',
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="May 5, 2026">
      <p>
        These terms apply when you use Squadpitch — an AI-powered tool for
        generating, scheduling, and publishing social media content. By
        creating an account or using the service you agree to these terms.
        If you don't, please don't use Squadpitch.
      </p>
      <p>
        Squadpitch is an early-stage product built by a small team. We try
        to keep these terms practical instead of throwing every
        legal-warranty word at you. Larger customers with procurement
        requirements should email{' '}
        <a href="mailto:support@squadpitch.com" className="text-[#1DBF60] hover:underline">
          support@squadpitch.com
        </a>
        .
      </p>

      <Section heading="What Squadpitch is">
        <p>
          Squadpitch lets you provide a website, listing, or other source
          material; the platform extracts brand and property data and uses
          AI to generate captions, hooks, hashtags, and media; you review
          and approve drafts; Squadpitch publishes them to the social
          channels you've connected, on the schedule you set.
        </p>
      </Section>

      <Section heading="Your account">
        <p>
          You're responsible for keeping your login secure, for the activity
          on your account, and for the people you invite into a workspace.
          Squadpitch is for use by businesses and adults. You must be at
          least 18 to use the service.
        </p>
      </Section>

      <Section heading="Your content and your social accounts">
        <p>
          You retain ownership of the content you upload, paste, or generate
          through Squadpitch. You grant us a license to store, process, and
          display that content as needed to operate the service for you,
          including sending it to the third-party AI providers and social
          platforms you choose to use.
        </p>
        <p>
          You're responsible for having the rights to anything you upload —
          listing photos, videos, brand assets — and for following the
          platform rules of any social channel you connect (Meta, TikTok,
          Google, X, LinkedIn, etc.).
        </p>
      </Section>

      <Section heading="AI-generated output — review before publishing">
        <p>
          Squadpitch uses third-party AI models. Output can be wrong,
          biased, hallucinate facts, or include phrasing you don't want
          attached to your brand or your listings.{' '}
          <strong>
            You are responsible for reviewing every draft before it
            publishes.
          </strong>{' '}
          Autopilot, when enabled, defaults to draft-only mode so a human
          approves before posting. If you turn on auto-publish modes, that
          is your decision and your risk.
        </p>
        <p>
          Real estate is regulated. Make sure posts you publish comply with
          fair-housing rules, MLS rules, and any disclosure requirements
          that apply to you. Squadpitch is not your compliance check.
        </p>
      </Section>

      <Section heading="Acceptable use">
        <p>Don't use Squadpitch to:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>Publish content you don't have the rights to.</li>
          <li>Spam, mislead, harass, or impersonate other people or brands.</li>
          <li>Attempt to bypass rate limits or scrape Squadpitch's APIs.</li>
          <li>Generate or publish content that violates the rules of the social platform you're connecting to, or any applicable law.</li>
          <li>Probe, scan, or test our systems without permission.</li>
        </ul>
        <p>We may suspend or terminate accounts that abuse the service.</p>
      </Section>

      <Section heading="Billing">
        <p>
          Free accounts are free. Paid plans (Solo, Pro, Team, Agency) are
          billed monthly through Stripe. Your plan limits are described on
          the pricing page; usage resets at the start of each calendar
          month. You can upgrade, downgrade, or cancel at any time from
          Settings → Billing — Stripe handles proration. Cancellations take
          effect at the end of the current paid period.
        </p>
        <p>
          Refunds are handled case-by-case; reach out via support if
          something didn't work right.
        </p>
      </Section>

      <Section heading="Service availability">
        <p>
          We aim to keep Squadpitch up, but we don't promise zero
          downtime. Third-party providers (Auth0, Stripe, OpenAI, Fal,
          Meta, etc.) sometimes have outages that affect us. We'll do
          our best to surface what's broken and recover quickly.
        </p>
      </Section>

      <Section heading="No warranties beyond what the law requires">
        <p>
          Squadpitch is provided "as is". To the extent allowed by law, we
          disclaim implied warranties of merchantability, fitness, and
          non-infringement. Specifically: we don't guarantee that
          AI-generated content is accurate, on-brand, or appropriate for
          publishing without your review.
        </p>
      </Section>

      <Section heading="Liability">
        <p>
          To the extent allowed by law, Squadpitch's total liability to
          you for any claim related to the service is limited to the
          amount you paid us in the twelve months before the claim. We
          aren't liable for indirect, consequential, or lost-profit
          damages.
        </p>
      </Section>

      <Section heading="Changes to these terms">
        <p>
          We may update these terms as the product evolves. We'll email
          you about material changes. Continued use after the update
          means you accept the new terms.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          <a href="mailto:support@squadpitch.com" className="text-[#1DBF60] hover:underline">
            support@squadpitch.com
          </a>{' '}
          — for billing, account, or any other question.
        </p>
      </Section>
    </LegalLayout>
  );
}
