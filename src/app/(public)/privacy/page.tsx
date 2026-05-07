import type { Metadata } from 'next';
import { LegalLayout, Section } from '@/components/public/LegalLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy — Squadpitch',
  description:
    'How Squadpitch collects, uses, and protects information when you use our AI social media tools for real estate.',
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="May 5, 2026">
      <p>
        Squadpitch ("we", "us") helps real estate agents and small business
        owners generate, schedule, and publish social media content with the
        help of AI. This policy explains what we collect, why, and what
        choices you have. We try to keep it short and human; if anything is
        unclear, email us at{' '}
        <a href="mailto:support@squadpitch.com" className="text-[#1DBF60] hover:underline">
          support@squadpitch.com
        </a>
        .
      </p>

      <Section heading="What we collect">
        <p>When you sign up and use Squadpitch, we collect:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <strong>Account info</strong> — your email, name, and any profile
            details you provide. Authentication is handled by Auth0; we
            receive a unique identifier and your email from them.
          </li>
          <li>
            <strong>Workspace + brand content</strong> — listing URLs,
            website data, brand voice, persona settings, uploaded images and
            videos, and any text you paste in.
          </li>
          <li>
            <strong>Connected social accounts</strong> — when you connect
            Instagram, Facebook, TikTok, X, LinkedIn, YouTube, or similar
            providers, we store an encrypted access token and basic profile
            metadata (handle, account ID) so we can publish on your behalf.
            We do not store your password for any third-party account.
          </li>
          <li>
            <strong>Generated content</strong> — drafts, schedules, and
            publish history. Content you generate via Squadpitch is stored
            so you can review, edit, and re-use it.
          </li>
          <li>
            <strong>Billing info</strong> — Stripe handles your payment
            method directly; we receive the customer ID, plan, and status
            from Stripe. We never see your full card number.
          </li>
          <li>
            <strong>Usage telemetry</strong> — basic events like sign-ins,
            generation requests, and publish attempts so we can detect
            outages and bill correctly.
          </li>
        </ul>
      </Section>

      <Section heading="What we do with it">
        <ul className="ml-5 list-disc space-y-1.5">
          <li>Generate AI content using OpenAI and Fal.ai. Your prompts and brand context are sent to these providers to produce the content you ask for.</li>
          <li>Publish posts to the social channels you connect, on your schedule.</li>
          <li>Store your media on Cloudinary so it can be served and embedded in posts.</li>
          <li>Send you transactional email and (optionally) SMS notifications about publish status, billing, and connection issues.</li>
          <li>Operate, debug, and improve the product. We do not sell your data and we don't train shared AI models on your account content.</li>
        </ul>
      </Section>

      <Section heading="AI content disclosure">
        <p>
          Captions, hooks, hashtags, and images you generate through
          Squadpitch are produced by third-party AI models (OpenAI for text,
          Fal.ai for media). AI output can be wrong, biased, or contain
          factual errors. <strong>You are responsible for reviewing every
          post before it publishes.</strong> Squadpitch does not guarantee
          accuracy and is not liable for content you publish.
        </p>
      </Section>

      <Section heading="Service providers we use">
        <p>The third parties below process some of your data. Each has its own privacy policy.</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li><strong>Auth0</strong> — authentication.</li>
          <li><strong>Stripe</strong> — payments and subscriptions.</li>
          <li><strong>OpenAI</strong> — text generation.</li>
          <li><strong>Fal.ai</strong> — image and video generation.</li>
          <li><strong>Cloudinary</strong> — media storage and delivery.</li>
          <li><strong>Postmark</strong> — transactional email.</li>
          <li><strong>Twilio</strong> — SMS notifications (only if you opt in; see <a href="/sms-consent" className="text-[#1DBF60] hover:underline">SMS consent</a>).</li>
          <li><strong>Fly.io / Vercel / Upstash</strong> — hosting, queues, and infrastructure.</li>
          <li><strong>Meta, TikTok, Google, X, LinkedIn</strong> — social channels you choose to connect for publishing.</li>
        </ul>
      </Section>

      <Section heading="Your choices">
        <ul className="ml-5 list-disc space-y-1.5">
          <li>You can disconnect any social channel at any time from Settings → Channels. We delete the stored access token.</li>
          <li>You can delete a workspace from Settings → Workspace. We remove the workspace's drafts, brand profile, and uploaded media.</li>
          <li>You can cancel your subscription at any time via the Stripe customer portal linked from Settings → Billing.</li>
          <li>You can request export or deletion of your account data by emailing <a href="mailto:support@squadpitch.com" className="text-[#1DBF60] hover:underline">support@squadpitch.com</a>. We aim to respond within 7 business days.</li>
          <li>SMS opt-in is off by default; reply STOP to any message to opt out.</li>
        </ul>
      </Section>

      <Section heading="Retention">
        <p>
          We keep your account data while your account is active. If you
          delete your account, we remove personal data within 30 days,
          except where we're legally required to retain billing records.
        </p>
      </Section>

      <Section heading="Security">
        <p>
          OAuth tokens for connected social accounts are encrypted at rest.
          We use HTTPS in transit. No system is perfectly secure; if we
          discover a breach affecting your account, we'll notify you.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          We'll update this policy as the product evolves. Material changes
          will be announced via email to the address on your account.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Questions or requests:{' '}
          <a href="mailto:support@squadpitch.com" className="text-[#1DBF60] hover:underline">
            support@squadpitch.com
          </a>
          .
        </p>
      </Section>
    </LegalLayout>
  );
}
