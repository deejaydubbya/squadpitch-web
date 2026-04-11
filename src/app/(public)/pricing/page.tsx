import Link from 'next/link';
import { Check } from 'lucide-react';

export default function PricingPage() {
  const tiers = [
    {
      name: 'Starter',
      price: '$29',
      period: '/month',
      desc: 'For individuals getting started',
      features: [
        '3 client workspaces',
        '100 AI generations/month',
        '100 publishes/month',
        '10 media generations/month',
        'All 6 social channels',
        'Brand & voice profiles',
      ],
      cta: 'Get started',
      primary: false,
    },
    {
      name: 'Growth',
      price: '$79',
      period: '/month',
      desc: 'For professionals and small teams',
      features: [
        '10 client workspaces',
        '500 AI generations/month',
        '200 publishes/month',
        '50 media generations/month',
        'All channels + OAuth publishing',
        'AI image & video generation',
        'Scheduled publishing',
        'Full analytics',
      ],
      cta: 'Start free trial',
      primary: true,
    },
    {
      name: 'Pro',
      price: '$199',
      period: '/month',
      desc: 'For agencies and power users',
      features: [
        'Unlimited workspaces',
        'Unlimited generations',
        'Unlimited publishes',
        'Unlimited media generations',
        'Everything in Growth',
        'Priority support',
      ],
      cta: 'Get started',
      primary: false,
    },
  ];

  return (
    <div className="py-20">
      <div className="max-w-5xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900 text-center">Pricing</h1>
        <p className="mt-4 text-lg text-gray-600 text-center">
          Simple, transparent pricing. No hidden fees.
        </p>
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`p-8 rounded-2xl border ${tier.primary ? 'border-teal ring-2 ring-teal/30 shadow-glow-teal' : 'border-gray-200'}`}
            >
              <h2 className="text-xl font-semibold text-gray-900">{tier.name}</h2>
              <p className="text-sm text-gray-500 mt-1">{tier.desc}</p>
              <div className="mt-6">
                <span className="text-4xl font-bold text-gray-900">{tier.price}</span>
                <span className="text-gray-500">{tier.period}</span>
              </div>
              <ul className="mt-8 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-teal mt-0.5">&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="/auth/login?screen_hint=signup&returnTo=/dashboard"
                className={`block mt-8 text-center py-2.5 rounded-lg text-sm font-medium ${
                  tier.primary
                    ? 'bg-teal text-white hover:bg-teal-dark'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
