'use client';

import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Draft, PlannerSuggestion } from '@/hooks/useSquadpitch';

// ── Rules-based reason generator ──────────────────────────────────────

interface ReasonContext {
  /** From draft.sourceMeta */
  sourceMeta?: Draft['sourceMeta'];
  /** From PlannerSuggestion.reasoning */
  reasoning?: string;
  /** Whether the post was scheduled by autopilot */
  isAutopilot?: boolean;
  /** The content angle label */
  angleLabel?: string | null;
  /** Opportunity score (0-100) */
  score?: number;
}

/**
 * Generate user-facing reasons for why a post was suggested or scheduled.
 * Pure rules-based — no AI calls.
 */
export function generateReasons(ctx: ReasonContext): string[] {
  const reasons: string[] = [];

  const sm = ctx.sourceMeta;

  // 1. If there's an explicit reasoning string from planner, use it first
  if (ctx.reasoning) {
    reasons.push(ctx.reasoning);
  }

  // 2. Source type priority
  if (sm?.source === 'listing' || sm?.listingTitle) {
    reasons.push(
      sm?.listingTitle
        ? `Based on your listing "${sm.listingTitle}"`
        : 'Based on one of your listings'
    );
  } else if (sm?.source === 'review') {
    reasons.push('Uses a client testimonial for social proof');
  } else if (sm?.source === 'stat') {
    reasons.push('Built from your business stats and data');
  }

  // 3. Autopilot context
  if (sm?.autopilot || ctx.isAutopilot) {
    if (sm?.autopilotReason) {
      reasons.push(sm.autopilotReason);
    } else {
      reasons.push('Scheduled by Autopilot to maintain your posting cadence');
    }
  }

  // 4. Angle coverage reasoning
  if (ctx.angleLabel) {
    const category = inferCategory(ctx.angleLabel);
    if (category === 'listing') {
      reasons.push('Showcases your inventory to attract buyer interest');
    } else if (category === 'buyer') {
      reasons.push('Targets buyers with helpful guidance');
    } else if (category === 'lifestyle') {
      reasons.push('Adds lifestyle content to diversify your feed');
    } else if (category === 'authority') {
      reasons.push('Positions you as a market expert');
    }
  }

  // 5. Confidence score
  if (ctx.score != null && ctx.score > 0) {
    if (ctx.score >= 80) {
      reasons.push('High confidence based on recency and relevance');
    } else if (ctx.score >= 50) {
      reasons.push('Good fit based on your content mix');
    }
  }

  // 6. Rotated content
  if (sm?.rotated) {
    reasons.push('Rotated from a previously used asset for freshness');
  }

  // Deduplicate and limit to 3
  const unique = Array.from(new Set(reasons));
  return unique.slice(0, 3);
}

function inferCategory(angleLabel: string): string | null {
  const lower = angleLabel.toLowerCase();
  if (lower.includes('listing') || lower.includes('just listed') || lower.includes('open house') || lower.includes('price'))
    return 'listing';
  if (lower.includes('buyer') || lower.includes('investment'))
    return 'buyer';
  if (lower.includes('neighborhood') || lower.includes('family') || lower.includes('lifestyle'))
    return 'lifestyle';
  if (lower.includes('market') || lower.includes('expert') || lower.includes('trend') || lower.includes('local'))
    return 'authority';
  return null;
}

// ── Expandable WhyThis component ──────────────────────────────────────

interface WhyThisProps {
  reasons: string[];
  className?: string;
  defaultExpanded?: boolean;
}

export function WhyThis({ reasons, className, defaultExpanded = false }: WhyThisProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (reasons.length === 0) return null;

  return (
    <div className={cn('text-xs', className)}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpanded((v) => !v);
        }}
        className="inline-flex items-center gap-1 text-white-40 hover:text-white-60 transition-colors"
      >
        <HelpCircle className="w-3 h-3" />
        <span>Why this?</span>
        {expanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>
      {expanded && (
        <ul className="mt-1.5 ml-4 space-y-1">
          {reasons.map((reason, i) => (
            <li key={i} className="text-white-50 leading-relaxed flex items-start gap-1.5">
              <span className="text-white-20 mt-0.5">·</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
