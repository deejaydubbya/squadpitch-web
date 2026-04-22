import {
  Home,
  MessageSquare,
  BookOpen,
  TrendingUp,
  User,
  Rocket,
} from 'lucide-react';

export const GOALS = ['Growth', 'Engagement', 'Sales'] as const;

export const CONTENT_TYPES = [
  { value: 'listing', label: 'Listing', icon: Home },
  { value: 'testimonial', label: 'Testimonial', icon: MessageSquare },
  { value: 'educational', label: 'Educational', icon: BookOpen },
  { value: 'market_update', label: 'Market Update', icon: TrendingUp },
  { value: 'personal', label: 'Personal / Story', icon: User },
  { value: 'growth', label: 'Growth', icon: Rocket },
] as const;

export type ContentType = typeof CONTENT_TYPES[number]['value'];

export const QUICK_CHIPS = [
  { label: 'Just listed post', guidance: 'Create a "Just Listed" post highlighting a new property listing with key features and excitement', type: 'listing' as ContentType },
  { label: 'Price drop alert', guidance: 'Create a price reduction alert post that creates urgency and highlights the new value', type: 'listing' as ContentType },
  { label: 'Client testimonial', guidance: 'Create a social proof post featuring a client testimonial that builds trust and credibility', type: 'testimonial' as ContentType },
  { label: 'Market update', guidance: 'Create a market update post sharing current trends, data, and insights that demonstrate expertise', type: 'market_update' as ContentType },
  { label: 'Open house', guidance: 'Create an open house announcement post with date, time, address, and compelling reasons to attend', type: 'listing' as ContentType },
  { label: 'Buyer tips', guidance: 'Create a post sharing 3 practical tips for home buyers that demonstrates expertise and attracts new followers', type: 'growth' as ContentType },
  { label: 'What does $X get you?', guidance: 'Create a curiosity-driven post about what a specific price point gets you in the local market', type: 'growth' as ContentType },
  { label: 'Myth buster', guidance: 'Bust a common real estate myth to position yourself as a trusted authority and attract new followers', type: 'growth' as ContentType },
];
