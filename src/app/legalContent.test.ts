// Lock-in tests for the public legal/contact page content. We assert
// against the page source files rather than rendering React because
// the project doesn't carry @testing-library/react. Source-level
// asserts are still meaningful: they catch accidental rebrand
// regressions, missing email addresses, and missing copyright text.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const TERMS = read('src/app/(public)/terms/page.tsx');
const PRIVACY = read('src/app/(public)/privacy/page.tsx');
const CONTACT = read('src/app/(public)/contact/page.tsx');
const DATA_DELETION = read('src/app/(public)/data-deletion/page.tsx');
const LEGAL_LAYOUT = read('src/components/public/LegalLayout.tsx');
const LANDING = read('src/app/(public)/page.tsx');

describe('Terms of Service page', () => {
  it('exists and exports a default page component', () => {
    expect(TERMS).toMatch(/export default function TermsPage/);
  });
  it('uses the canonical title format "Terms of Service | Squadpitch"', () => {
    expect(TERMS).toContain("title: 'Terms of Service | Squadpitch'");
  });
  it('names the legal operator as Squadpitch LLC', () => {
    expect(TERMS).toContain('Squadpitch LLC');
  });
  it('includes the support email', () => {
    expect(TERMS).toContain('support@squadpitch.com');
  });
  it('discloses AI-content review responsibility and platform dependencies', () => {
    expect(TERMS).toMatch(/review.*draft.*publishes/i);
    expect(TERMS).toMatch(/connected.*platform/i);
  });
  it('declares Ohio governing law', () => {
    expect(TERMS).toContain('State of Ohio');
  });
  it('notes the document is not attorney-approved', () => {
    expect(TERMS).toMatch(/reviewed by a qualified attorney/i);
  });
});

describe('Privacy Policy page', () => {
  it('exists and exports a default page component', () => {
    expect(PRIVACY).toMatch(/export default function PrivacyPage/);
  });
  it('uses the canonical title format "Privacy Policy | Squadpitch"', () => {
    expect(PRIVACY).toContain("title: 'Privacy Policy | Squadpitch'");
  });
  it('names the data controller as Squadpitch LLC', () => {
    expect(PRIVACY).toContain('Squadpitch LLC');
  });
  it('includes the privacy email', () => {
    expect(PRIVACY).toContain('privacy@squadpitch.com');
  });
  it('lists each major data category required by spec', () => {
    expect(PRIVACY).toMatch(/account information/i);
    expect(PRIVACY).toMatch(/workspace/i);
    expect(PRIVACY).toMatch(/integration tokens/i);
    expect(PRIVACY).toMatch(/billing/i);
    expect(PRIVACY).toMatch(/cookies/i);
  });
  it('lists the third-party processors actually used', () => {
    expect(PRIVACY).toContain('Auth0');
    expect(PRIVACY).toContain('Stripe');
    expect(PRIVACY).toContain('OpenAI');
    expect(PRIVACY).toContain('Cloudinary');
    expect(PRIVACY).toContain('Postmark');
    expect(PRIVACY).toContain('Twilio');
  });
  it('explains OAuth token storage and disconnection', () => {
    expect(PRIVACY).toMatch(/encrypted at rest/i);
    expect(PRIVACY).toMatch(/disconnect/i);
  });
  it('explains data deletion via privacy@', () => {
    expect(PRIVACY).toMatch(/account deletion/i);
  });
  it('notes the document is not attorney-approved', () => {
    expect(PRIVACY).toMatch(/reviewed by a qualified attorney/i);
  });
});

describe('Contact page', () => {
  it('exists and exports a default page component', () => {
    expect(CONTACT).toMatch(/export default function ContactPage/);
  });
  it('uses the canonical title format "Contact | Squadpitch"', () => {
    expect(CONTACT).toContain("title: 'Contact | Squadpitch'");
  });
  it('names the company as Squadpitch LLC', () => {
    expect(CONTACT).toContain('Squadpitch LLC');
  });
  it('includes all three email addresses (support / privacy / legal)', () => {
    expect(CONTACT).toContain('support@squadpitch.com');
    expect(CONTACT).toContain('privacy@squadpitch.com');
    expect(CONTACT).toContain('legal@squadpitch.com');
  });
  it('describes account-deletion path', () => {
    expect(CONTACT).toMatch(/Account deletion/i);
  });
  it('cross-links /terms and /privacy', () => {
    expect(CONTACT).toContain('href="/terms"');
    expect(CONTACT).toContain('href="/privacy"');
  });
});

describe('Data Deletion page', () => {
  it('exists and exports a default page component', () => {
    expect(DATA_DELETION).toMatch(/export default function DataDeletionPage/);
  });
  it('uses the canonical title format "Data Deletion | Squadpitch"', () => {
    expect(DATA_DELETION).toContain("title: 'Data Deletion | Squadpitch'");
  });
  it('names the data controller as Squadpitch LLC', () => {
    expect(DATA_DELETION).toContain('Squadpitch LLC');
  });
  it('includes the privacy email', () => {
    expect(DATA_DELETION).toContain('privacy@squadpitch.com');
  });
  it('mentions the canonical "Data Deletion Request" subject line', () => {
    expect(DATA_DELETION).toContain('Data Deletion Request');
  });
  it('explains the social-platform revocation path generically', () => {
    expect(DATA_DELETION).toMatch(/connected apps/i);
    expect(DATA_DELETION).toMatch(/revoke/i);
  });
  it('lists what may be retained (legal / billing / security / fraud / disputes / backups)', () => {
    expect(DATA_DELETION).toMatch(/legal obligations/i);
    expect(DATA_DELETION).toMatch(/tax/i);
    expect(DATA_DELETION).toMatch(/billing/i);
    expect(DATA_DELETION).toMatch(/security/i);
    expect(DATA_DELETION).toMatch(/fraud/i);
    expect(DATA_DELETION).toMatch(/dispute/i);
    expect(DATA_DELETION).toMatch(/backup/i);
  });
  it('cross-links /privacy, /terms, and /contact', () => {
    expect(DATA_DELETION).toContain('href="/privacy"');
    expect(DATA_DELETION).toContain('href="/terms"');
    expect(DATA_DELETION).toContain('href="/contact"');
  });
});

describe('Privacy → Data Deletion cross-link', () => {
  it('Privacy Policy points users to /data-deletion for the deletion walkthrough', () => {
    expect(PRIVACY).toContain('/data-deletion');
  });
});

describe('Footers — public site', () => {
  it('LegalLayout footer exposes Terms, Privacy, Contact, Data Deletion, and the LLC copyright', () => {
    expect(LEGAL_LAYOUT).toContain('href="/terms"');
    expect(LEGAL_LAYOUT).toContain('href="/privacy"');
    expect(LEGAL_LAYOUT).toContain('href="/contact"');
    expect(LEGAL_LAYOUT).toContain('href="/data-deletion"');
    expect(LEGAL_LAYOUT).toMatch(/Squadpitch LLC\. All rights reserved\./);
  });

  it('Landing-page footer exposes Terms, Privacy, Contact, Data Deletion, and the LLC copyright', () => {
    expect(LANDING).toContain('href="/terms"');
    expect(LANDING).toContain('href="/privacy"');
    expect(LANDING).toContain('href="/contact"');
    expect(LANDING).toContain('href="/data-deletion"');
    expect(LANDING).toMatch(/Squadpitch LLC\. All rights reserved\./);
  });
});
