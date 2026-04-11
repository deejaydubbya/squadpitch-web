import Link from 'next/link';

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="py-24 text-center bg-gradient-to-b from-teal-light to-white">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900">
            AI-Powered Social Media
            <span className="text-teal"> Content Studio</span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
            Generate on-brand social content for every channel. Schedule, approve, and publish — all from one workspace.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <a
              href="/auth/login?screen_hint=signup&returnTo=/dashboard"
              className="px-8 py-3 bg-teal text-white rounded-lg text-lg font-medium hover:bg-teal-dark shadow-glow-teal"
            >
              Start free
            </a>
            <Link
              href="/features"
              className="px-8 py-3 border border-gray-300 rounded-lg text-lg font-medium text-gray-700 hover:bg-gray-50"
            >
              See features
            </Link>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">
            Everything you need to create content at scale
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'AI Generation', desc: 'Generate posts, captions, video scripts, and more — tailored to your brand voice and style.' },
              { title: 'Multi-Channel', desc: 'Create content for Instagram, TikTok, X, LinkedIn, Facebook, and YouTube.' },
              { title: 'Brand Profiles', desc: 'Define your brand identity, voice rules, and visual style. Every piece of content stays on-brand.' },
              { title: 'Approval Workflow', desc: 'Review, edit, approve, or reject drafts before they go live. Full audit trail included.' },
              { title: 'Smart Scheduling', desc: 'Schedule content and let Squadpitch publish automatically at the right time.' },
              { title: 'Media Generation', desc: 'AI-powered image and video creation. Upload your own assets or generate them on demand.' },
            ].map((f) => (
              <div key={f.title} className="p-6 bg-white rounded-2xl border border-gray-100 hover:border-teal/30 hover:shadow-lg transition-all">
                <h3 className="text-lg font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center bg-gradient-to-t from-teal-light to-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900">
            Ready to streamline your content?
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Join teams who create better social content, faster.
          </p>
          <a
            href="/auth/login?screen_hint=signup&returnTo=/dashboard"
            className="inline-block mt-8 px-8 py-3 bg-teal text-white rounded-lg text-lg font-medium hover:bg-teal-dark shadow-glow-teal"
          >
            Get started for free
          </a>
        </div>
      </section>
    </div>
  );
}
