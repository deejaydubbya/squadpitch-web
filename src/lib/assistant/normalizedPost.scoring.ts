import type { Channel, ScoredHook } from '@/hooks/useSquadpitch';
import type { PostScore, PostVersion, PostMediaRef, ScoreBreakdownItem } from './normalizedPost.types';

// ── Grade helpers ───────────────────────────────────────────────────

function gradeFromRatio(ratio: number): ScoreBreakdownItem['grade'] {
  if (ratio >= 0.8) return 'strong';
  if (ratio >= 0.5) return 'decent';
  if (ratio > 0) return 'weak';
  return 'missing';
}

function gradeFromPoints(points: number, maxPoints: number): ScoreBreakdownItem['grade'] {
  return gradeFromRatio(maxPoints > 0 ? points / maxPoints : 0);
}

// ── Platform fit norms ──────────────────────────────────────────────

interface PlatformNorms {
  minChars: number;
  maxChars: number;
  minHashtags: number;
  maxHashtags: number;
}

const PLATFORM_NORMS: Partial<Record<Channel, PlatformNorms>> = {
  INSTAGRAM: { minChars: 100, maxChars: 2200, minHashtags: 5, maxHashtags: 15 },
  LINKEDIN: { minChars: 200, maxChars: 3000, minHashtags: 3, maxHashtags: 5 },
  X: { minChars: 1, maxChars: 280, minHashtags: 1, maxHashtags: 3 },
  FACEBOOK: { minChars: 100, maxChars: 500, minHashtags: 2, maxHashtags: 5 },
  TIKTOK: { minChars: 50, maxChars: 300, minHashtags: 3, maxHashtags: 5 },
};

// ── 7-dimension weighted scoring ────────────────────────────────────

interface WeightedParams {
  body: string;
  cta: string | null;
  hashtags: string[];
  hooks: string[];
  scoredHooks: ScoredHook[] | null;
  channel: Channel;
  mediaRefs?: PostMediaRef[];
  locationContext?: string;
}

function computeWeightedStrength(params: WeightedParams): PostScore {
  const { body, cta, hashtags, hooks, scoredHooks, channel, mediaRefs, locationContext } = params;
  const breakdown: ScoreBreakdownItem[] = [];
  let total = 0;

  // ── hookQuality: 20% → max 2.0 ─────────────────────────────────
  const scored = scoredHooks ?? [];
  const bestHookScore = scored.length > 0 ? scored[0].hookScore : 0;
  let hookRatio = 0;
  if (scored.length > 0 && bestHookScore >= 8) hookRatio = 1;
  else if (scored.length > 0 && bestHookScore >= 6) hookRatio = 0.7;
  else if (hooks.length >= 3) hookRatio = 1;
  else if (hooks.length >= 1 || scored.length > 0) hookRatio = 0.4;
  const hookPts = +(hookRatio * 2).toFixed(2);
  total += hookPts;
  breakdown.push({
    label: hookRatio >= 0.8
      ? `Strong opening hook${bestHookScore ? ` (${bestHookScore}/10)` : ''}`
      : hookRatio > 0
        ? `Hook could be stronger — try a question or bold statement`
        : 'No hook — add an attention-grabbing opener',
    points: hookPts, maxPoints: 2, isPositive: hookRatio >= 0.5,
    grade: gradeFromRatio(hookRatio),
  });

  // ── bodyLength: 15% → max 1.5 ──────────────────────────────────
  const bodyLen = body.trim().length;
  let bodyRatio = 0;
  if (bodyLen >= 100 && bodyLen <= 2000) bodyRatio = 1;
  else if (bodyLen >= 50) bodyRatio = 0.6;
  else if (bodyLen > 0) bodyRatio = 0.3;
  const bodyPts = +(bodyRatio * 1.5).toFixed(2);
  total += bodyPts;
  breakdown.push({
    label: bodyRatio >= 0.8
      ? `Good post length (${bodyLen} chars)`
      : bodyRatio > 0
        ? `Post is short (${bodyLen} chars) — aim for 100+ characters`
        : 'Post is empty — add your message',
    points: bodyPts, maxPoints: 1.5, isPositive: bodyRatio >= 0.5,
    grade: gradeFromRatio(bodyRatio),
  });

  // ── ctaPresence: 15% → max 1.5 ─────────────────────────────────
  const hasCta = !!(cta && cta.trim());
  const ctaPts = hasCta ? 1.5 : 0;
  total += ctaPts;
  breakdown.push({
    label: hasCta ? 'Clear call to action' : 'Missing call to action — tell readers what to do next',
    points: ctaPts, maxPoints: 1.5, isPositive: hasCta,
    grade: hasCta ? 'strong' : 'missing',
  });

  // ── hashtagCount: 10% → max 1.0 ────────────────────────────────
  let hashRatio = 0;
  if (hashtags.length >= 3 && hashtags.length <= 15) hashRatio = 1;
  else if (hashtags.length >= 1) hashRatio = 0.5;
  const hashPts = +(hashRatio * 1).toFixed(2);
  total += hashPts;
  breakdown.push({
    label: hashRatio >= 0.8
      ? `Good hashtag count (${hashtags.length})`
      : hashtags.length > 0
        ? `Only ${hashtags.length} hashtag${hashtags.length === 1 ? '' : 's'} — aim for 3-15`
        : 'No hashtags — add relevant hashtags for reach',
    points: hashPts, maxPoints: 1, isPositive: hashRatio >= 0.5,
    grade: gradeFromRatio(hashRatio),
  });

  // ── localRelevance: 15% → max 1.5 ──────────────────────────────
  let localRatio: number;
  if (!locationContext) {
    localRatio = 0.7; // neutral
  } else {
    const lc = locationContext.toLowerCase();
    const bodyLower = body.toLowerCase();
    localRatio = bodyLower.includes(lc) ? 1.0 : 0.5;
  }
  const localPts = +(localRatio * 1.5).toFixed(2);
  total += localPts;
  breakdown.push({
    label: localRatio >= 0.8
      ? 'References your local market'
      : localRatio >= 0.7
        ? 'Local relevance is neutral'
        : `Mention your market area to boost local appeal`,
    points: localPts, maxPoints: 1.5, isPositive: localRatio >= 0.7,
    grade: gradeFromRatio(localRatio),
  });

  // ── platformFit: 15% → max 1.5 ─────────────────────────────────
  const norms = PLATFORM_NORMS[channel];
  let platRatio: number;
  if (!norms) {
    platRatio = 0.7; // neutral for unknown channels
  } else {
    let lenScore = 0;
    if (bodyLen >= norms.minChars && bodyLen <= norms.maxChars) lenScore = 1;
    else if (bodyLen > 0) lenScore = 0.4;

    let tagScore = 0;
    if (hashtags.length >= norms.minHashtags && hashtags.length <= norms.maxHashtags) tagScore = 1;
    else if (hashtags.length >= 1) tagScore = 0.5;

    platRatio = lenScore * 0.6 + tagScore * 0.4;
  }
  const platPts = +(platRatio * 1.5).toFixed(2);
  total += platPts;
  const platLabel = (() => {
    if (platRatio >= 0.8) return `Good fit for ${channel}`;
    if (!norms) return `Platform fit is neutral`;
    const issues: string[] = [];
    if (bodyLen > norms.maxChars) issues.push(`caption too long (${bodyLen}/${norms.maxChars})`);
    else if (bodyLen < norms.minChars) issues.push(`caption too short (${bodyLen}/${norms.minChars})`);
    if (hashtags.length > norms.maxHashtags) issues.push(`too many hashtags (${hashtags.length}/${norms.maxHashtags})`);
    else if (hashtags.length < norms.minHashtags) issues.push(`needs more hashtags (${hashtags.length}/${norms.minHashtags})`);
    return issues.length > 0 ? `${channel}: ${issues.join(', ')}` : `Adjust for ${channel}`;
  })();
  breakdown.push({
    label: platLabel,
    points: platPts, maxPoints: 1.5, isPositive: platRatio >= 0.5,
    grade: gradeFromRatio(platRatio),
  });

  // ── mediaStrength: 10% → max 1.0 ───────────────────────────────
  let mediaRatio: number;
  if (!mediaRefs) {
    mediaRatio = 0.7; // neutral — no data provided
  } else if (mediaRefs.length === 0) {
    mediaRatio = 0.3;
  } else {
    const hasReal = mediaRefs.some((r) => r.source === 'user_selected' || r.source === 'auto_assigned');
    mediaRatio = hasReal ? 1.0 : 0.7;
  }
  const mediaPts = +(mediaRatio * 1).toFixed(2);
  total += mediaPts;
  breakdown.push({
    label: mediaRatio >= 0.8
      ? `Strong media attached (${mediaRefs?.length ?? 0} image${(mediaRefs?.length ?? 0) !== 1 ? 's' : ''})`
      : mediaRatio >= 0.5
        ? 'Media attached — consider using real photos'
        : 'No media — add images to boost engagement',
    points: mediaPts, maxPoints: 1, isPositive: mediaRatio >= 0.5,
    grade: gradeFromRatio(mediaRatio),
  });

  return { value: Math.round(total), max: 10, breakdown };
}

// ── Legacy 4-dimension scoring (backward compat) ────────────────────

interface LegacyParams {
  body: string;
  cta: string | null;
  hashtags: string[];
  hooks: string[];
  scoredHooks: ScoredHook[] | null;
}

function computeLegacyStrength(params: LegacyParams): PostScore {
  const { body, cta, hashtags, hooks, scoredHooks } = params;
  let score = 0;
  const breakdown: ScoreBreakdownItem[] = [];

  // ── Hook quality: 0-3 pts ─────────────────────────────────────────
  const scored = scoredHooks ?? [];
  const bestHookScore = scored.length > 0 ? scored[0].hookScore : 0;

  if (scored.length > 0 && bestHookScore >= 8) {
    score += 3;
    breakdown.push({ label: `Strong hooks (best: ${bestHookScore}/10)`, points: 3, maxPoints: 3, isPositive: true, grade: 'strong' });
  } else if (scored.length > 0 && bestHookScore >= 6) {
    score += 2;
    breakdown.push({ label: `Decent hooks (best: ${bestHookScore}/10)`, points: 2, maxPoints: 3, isPositive: true, grade: 'decent' });
  } else if (hooks.length >= 3) {
    score += 3;
    breakdown.push({ label: 'Strong hook options', points: 3, maxPoints: 3, isPositive: true, grade: 'strong' });
  } else if (hooks.length >= 1 || scored.length > 0) {
    score += 1;
    breakdown.push({ label: 'Hooks could be stronger', points: 1, maxPoints: 3, isPositive: false, grade: 'weak' });
  } else {
    breakdown.push({ label: 'No hooks — consider adding an attention-grabber', points: 0, maxPoints: 3, isPositive: false, grade: 'missing' });
  }

  // ── Body length: 0-3 pts ──────────────────────────────────────────
  const bodyLen = body.trim().length;
  if (bodyLen >= 100 && bodyLen <= 2000) {
    score += 3;
    breakdown.push({ label: 'Good post length', points: 3, maxPoints: 3, isPositive: true, grade: 'strong' });
  } else if (bodyLen >= 50) {
    score += 2;
    breakdown.push({ label: 'Decent length', points: 2, maxPoints: 3, isPositive: true, grade: 'decent' });
  } else if (bodyLen > 0) {
    score += 1;
    breakdown.push({ label: 'Post is short — add more detail', points: 1, maxPoints: 3, isPositive: false, grade: 'weak' });
  }

  // ── CTA presence: 0-2 pts ────────────────────────────────────────
  if (cta && cta.trim()) {
    score += 2;
    breakdown.push({ label: 'CTA present', points: 2, maxPoints: 2, isPositive: true, grade: 'strong' });
  } else {
    breakdown.push({ label: 'Missing CTA — add a call to action', points: 0, maxPoints: 2, isPositive: false, grade: 'missing' });
  }

  // ── Hashtag count: 0-2 pts ───────────────────────────────────────
  if (hashtags.length >= 3 && hashtags.length <= 15) {
    score += 2;
    breakdown.push({ label: 'Good hashtag count', points: 2, maxPoints: 2, isPositive: true, grade: 'strong' });
  } else if (hashtags.length >= 1) {
    score += 1;
    breakdown.push({ label: 'Few hashtags — add more', points: 1, maxPoints: 2, isPositive: false, grade: 'weak' });
  } else {
    breakdown.push({ label: 'No hashtags', points: 0, maxPoints: 2, isPositive: false, grade: 'missing' });
  }

  return { value: score, max: 10, breakdown };
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Compute a 0-10 post strength score from raw post data.
 *
 * When `channel` is provided, uses 7-dimension weighted scoring with
 * platform fit, local relevance, and media strength dimensions.
 * Otherwise, uses legacy 4-dimension scoring (0-3 + 0-3 + 0-2 + 0-2 = 0-10).
 */
export function computePostStrength(params: {
  body: string;
  cta: string | null;
  hashtags: string[];
  hooks: string[];
  scoredHooks: ScoredHook[] | null;
  channel?: Channel;
  mediaRefs?: PostMediaRef[];
  locationContext?: string;
}): PostScore {
  if (params.channel) {
    return computeWeightedStrength(params as WeightedParams);
  }
  return computeLegacyStrength(params);
}

/**
 * Returns the id of the highest-scoring version. First wins on ties.
 */
export function selectBestVersion(versions: PostVersion[]): string {
  if (versions.length === 0) return '';
  let bestId = versions[0].id;
  let bestScore = versions[0].score?.value ?? -1;
  for (let i = 1; i < versions.length; i++) {
    const v = versions[i];
    const s = v.score?.value ?? -1;
    if (s > bestScore) {
      bestScore = s;
      bestId = v.id;
    }
  }
  return bestId;
}
