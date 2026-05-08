import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalLayout, Section } from '@/components/public/LegalLayout';

export const metadata: Metadata = {
  title: 'Data Deletion | Squadpitch',
  description:
    'How to request deletion of your Squadpitch account data, disconnect connected social platforms, and what may be retained. Squadpitch LLC honors deletion requests sent to privacy@squadpitch.com.',
};

export default function DataDeletionPage() {
  return (
    <LegalLayout title="Data Deletion" lastUpdated="May 8, 2026">
      <p>
        <strong>Squadpitch LLC</strong> (&quot;Squadpitch&quot;) honors
        requests to delete personal data and account content. This page
        explains how to make a request, what happens after we receive it,
        and what may need to be retained for legal or operational reasons.
      </p>

      <Section heading="How to request deletion">
        <p>
          Email{' '}
          <a
            href="mailto:privacy@squadpitch.com?subject=Data%20Deletion%20Request"
            className="text-[#1DBF60] hover:underline"
          >
            privacy@squadpitch.com
          </a>{' '}
          from the email address on your Squadpitch account. To help us
          process your request quickly:
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <strong>Subject line:</strong> &quot;Data Deletion Request&quot;
          </li>
          <li>
            <strong>Account email:</strong> the email associated with your
            Squadpitch login.
          </li>
          <li>
            <strong>Workspace / company name</strong> (if applicable) and
            workspace ID if you have it.
          </li>
          <li>
            <strong>What you want deleted</strong> — pick one or more:
            <ul className="ml-5 mt-1 list-disc space-y-1">
              <li>Full account deletion</li>
              <li>A specific workspace</li>
              <li>A specific connected social account (please name the platform)</li>
              <li>
                Specific uploaded or generated content (drafts, media, etc.)
              </li>
              <li>An access / export request instead of deletion</li>
            </ul>
          </li>
        </ul>
        <p>
          Squadpitch may need to verify account ownership before deleting
          data — typically by replying from the email address on the account
          or by asking you to confirm a code from inside the product. We
          aim to acknowledge requests within 7 business days and complete
          processing within 30 days, sooner where possible.
        </p>
      </Section>

      <Section heading="What gets deleted when you delete your account">
        <p>
          A full account-deletion request, once verified, will remove the
          following from Squadpitch&apos;s production systems where deletion
          is legally and technically permitted:
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>Your account profile and Auth0 identifier mapping.</li>
          <li>
            The workspaces you own, including their brand profile, voice
            settings, and persona configuration.
          </li>
          <li>
            Generated content, drafts, scheduled posts, campaign records,
            and the media you uploaded to those workspaces.
          </li>
          <li>
            Connected social-account records and the encrypted OAuth tokens
            we stored to publish on your behalf.
          </li>
          <li>
            Engagement metrics and snapshots Squadpitch synced from
            connected platforms for those workspaces.
          </li>
          <li>
            Subscription metadata related to your account in our database
            (Stripe payment-method records and tax records are governed by
            Stripe&apos;s own retention rules).
          </li>
        </ul>
      </Section>

      <Section heading="Social platform access removal">
        <p>
          You can also revoke Squadpitch&apos;s access to a connected social
          platform directly from that platform — useful if you want to stop
          Squadpitch from publishing or pulling analytics immediately, even
          before our team processes a deletion request:
        </p>
        <ol className="ml-5 list-decimal space-y-1.5">
          <li>
            Open the connected platform&apos;s account, app, privacy, or
            security settings.
          </li>
          <li>
            Find the section for connected apps, business integrations, or
            authorized applications.
          </li>
          <li>Locate Squadpitch and choose Remove / Revoke / Disconnect.</li>
          <li>
            Then email{' '}
            <a
              href="mailto:privacy@squadpitch.com?subject=Data%20Deletion%20Request"
              className="text-[#1DBF60] hover:underline"
            >
              privacy@squadpitch.com
            </a>{' '}
            if you also want Squadpitch to delete the workspace records and
            cached metrics on our side.
          </li>
        </ol>
        <p>
          Inside Squadpitch you can also disconnect any connected channel
          from <strong>Settings → Channels</strong>. Disconnecting deletes
          the stored OAuth token immediately and prevents future syncing,
          publishing, scheduling, or analytics collection through Squadpitch
          for that account.
        </p>
      </Section>

      <Section heading="Content already published to social platforms">
        <p>
          Posts already published to a third-party social platform live on
          that platform&apos;s servers, not Squadpitch&apos;s. To take down
          a post that has already gone live, delete it directly on the
          social platform (Instagram, Facebook, TikTok, X, LinkedIn,
          YouTube, etc.). Squadpitch does not control retention or visibility
          of content once it exists on a third-party platform.
        </p>
      </Section>

      <Section heading="What may be retained">
        <p>
          Some information may be retained after deletion, only to the
          extent permitted or required by law and only for the purposes
          listed:
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>Compliance with legal obligations.</li>
          <li>Tax and accounting records.</li>
          <li>Billing and payment records (handled primarily by Stripe).</li>
          <li>Security logs and audit trails.</li>
          <li>Fraud and abuse prevention records.</li>
          <li>Dispute resolution and enforcement of our agreements.</li>
          <li>
            Encrypted backups, which roll over on a fixed schedule and are
            not used for active service operation.
          </li>
        </ul>
        <p>
          Where possible, we minimize retained data to identifiers and
          metadata required for the specific purpose above (for example, a
          billing record is kept but the workspace it belonged to is
          removed).
        </p>
      </Section>

      <Section heading="Related pages">
        <p>
          See our{' '}
          <Link href="/privacy" className="text-[#1DBF60] hover:underline">
            Privacy Policy
          </Link>{' '}
          for the full picture of what data Squadpitch collects and how it
          is processed, our{' '}
          <Link href="/terms" className="text-[#1DBF60] hover:underline">
            Terms of Service
          </Link>{' '}
          for the legal agreement that governs the service, and{' '}
          <Link href="/contact" className="text-[#1DBF60] hover:underline">
            Contact
          </Link>{' '}
          for the full list of email addresses for support, privacy, and
          legal inquiries.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Privacy and deletion requests:{' '}
          <a
            href="mailto:privacy@squadpitch.com?subject=Data%20Deletion%20Request"
            className="text-[#1DBF60] hover:underline"
          >
            privacy@squadpitch.com
          </a>
          .
        </p>
        <p className="text-sm text-gray-500">Squadpitch LLC · Ohio, USA</p>
      </Section>

      <p className="rounded-md border border-gray-200 bg-gray-50 p-4 text-xs text-gray-500">
        This Data Deletion page is a strong production draft prepared by
        Squadpitch and should be reviewed by a qualified attorney admitted
        in your jurisdiction before paid launch. It is not legal advice.
      </p>
    </LegalLayout>
  );
}
