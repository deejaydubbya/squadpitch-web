import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalLayout, Section } from '@/components/public/LegalLayout';

export const metadata: Metadata = {
  title: 'Contact | Squadpitch',
  description:
    'Reach the Squadpitch LLC team for support, privacy / data-deletion requests, billing questions, or help connecting your social media accounts.',
};

export default function ContactPage() {
  return (
    <LegalLayout title="Contact" lastUpdated="May 8, 2026">
      <p>
        <strong>Squadpitch LLC</strong> builds AI-assisted social media
        software — content generation, scheduling, publishing, and
        analytics — for real estate agents, small businesses, and teams.
        The fastest way to reach us is by email. Use the address below
        that best matches your question and we&apos;ll route it
        accordingly.
      </p>

      <Section heading="Support">
        <p>
          Trouble using the product, a connected social account that
          won&apos;t reconnect, billing questions, or anything else
          day-to-day:
        </p>
        <p>
          <a
            href="mailto:support@squadpitch.com"
            className="text-[#1DBF60] hover:underline"
          >
            support@squadpitch.com
          </a>
        </p>
      </Section>

      <Section heading="Privacy and data requests">
        <p>
          Account or personal-data access, export, correction, or full
          deletion requests:
        </p>
        <p>
          <a
            href="mailto:privacy@squadpitch.com"
            className="text-[#1DBF60] hover:underline"
          >
            privacy@squadpitch.com
          </a>
        </p>
        <p>
          Squadpitch does not currently provide a self-service in-app
          account-deletion button. Email the address above from the address
          on your account and we will verify and process the request. We
          aim to respond within 14 business days. See the{' '}
          <Link href="/privacy" className="text-[#1DBF60] hover:underline">
            Privacy Policy
          </Link>{' '}
          for full details on what we collect and how to exercise your
          rights.
        </p>
      </Section>

      <Section heading="Legal and general inquiries">
        <p>
          Partnership, vendor, security disclosure, or other legal
          correspondence:
        </p>
        <p>
          <a
            href="mailto:legal@squadpitch.com"
            className="text-[#1DBF60] hover:underline"
          >
            legal@squadpitch.com
          </a>
        </p>
        <p className="text-sm text-gray-500">
          If <code>legal@</code> is not yet provisioned for your message,
          email <code>support@</code> with &quot;Legal:&quot; in the subject
          line and we&apos;ll route it to the right person.
        </p>
      </Section>

      <Section heading="Common requests">
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <strong>Account deletion or data export</strong> — email{' '}
            <a
              href="mailto:privacy@squadpitch.com"
              className="text-[#1DBF60] hover:underline"
            >
              privacy@squadpitch.com
            </a>{' '}
            from the address on your account.
          </li>
          <li>
            <strong>Billing or refund questions</strong> — email{' '}
            <a
              href="mailto:support@squadpitch.com"
              className="text-[#1DBF60] hover:underline"
            >
              support@squadpitch.com
            </a>
            . Cancellations can be made anytime from Settings → Billing
            (Stripe customer portal).
          </li>
          <li>
            <strong>Help connecting a social platform</strong> — email{' '}
            <a
              href="mailto:support@squadpitch.com"
              className="text-[#1DBF60] hover:underline"
            >
              support@squadpitch.com
            </a>
            . Tell us which platform (Instagram, Facebook, TikTok, etc.)
            and any error message you saw. You can also disconnect and
            reconnect from Settings → Channels at any time.
          </li>
          <li>
            <strong>Security disclosure</strong> — email{' '}
            <a
              href="mailto:support@squadpitch.com"
              className="text-[#1DBF60] hover:underline"
            >
              support@squadpitch.com
            </a>{' '}
            with the subject &quot;Security:&quot;. We will respond as
            quickly as we can. Please do not publicly disclose
            vulnerabilities before we have a chance to remediate.
          </li>
        </ul>
      </Section>

      <Section heading="Legal documents">
        <p>
          See our{' '}
          <Link href="/terms" className="text-[#1DBF60] hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-[#1DBF60] hover:underline">
            Privacy Policy
          </Link>{' '}
          for the full agreement and data-handling details.
        </p>
      </Section>

      <Section heading="Mailing address">
        <p>Squadpitch LLC · Ohio, USA</p>
        <p className="text-sm text-gray-500">
          For postal mail, please email first so we can confirm an active
          delivery address.
        </p>
      </Section>
    </LegalLayout>
  );
}
