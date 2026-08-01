import type { Metadata } from "next";
import { LegalLayout, Section } from "@/components/public/LegalLayout";

export const metadata: Metadata = {
  title: 'Privacy Policy | Squadpitch',
  description:
    "How Squadpitch LLC collects, uses, and protects information when you use our AI-assisted social media generation, scheduling, publishing, and analytics tools.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="May 8, 2026">
      <p>
        <strong>Squadpitch LLC</strong> (&quot;Squadpitch&quot;, &quot;we&quot;,
        &quot;us&quot;) provides AI-assisted social media generation,
        scheduling, publishing, and analytics software for real estate agents,
        small businesses, and teams. This policy explains what information
        Squadpitch collects, how we use it, and what choices you have. Privacy
        questions:{" "}
        <a
          href="mailto:privacy@squadpitch.com"
          className="text-[#1DBF60] hover:underline"
        >
          privacy@squadpitch.com
        </a>
        .
      </p>

      <Section heading="1. The data we collect">
        <p>
          We collect the following categories of information when you sign up
          and use Squadpitch:
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <strong>Account information.</strong> Your email, name, and profile
            details. Authentication is handled by Auth0; we receive a unique
            Auth0 identifier and your email.
          </li>
          <li>
            <strong>Workspace and team information.</strong> Workspace name,
            time zone, the people you invite, and the role you assign them.
          </li>
          <li>
            <strong>Business, listing, brand, and marketing content.</strong>{" "}
            Listing URLs, website content, brand voice configuration, persona
            settings, uploaded images and videos, and any text you paste or type
            into the product.
          </li>
          <li>
            <strong>Generated content and campaign / post drafts.</strong>{" "}
            Captions, hooks, hashtags, scheduled posts, campaign sequences, and
            the metadata Squadpitch produces while operating on your content.
          </li>
          <li>
            <strong>Scheduled and published post metadata.</strong> Which
            channel a post went to, when it was published, the resulting
            external post ID and permalink, and the post status (failed, queued,
            published, etc.).
          </li>
          <li>
            <strong>
              Social-media integration tokens and connected-account identifiers.
            </strong>{" "}
            When you authorize Squadpitch to connect a third-party social
            platform, we store an OAuth access token (and a refresh token where
            issued) and the platform&apos;s public identifier for the connected
            account or page. Tokens are encrypted at rest.
          </li>
          <li>
            <strong>
              Analytics and engagement metrics returned by connected platforms.
            </strong>{" "}
            Impressions, reach, likes / reactions, comments, shares, saves,
            clicks, and similar counts, along with their timestamps. These are
            returned by the connected platform&apos;s API.
          </li>
          <li>
            <strong>Billing and subscription metadata.</strong> Stripe customer
            ID, plan tier, subscription status, and high-level usage counts.
            Stripe handles your payment method directly; we never see your full
            card number.
          </li>
          <li>
            <strong>Support communications.</strong> The contents of any email
            or in-product message you send to support, privacy, or legal
            addresses, plus the metadata of those messages.
          </li>
          <li>
            <strong>
              Technical logs, device, browser, IP, session, and security
              information.
            </strong>{" "}
            Standard server and audit logs (including request IDs, IP addresses,
            user agents, and rate-limit telemetry) used to operate, debug, and
            secure the service.
          </li>
          <li>
            <strong>Cookies and similar technologies.</strong> Used to keep you
            logged in, remember preferences, and run optional product analytics.
            See &quot;Cookies&quot; below.
          </li>
        </ul>
      </Section>

      <Section heading="2. How we use the data">
        <p>We use the data above to:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>Operate the service and your account.</li>
          <li>Run workspace and team management features.</li>
          <li>
            Generate AI content using third-party model providers, applying the
            brand context you have set.
          </li>
          <li>
            Schedule and publish posts to the channels you have connected, on
            the timing you set.
          </li>
          <li>
            Pull analytics from connected platforms and present them in your
            workspace.
          </li>
          <li>
            Bill you correctly under your plan and let you manage your
            subscription.
          </li>
          <li>
            Provide support, investigate incidents, prevent fraud, enforce usage
            limits, and protect the security of the service.
          </li>
          <li>
            Improve the product. We do not sell your personal data. We do not
            train shared, customer-mixed AI models on your account content.
          </li>
          <li>Comply with legal obligations.</li>
        </ul>
      </Section>

      <Section heading="3. Service providers and data processors">
        <p>
          We rely on the following providers to operate the service. Each is
          governed by its own privacy policy and processes only the data
          required for the function described.
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <strong>Auth0</strong> — authentication and session management.
          </li>
          <li>
            <strong>Stripe</strong> — payment processing and subscription
            billing.
          </li>
          <li>
            <strong>OpenAI</strong> — text generation.
          </li>
          <li>
            <strong>Fal.ai</strong> — image and video generation.
          </li>
          <li>
            <strong>Replicate</strong> (optional) — image segmentation for
            listing-photo enhancements.
          </li>
          <li>
            <strong>Cloudinary</strong> — media storage and delivery.
          </li>
          <li>
            <strong>Postmark</strong> — transactional email delivery.
          </li>
          <li>
            <strong>Twilio</strong> — retained only for signed webhook security;
            SMS sending is currently unavailable.
          </li>
          <li>
            <strong>Web Push (VAPID)</strong> — browser push notifications, sent
            only after opt-in.
          </li>
          <li>
            <strong>Sentry</strong> (optional) — error monitoring.
          </li>
          <li>
            <strong>PostHog</strong> (optional) — product analytics for a small
            allow-list of funnel events. No content is sent.
          </li>
          <li>
            <strong>Fly.io / Vercel</strong> — application hosting.
          </li>
          <li>
            <strong>Postgres (Fly Postgres)</strong> — primary database for
            account, workspace, and content data.
          </li>
          <li>
            <strong>Upstash Redis</strong> — queue infrastructure and
            request-level state.
          </li>
          <li>
            <strong>RentCast</strong> (optional, real estate) — public property
            data.
          </li>
          <li>
            <strong>
              Meta (Facebook + Instagram), TikTok, X, LinkedIn, YouTube, Google
              Business Profile, Google Drive, Dropbox
            </strong>{" "}
            — third-party platforms you choose to connect for publishing,
            analytics, or media import.
          </li>
        </ul>
      </Section>

      <Section heading="4. Connected social platforms and OAuth tokens">
        <p>
          When you connect a third-party platform, you authorize Squadpitch to
          access that platform on your behalf within the scopes you grant at the
          consent screen. Squadpitch stores the resulting access token (and
          refresh token, where issued) encrypted at rest. We use these tokens
          only to provide the publishing, scheduling, and analytics features you
          request, plus support, security, and compliance with platform
          policies.
        </p>
        <p>
          We do not sell or share these tokens with third parties for marketing
          or any other purpose unrelated to operating the service for you.
        </p>
        <p>
          You can disconnect any connected account at any time from Settings →
          Channels. Disconnecting deletes the stored token. You can also revoke
          access from inside the connected platform&apos;s own settings, which
          has the same effect of stopping new requests from Squadpitch even if
          the local token has not yet been removed.
        </p>
      </Section>

      <Section heading="5. AI-generated content">
        <p>
          Captions, hooks, hashtags, and images you generate through Squadpitch
          are produced by third-party AI models. AI output can be inaccurate,
          biased, infringing, non-compliant with platform rules, or simply
          unsuitable for your audience.{" "}
          <strong>
            You are responsible for reviewing and approving every post before it
            is published.
          </strong>{" "}
          For real estate users this includes confirming that posts comply with
          the federal Fair Housing Act, your MLS rules, and any state, local, or
          platform-specific advertising rules that apply. Squadpitch does not
          guarantee accuracy, originality, or compliance of generated output.
        </p>
      </Section>

      <Section heading="6. Data retention">
        <p>
          We retain account, workspace, and content data while your account is
          active. If you delete your account, we remove personal data and
          workspace content within 30 days, except where we are legally required
          to retain billing or tax records, where we need to keep a minimal
          record to support fraud, abuse, or platform-policy investigations, or
          where the data has already been aggregated and de-identified.
        </p>
        <p>
          Connected-platform engagement metrics (likes, reach, etc.) are
          retained as long as the corresponding draft / post record exists in
          your workspace.
        </p>
      </Section>

      <Section heading="7. Your rights and how to exercise them">
        <p>
          You can access, export, correct, or delete the personal data
          associated with your account. To make a request:
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            Log in and use Settings → Workspace to delete a workspace, or
            Settings → Channels to disconnect any connected platform.
          </li>
          <li>
            Email{" "}
            <a
              href="mailto:privacy@squadpitch.com"
              className="text-[#1DBF60] hover:underline"
            >
              privacy@squadpitch.com
            </a>{" "}
            to request access, export, correction, or full account deletion. We
            aim to respond within 14 business days. We may need to verify your
            identity by replying from the email address on the account.
          </li>
          <li>
            Cancel paid plans at any time through Settings → Billing (Stripe
            customer portal).
          </li>
          <li>
            Reply <code>STOP</code> to any SMS to opt out of further SMS.
          </li>
        </ul>
        <p>
          Squadpitch does not currently provide a self-service in-app
          account-deletion button. The email path above is the primary deletion
          route. If we add a self-service flow later, this section will be
          updated. For step-by-step guidance — including what to put in the
          email and what may be retained for legal or billing reasons — see the{" "}
          <a href="/data-deletion" className="text-[#1DBF60] hover:underline">
            Data Deletion
          </a>{" "}
          page.
        </p>
      </Section>

      <Section heading="8. Security">
        <p>
          Squadpitch transmits data over HTTPS and stores OAuth tokens for
          connected platforms encrypted at rest using AES-256-GCM. Internal
          access to production data is restricted to authorized engineers and is
          audit-logged. We use standard provider security controls (Auth0 for
          authentication, Fly.io for infrastructure, Stripe for payments). No
          system is perfectly secure; if we discover a breach materially
          affecting your account, we will notify you and any regulators required
          by law.
        </p>
      </Section>

      <Section heading="9. Cookies and analytics">
        <p>
          Squadpitch uses cookies and equivalent technologies to keep you signed
          in and to remember workspace preferences. We may also use PostHog to
          record a small allow-list of funnel events (sign-up started, workspace
          created, publish attempted, etc.) to measure product usage. PostHog
          never receives the body of your posts, captions, or media. You can
          block analytics with a standard browser tracker blocker without
          breaking the rest of the product.
        </p>
      </Section>

      <Section heading="10. Children">
        <p>
          Squadpitch is intended for business use by adults. The service is not
          directed to children under 13. We do not knowingly collect personal
          information from children. If you believe a child has submitted
          information to us, contact{" "}
          <a
            href="mailto:privacy@squadpitch.com"
            className="text-[#1DBF60] hover:underline"
          >
            privacy@squadpitch.com
          </a>{" "}
          and we will delete it.
        </p>
      </Section>

      <Section heading="11. International users">
        <p>
          Squadpitch is operated from the United States. By using the service
          from outside the US you consent to the transfer of your information to
          the United States and to processing in the United States, where
          data-protection laws may differ from those in your country.
        </p>
      </Section>

      <Section heading="12. Changes to this policy">
        <p>
          We will update this policy as the product evolves. Material changes
          will be communicated by email to the address on your account or
          through an in-product notice. Continued use after the effective date
          of the updated policy constitutes acceptance.
        </p>
      </Section>

      <Section heading="13. Contact">
        <p>
          Privacy questions, deletion / export requests, or concerns about how
          Squadpitch handles your data:{" "}
          <a
            href="mailto:privacy@squadpitch.com"
            className="text-[#1DBF60] hover:underline"
          >
            privacy@squadpitch.com
          </a>
          .
        </p>
        <p className="text-sm text-gray-500">Squadpitch LLC · Ohio, USA</p>
      </Section>

      <p className="rounded-md border border-gray-200 bg-gray-50 p-4 text-xs text-gray-500">
        This Privacy Policy is a strong production draft prepared by Squadpitch
        and should be reviewed by a qualified attorney admitted in your
        jurisdiction before paid launch. It is not legal advice.
      </p>
    </LegalLayout>
  );
}
