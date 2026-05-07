import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Same reasoning as (public)/page.tsx — auth must start on the canonical
// app origin so the state cookie set at /auth/login is sent back to
// /auth/callback. See LandingPage for full context.
const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'https://app.squadpitch.com';
const LOGIN_HREF = `${APP_ORIGIN}/auth/login?returnTo=/workspaces`;
const SIGNUP_HREF = `${APP_ORIGIN}/auth/login?returnTo=/workspaces`;

/**
 * Shared layout shell for public legal/trust pages (/privacy, /terms, /help).
 * Mirrors the landing page chrome so the look is consistent — light theme,
 * Inter font, gray-900 type — without depending on any of the marketing
 * components.
 */
export function LegalLayout({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">
      <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            aria-label="Squadpitch home"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to Squadpitch
          </Link>
          <Link
            href={SIGNUP_HREF}
            className="inline-flex items-center rounded-lg bg-[#1DBF60] px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#11A64F]"
          >
            Start Free
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Last updated {lastUpdated}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {title}
          </h1>
        </div>
        <div className="prose-legal space-y-6 text-[15px] leading-relaxed text-gray-700">
          {children}
        </div>
      </main>

      <footer className="border-t border-gray-100 bg-white">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-gray-500 sm:flex-row sm:px-6">
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-gray-700">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-gray-700">
              Terms
            </Link>
            <Link href="/help" className="hover:text-gray-700">
              Help
            </Link>
            <Link href={LOGIN_HREF} className="hover:text-gray-700">
              Log in
            </Link>
          </div>
          <div className="text-xs text-gray-400">
            © {new Date().getFullYear()} Squadpitch
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Tailwind-friendly helpers used inside the legal pages. */
export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-gray-900">{heading}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
