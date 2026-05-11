import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Link2,
  Play,
  Sparkles,
  Wand2,
  Clock,
  Layers,
  Bot,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Squadpitch — Turn any listing into a week of social posts in 90 seconds',
  description:
    'Squadpitch is the AI social media generator for real estate agents. Paste a listing link and get a complete, ready-to-schedule campaign in seconds.',
};

// Auth links must hit the app subdomain — Auth0 v4 sets the state
// cookie host-only on /auth/login, so starting the flow on the apex
// (squadpitch.com) and finishing on the app host (app.squadpitch.com)
// loses the cookie and produces invalid_state on callback. Pinning to
// the canonical app origin keeps the whole flow on one host.
const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'https://app.squadpitch.com';
const SIGNUP_HREF = `${APP_ORIGIN}/auth/login?returnTo=/workspaces`;
const LOGIN_HREF = `${APP_ORIGIN}/auth/login?returnTo=/workspaces`;

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">
      <SiteHeader />
      <main>
        <Hero />
        <DemoSection />
        <BeforeAfter />
        <Benefits />
        <HowItWorks />
        <PricingPreview />
        <FinalCTA />
      </main>
      <SiteFooter />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Header                                                                     */
/* -------------------------------------------------------------------------- */

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-32 max-w-6xl items-center justify-between px-4 sm:h-48 sm:px-6">
        <Link
          href="/"
          className="-ml-4 flex items-center gap-2 font-semibold text-gray-900 sm:-ml-8"
          aria-label="Squadpitch home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/squadpitch-logo.png" alt="Squadpitch" className="h-14 w-auto sm:h-16 md:h-20" />
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-gray-600 md:flex">
          <a href="#demo" className="hover:text-gray-900">
            Watch Demo
          </a>
          <a href="#pricing" className="hover:text-gray-900">
            Pricing
          </a>
          <Link href={LOGIN_HREF} className="hover:text-gray-900">
            Log in
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={LOGIN_HREF}
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 md:hidden"
          >
            Log in
          </Link>
          <Link
            href={SIGNUP_HREF}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1DBF60] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#11A64F] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1DBF60] focus-visible:ring-offset-2"
          >
            Start Free
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Hero                                                                       */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(0,198,167,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(43,217,116,0.10),_transparent_60%)]"
      />
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-4 sm:px-6 sm:pb-20 sm:pt-6 lg:grid-cols-12 lg:gap-10 lg:pb-24 lg:pt-8">
        <div className="lg:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#AAF2EB] bg-[#CCFFFA]/60 px-3 py-1 text-xs font-medium text-[#007166]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            AI social media for real estate
          </div>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Turn any listing into{' '}
            <span className="bg-gradient-to-r from-[#00C6A7] to-[#1DBF60] bg-clip-text text-transparent">
              a week of social posts
            </span>{' '}
            in 90 seconds.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-gray-600">
            Squadpitch helps real estate agents generate ready-to-post campaigns from listings,
            websites, photos, and business data — with captions, media, and scheduling built in.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={SIGNUP_HREF}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1DBF60] px-6 py-3.5 text-base font-semibold text-white shadow-md shadow-[#1DBF60]/20 transition-colors hover:bg-[#11A64F] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1DBF60] focus-visible:ring-offset-2"
            >
              Start Free
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <a
              href="#demo"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3.5 text-base font-semibold text-gray-900 transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              <Play className="h-4 w-4" aria-hidden />
              Watch Demo
            </a>
          </div>

          <p className="mt-5 text-sm text-gray-500">
            Built for agents, teams, and brokerages that need consistent listing marketing.
          </p>
        </div>

        <div className="lg:col-span-5">
          <HeroMock />
        </div>
      </div>
    </section>
  );
}

function HeroMock() {
  const posts = [
    { tag: 'Instagram', body: 'Just listed in Westfield — 4 bd, light-filled, walk to the park.' },
    { tag: 'Facebook', body: 'New listing alert: a turn-key family home with the kitchen everyone wants.' },
    { tag: 'LinkedIn', body: 'Opportunity in Westfield: a rare floor plan in a school district that rarely turns over.' },
    { tag: 'Story', body: 'Open house Sunday 1–3pm. Tap for the tour.' },
    { tag: 'Reel', body: '60 seconds inside the home buyers are already DM\'ing about.' },
  ];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-[#00C6A7]/20 via-transparent to-[#1DBF60]/20 blur-2xl"
      />
      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xl shadow-gray-900/5">
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3">
          <Link2 className="h-4 w-4 text-gray-400" aria-hidden />
          <span className="truncate text-sm text-gray-500">https://yourbrokerage.com/123-elm-st</span>
          <span className="ml-auto rounded-md bg-[#1DBF60] px-2.5 py-1 text-xs font-semibold text-white">
            Generate
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {posts.map((p, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5 transition-shadow hover:shadow-sm"
            >
              <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[#CCFFFA] text-[#007166]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#1C8C81]">
                  {p.tag}
                </div>
                <div className="truncate text-sm text-gray-700">{p.body}</div>
              </div>
              <CheckCircle2 className="mt-1 h-4 w-4 flex-shrink-0 text-[#1DBF60]" aria-hidden />
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              This week
            </div>
            <span className="text-xs text-gray-500">5 scheduled</span>
          </div>
          <div className="mt-2.5 grid grid-cols-7 gap-1.5">
            {days.map((d, i) => {
              const filled = [0, 1, 3, 4, 6].includes(i);
              return (
                <div key={d} className="text-center">
                  <div className="text-[10px] font-medium text-gray-400">{d}</div>
                  <div
                    className={`mt-1 h-7 rounded-md ${
                      filled
                        ? 'bg-gradient-to-br from-[#00C6A7] to-[#1DBF60]'
                        : 'bg-white ring-1 ring-inset ring-gray-200'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Demo                                                                       */
/* -------------------------------------------------------------------------- */

function DemoSection() {
  const videoSrc = '/squadpitch-demo.mp4';

  return (
    <section id="demo" className="border-t border-gray-100 bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#AAF2EB] bg-[#CCFFFA]/60 px-3 py-1 text-xs font-medium text-[#007166]">
            <Play className="h-3.5 w-3.5" aria-hidden />
            90-second product demo
          </div>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            See a campaign created from a listing in under 2 minutes.
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Paste a listing link, let Squadpitch analyze the property, then review a complete
            campaign with platform-ready captions and selected media.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-4xl">
          <DemoVideo src={videoSrc} />
          <p className="mt-5 text-center text-sm text-gray-500">
            Watch a listing become a scheduled social campaign.
          </p>
        </div>
      </div>
    </section>
  );
}

function DemoVideo({ src }: { src: string }) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-[#00C6A7]/25 via-transparent to-[#1DBF60]/25 blur-2xl"
      />
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-[#0F3F3A] via-[#0a2a27] to-[#0F3F3A] shadow-2xl shadow-gray-900/15 ring-1 ring-black/5">
        {/* Static placeholder shown until the video frame paints */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
            <Play className="h-5 w-5 text-white" aria-hidden />
          </div>
        </div>
        {/* Place the demo poster image at public/squadpitch-demo-poster.png.
            (.png matches the existing middleware bypass for squadpitch-*.png;
            other extensions would auth-redirect.) If the file is missing the
            browser falls back to the first video frame and the Play overlay
            above; nothing breaks. */}
        <video
          className="relative aspect-video w-full"
          src={src}
          poster="/squadpitch-demo-poster.png"
          controls
          playsInline
          preload="metadata"
        >
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Before / After                                                             */
/* -------------------------------------------------------------------------- */

function BeforeAfter() {
  return (
    <section className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Before</div>
            <h3 className="mt-2 text-2xl font-bold text-gray-900">Before Squadpitch</h3>
            <p className="mt-4 text-base text-gray-600">
              A listing link, a folder of photos, and no time to post.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-gray-500">
              {[
                'Staring at a blank caption box',
                'Re-writing the same description for each platform',
                'Photos scattered across drives and inboxes',
                'Posts going up days late — or not at all',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-300" />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-[#AAF2EB] bg-gradient-to-br from-white to-[#CCFFFA]/40 p-8 shadow-md">
            <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-[#2BD974]/10 blur-3xl" aria-hidden />
            <div className="text-xs font-semibold uppercase tracking-wider text-[#11A64F]">After</div>
            <h3 className="mt-2 text-2xl font-bold text-gray-900">After Squadpitch</h3>
            <ul className="mt-6 space-y-3.5">
              {[
                'Instagram, Facebook, and LinkedIn captions',
                'Selected cover photo',
                'Multiple post angles',
                'Recommended schedule',
                'Approval workflow',
              ].map((line) => (
                <li key={line} className="flex items-start gap-3 text-base text-gray-800">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#1DBF60]" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Benefits                                                                   */
/* -------------------------------------------------------------------------- */

function Benefits() {
  const cards = [
    {
      icon: Wand2,
      title: 'Stop starting from scratch',
      body: 'Turn listings, websites, testimonials, and business info into social content fast.',
    },
    {
      icon: Clock,
      title: 'Post consistently',
      body: 'Generate campaigns you can approve, schedule, and manage from one planner.',
    },
    {
      icon: Bot,
      title: 'Let AI handle the busywork',
      body: 'Use Autopilot to recommend campaigns, surface opportunities, and keep your content moving.',
    },
  ];

  return (
    <section className="border-t border-gray-100 bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="grid gap-6 md:grid-cols-3">
          {cards.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#00C6A7] to-[#1DBF60] text-white shadow-sm">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-gray-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* How it works                                                               */
/* -------------------------------------------------------------------------- */

function HowItWorks() {
  const steps = [
    {
      icon: Link2,
      title: 'Paste your listing or website',
      body: 'Squadpitch reads the details and extracts the useful marketing angles.',
    },
    {
      icon: Layers,
      title: 'Review your campaign',
      body: 'Get ready-to-edit posts with captions, media, hashtags, and suggested timing.',
    },
    {
      icon: CalendarDays,
      title: 'Approve and schedule',
      body: 'Send posts to your planner, publish when ready, or let Autopilot help.',
    },
  ];

  return (
    <section className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            How Squadpitch works
          </h2>
        </div>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <li
              key={title}
              className="relative rounded-2xl border border-gray-200 bg-white p-7 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#CCFFFA] text-[#007166]">
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <span className="text-sm font-semibold text-gray-400">Step {i + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Pricing                                                                    */
/* -------------------------------------------------------------------------- */

// TODO: Replace Team CTA mailto with Calendly or sales form before broader launch.
const TEAM_CONTACT_HREF =
  'mailto:support@squadpitch.com?subject=Squadpitch%20Team%20Plan';

function PricingPreview() {
  const tiers: Array<{
    name: string;
    price: string;
    cadence?: string;
    tagline: string;
    points: string[];
    highlight?: boolean;
    ctaLabel: string;
    ctaHref: string;
  }> = [
    {
      name: 'Free',
      price: '$0',
      tagline: 'Try the magic.',
      points: ['1 workspace', 'A few campaigns to start', 'Core post generator'],
      ctaLabel: 'Start Free',
      ctaHref: SIGNUP_HREF,
    },
    {
      name: 'Solo',
      price: '$29',
      cadence: '/mo',
      tagline: 'For agents who want a consistent social presence.',
      points: [
        '50 posts/month',
        '3 connected channels',
        'Campaign builder',
        'Planner + scheduling',
      ],
      ctaLabel: 'Start Free',
      ctaHref: SIGNUP_HREF,
    },
    {
      name: 'Pro',
      price: '$59',
      cadence: '/mo',
      tagline: 'For agents who want Squadpitch to run their marketing automatically.',
      points: [
        '200 posts/month',
        'Autopilot recommendations',
        'AI persona tools',
        'Priority support',
      ],
      highlight: true,
      ctaLabel: 'Start Free',
      ctaHref: SIGNUP_HREF,
    },
    {
      name: 'Team',
      price: '$149',
      cadence: '/mo',
      tagline: 'For teams, brokerages, and high-volume content.',
      points: [
        'Multiple workspaces',
        'High-volume campaigns',
        'Team collaboration',
        'Brokerage/team support',
      ],
      ctaLabel: 'Talk to us',
      ctaHref: TEAM_CONTACT_HREF,
    },
  ];

  return (
    <section id="pricing" className="border-t border-gray-100 bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Start free. Upgrade when Squadpitch becomes part of your workflow.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                t.highlight
                  ? 'border-[#1DBF60] bg-white shadow-lg shadow-[#1DBF60]/10 ring-2 ring-[#1DBF60]/30'
                  : 'border-gray-200 bg-white shadow-sm'
              }`}
            >
              {t.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-[#1DBF60] px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  Recommended
                </span>
              )}
              <div className="text-lg font-semibold text-gray-900">{t.name}</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-gray-900">{t.price}</span>
                {t.cadence && <span className="text-sm font-medium text-gray-500">{t.cadence}</span>}
              </div>
              <p className="mt-2 text-sm text-gray-500">{t.tagline}</p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm text-gray-700">
                {t.points.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#1DBF60]" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
              {t.ctaHref.startsWith('mailto:') ? (
                <a
                  href={t.ctaHref}
                  className={`mt-6 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    t.highlight
                      ? 'bg-[#1DBF60] text-white hover:bg-[#11A64F]'
                      : 'border border-gray-200 bg-white text-gray-900 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {t.ctaLabel}
                </a>
              ) : (
                <Link
                  href={t.ctaHref}
                  className={`mt-6 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    t.highlight
                      ? 'bg-[#1DBF60] text-white hover:bg-[#11A64F]'
                      : 'border border-gray-200 bg-white text-gray-900 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {t.ctaLabel}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Final CTA                                                                  */
/* -------------------------------------------------------------------------- */

function FinalCTA() {
  return (
    <section className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F3F3A] via-[#007166] to-[#1DBF60] px-8 py-12 text-center shadow-xl sm:px-12 sm:py-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(204,255,250,0.15),_transparent_50%)]"
          />
          <h2 className="relative text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Your next listing already has a campaign inside it.
          </h2>
          <div className="relative mt-8 flex justify-center">
            <Link
              href={SIGNUP_HREF}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-4 text-base font-semibold text-[#0F3F3A] shadow-lg transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#007166]"
            >
              Generate My First Campaign
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Footer                                                                     */
/* -------------------------------------------------------------------------- */

function SiteFooter() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-gray-500 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/squadpitch-logo.png" alt="Squadpitch" className="h-16 w-auto" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <a href="#demo" className="hover:text-gray-700">
            Demo
          </a>
          <a href="#pricing" className="hover:text-gray-700">
            Pricing
          </a>
          <Link href="/help" className="hover:text-gray-700">
            Help
          </Link>
          <Link href="/privacy" className="hover:text-gray-700">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-gray-700">
            Terms
          </Link>
          <Link href="/contact" className="hover:text-gray-700">
            Contact
          </Link>
          <Link href="/data-deletion" className="hover:text-gray-700">
            Data Deletion
          </Link>
          <Link href={LOGIN_HREF} className="hover:text-gray-700">
            Log in
          </Link>
        </div>
        <div className="text-xs text-gray-400">
          © {new Date().getFullYear()} Squadpitch LLC. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

