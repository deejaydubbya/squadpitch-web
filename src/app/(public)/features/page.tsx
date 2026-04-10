export default function FeaturesPage() {
  const features = [
    { title: 'AI Content Generation', desc: 'Generate social media posts, captions, video scripts, hooks, CTAs, and carousel content using GPT-4. Each piece is tailored to your brand profile, voice rules, and target audience.' },
    { title: 'Brand Profiles', desc: 'Define your brand description, industry, target audience, website, social presence, offers, and competitors. AI uses all of this context to generate authentic content.' },
    { title: 'Voice & Tone Rules', desc: 'Set tone guidelines, do/dont rules, banned phrases, CTA preferences, and content buckets with templates. Your brand voice stays consistent across every piece of content.' },
    { title: 'Media Strategy', desc: 'Choose between brand assets only, brand assets plus AI, or full AI character mode with LoRA models. Generate images and videos on demand with Fal.ai.' },
    { title: 'Channel Settings', desc: 'Configure per-channel settings including character limits, emoji preferences, trailing hashtags, and custom notes. Support for Instagram, TikTok, X, LinkedIn, Facebook, YouTube, and Blog.' },
    { title: 'Draft Workflow', desc: 'Full lifecycle management: Draft → Pending Review → Approved → Scheduled → Published. Reject with reasons, edit inline, and track all changes with audit logs.' },
    { title: 'Smart Scheduling', desc: 'Schedule approved drafts for automatic publishing. The system retries on transient failures and classifies errors as permanent, connection, or transient.' },
    { title: 'Channel Connections', desc: 'OAuth integration with Instagram, Facebook, TikTok, LinkedIn, and X. Connect accounts securely with encrypted token storage and automatic refresh.' },
    { title: 'Asset Library', desc: 'Upload images and videos, generate AI media, and attach assets to drafts. Full lifecycle tracking from pending through generation to ready.' },
    { title: 'Analytics', desc: 'Track draft counts by status, kind, and channel. Monitor approval and rejection rates with 14-day trend data.' },
  ];

  return (
    <div className="py-20">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900 text-center">Features</h1>
        <p className="mt-4 text-lg text-gray-600 text-center max-w-2xl mx-auto">
          Everything you need to create, manage, and publish social media content at scale.
        </p>
        <div className="mt-16 space-y-12">
          {features.map((f) => (
            <div key={f.title} className="border-b border-gray-100 pb-8">
              <h2 className="text-xl font-semibold text-gray-900">{f.title}</h2>
              <p className="mt-2 text-gray-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
