/**
 * Score-based image-to-post assignment for campaigns.
 *
 * Weighted scoring signals:
 * - imageHint ↔ label match (40pts)
 * - Body content → image keyword match (30pts)
 * - Post angle → preferred image types (20pts)
 * - Hero image priority for first post (15pts)
 * - Tag/caption match against post label (10pts)
 * - Quality score weighting (0-10pts)
 *
 * Supports multi-image assignment via AssignmentOptions.
 */

export interface ImagePoolEntry {
  id: string;
  label: string;
  tags?: string[];
  altText?: string;
  quality?: number; // 0-10
  isHero?: boolean;
}

export interface CampaignPostInfo {
  label: string;
  imageHint?: string;
  angle?: string;
  channel?: string;
  campaignDay?: number;
  body?: string;
}

export interface AssignmentResult {
  postIndex: number;
  imageId: string;
  confidence: number;
  reason: string;
}

export interface MultiAssignmentResult {
  postIndex: number;
  imageIds: string[];
  confidences: number[];
  reasons: string[];
}

export interface AssignmentOptions {
  imagesPerPost?: number;       // target count, default 1
  maxImagesPerPost?: number;    // hard cap, default = imagesPerPost
  secondaryThreshold?: number;  // min score for 2nd+ image, default 10
}

// ── Confidence tier helpers ──────────────────────────────────────────

export type ConfidenceTier = 'high' | 'medium' | 'low';

export function getConfidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= 60) return 'high';
  if (confidence >= 25) return 'medium';
  return 'low';
}

export function getConfidenceLabel(confidence: number, imageLabel?: string): string {
  const tier = getConfidenceTier(confidence);
  const cleanLabel = imageLabel?.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').trim();
  if (tier === 'high') return cleanLabel ? `Best match: ${cleanLabel}` : 'Best match';
  if (tier === 'medium') return cleanLabel ? `Strong match: ${cleanLabel}` : 'Strong match';
  return 'Fallback image';
}

// Body content keyword patterns for matching post text to image labels/tags
const BODY_KEYWORD_PATTERNS: Array<{ keyword: string; pattern: RegExp }> = [
  { keyword: 'kitchen',       pattern: /\bkitchen\b/i },
  { keyword: 'bedroom',       pattern: /\b(bedroom|master\s*suite|guest\s*room)\b/i },
  { keyword: 'bathroom',      pattern: /\b(bathroom|bath\b|ensuite|en-suite)\b/i },
  { keyword: 'living',        pattern: /\b(living\s*room|great\s*room|family\s*room)\b/i },
  { keyword: 'dining',        pattern: /\b(dining\s*room|dining\s*area|breakfast\s*nook)\b/i },
  { keyword: 'exterior',      pattern: /\b(exterior|curb\s*appeal|front\s*(of|view))\b/i },
  { keyword: 'backyard',      pattern: /\b(backyard|back\s*yard|patio|deck|outdoor\s*space|garden)\b/i },
  { keyword: 'pool',          pattern: /\b(pool|swimming|spa)\b/i },
  { keyword: 'garage',        pattern: /\b(garage|car\s*port|parking)\b/i },
  { keyword: 'office',        pattern: /\b(office|study|home\s*office|work\s*from\s*home)\b/i },
  { keyword: 'basement',      pattern: /\b(basement|lower\s*level|rec\s*room)\b/i },
  { keyword: 'laundry',       pattern: /\b(laundry|utility\s*room|mudroom)\b/i },
  { keyword: 'aerial',        pattern: /\b(aerial|drone|bird.s?\s*eye)\b/i },
  { keyword: 'neighborhood',  pattern: /\b(neighborhood|community|walkab|nearby|location)\b/i },
  { keyword: 'upgrade',       pattern: /\b(upgrade|granite|quartz|stainless|hardwood|marble|renovation|remodel)\b/i },
  { keyword: 'lifestyle',     pattern: /\b(lifestyle|entertaining|gathering)\b/i },
  { keyword: 'front',         pattern: /\b(front\s*(door|porch|entry|entrance))\b/i },
];

export function extractBodyKeywords(body: string): string[] {
  return BODY_KEYWORD_PATTERNS
    .filter(({ pattern }) => pattern.test(body))
    .map(({ keyword }) => keyword);
}

// Maps post angles to preferred image characteristics
const ANGLE_IMAGE_PREFERENCES: Record<string, string[]> = {
  lifestyle: ['lifestyle', 'people', 'living', 'interior', 'warm', 'cozy'],
  feature: ['detail', 'feature', 'kitchen', 'bathroom', 'amenity', 'upgrade'],
  exterior: ['exterior', 'front', 'aerial', 'drone', 'street', 'curb'],
  aerial: ['aerial', 'drone', 'overhead', 'bird'],
  social_proof: ['team', 'agent', 'headshot', 'people', 'community'],
  authority: ['headshot', 'agent', 'professional', 'office', 'team'],
  announcement: ['hero', 'front', 'exterior', 'main', 'primary'],
  cta: ['hero', 'main', 'front', 'best'],
  reminder: ['hero', 'main', 'front', 'best'],
};

function scoreCandidate(
  post: CampaignPostInfo,
  postIndex: number,
  image: ImagePoolEntry
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const labelLower = (image.label || '').toLowerCase();
  const postLabelLower = (post.label || '').toLowerCase();

  // 1. imageHint ↔ label match (40pts)
  if (post.imageHint) {
    const hint = post.imageHint.toLowerCase();
    if (labelLower.includes(hint) || hint.includes(labelLower)) {
      score += 40;
      reasons.push(`Matches hint "${post.imageHint}"`);
    } else {
      // Partial word match
      const hintWords = hint.split(/\s+/);
      const labelWords = labelLower.split(/[\s_-]+/);
      const overlap = hintWords.filter((w) => labelWords.some((l) => l.includes(w) || w.includes(l)));
      if (overlap.length > 0) {
        score += 20;
        reasons.push(`Partial hint match: ${overlap.join(', ')}`);
      }
    }
  }

  // 2. Post angle → preferred image types (20pts)
  if (post.angle) {
    const prefs = ANGLE_IMAGE_PREFERENCES[post.angle.toLowerCase()];
    if (prefs) {
      const allText = `${labelLower} ${(image.tags ?? []).join(' ')} ${(image.altText ?? '').toLowerCase()}`;
      const matchCount = prefs.filter((p) => allText.includes(p)).length;
      if (matchCount > 0) {
        const angleScore = Math.min(20, matchCount * 7);
        score += angleScore;
        reasons.push(`Angle "${post.angle}" match (${matchCount} keywords)`);
      }
    }
  }

  // 3. Hero image priority for first post (15pts)
  if (postIndex === 0 && image.isHero) {
    score += 15;
    reasons.push('Hero image for lead post');
  }

  // 4. Tag/caption match against post label (10pts)
  if (postLabelLower) {
    const allImageText = `${labelLower} ${(image.tags ?? []).join(' ')} ${(image.altText ?? '').toLowerCase()}`;
    const postWords = postLabelLower.split(/\s+/).filter((w) => w.length > 3);
    const tagMatches = postWords.filter((w) => allImageText.includes(w));
    if (tagMatches.length > 0) {
      score += Math.min(10, tagMatches.length * 4);
      reasons.push(`Label match: ${tagMatches.slice(0, 3).join(', ')}`);
    }
  }

  // 5. Quality score (0-10pts)
  if (image.quality != null && image.quality > 0) {
    score += Math.min(10, image.quality);
    if (image.quality >= 8) reasons.push('High quality image');
  }

  // 6. Body content → image keyword match (up to 30pts)
  if (post.body) {
    const bodyKws = extractBodyKeywords(post.body);
    if (bodyKws.length > 0) {
      const allImageText = `${labelLower} ${(image.tags ?? []).join(' ').toLowerCase()} ${(image.altText ?? '').toLowerCase()}`;
      const matches = bodyKws.filter((kw) => allImageText.includes(kw));
      if (matches.length > 0) {
        const bodyScore = Math.min(30, matches.length * 12);
        score += bodyScore;
        reasons.push(`Body match: ${matches.slice(0, 3).join(', ')}`);
      }
    }
  }

  return { score, reasons };
}

/**
 * Assign images to posts using weighted scoring.
 * Greedy: highest-confidence assignments first, avoiding duplicates
 * unless fewer images than posts.
 *
 * When `options` is provided, returns MultiAssignmentResult[] with
 * multiple images per post. Without options, returns legacy AssignmentResult[].
 */
export function assignImagesToPosts(
  posts: CampaignPostInfo[],
  pool: ImagePoolEntry[],
  options?: AssignmentOptions
): MultiAssignmentResult[] {
  if (posts.length === 0 || pool.length === 0) return [];

  const imagesPerPost = options?.imagesPerPost ?? 1;
  const maxPerPost = options?.maxImagesPerPost ?? imagesPerPost;
  const secondaryThreshold = options?.secondaryThreshold ?? 10;

  // Score all (post, image) pairs
  const scoreMatrix: Array<{
    postIndex: number;
    imageId: string;
    score: number;
    reasons: string[];
  }> = [];

  for (let pi = 0; pi < posts.length; pi++) {
    for (const img of pool) {
      const { score, reasons } = scoreCandidate(posts[pi], pi, img);
      scoreMatrix.push({ postIndex: pi, imageId: img.id, score, reasons });
    }
  }

  // Sort by score descending (greedy primary assignment)
  scoreMatrix.sort((a, b) => b.score - a.score);

  // Phase 1: Greedy primary — assign 1 best image per post, avoiding duplicates
  const resultMap = new Map<number, MultiAssignmentResult>();
  const primaryUsed = new Set<string>();
  const allowReuse = pool.length < posts.length;

  for (const c of scoreMatrix) {
    if (resultMap.has(c.postIndex)) continue;
    if (primaryUsed.has(c.imageId) && !allowReuse) continue;

    resultMap.set(c.postIndex, {
      postIndex: c.postIndex,
      imageIds: [c.imageId],
      confidences: [c.score],
      reasons: [c.reasons.length > 0 ? c.reasons.join('; ') : 'Best scored match'],
    });
    primaryUsed.add(c.imageId);

    if (resultMap.size === posts.length) break;
  }

  // Phase 2: Secondary fill — add more images per post above threshold
  if (maxPerPost > 1) {
    // Build per-post ranked lists (excluding already-assigned primary)
    for (let pi = 0; pi < posts.length; pi++) {
      const result = resultMap.get(pi);
      if (!result) continue;

      const assigned = new Set(result.imageIds);
      const postCandidates = scoreMatrix
        .filter((c) => c.postIndex === pi && !assigned.has(c.imageId) && c.score >= secondaryThreshold)
        .slice(0, maxPerPost - 1); // already sorted by score desc

      for (const c of postCandidates) {
        if (result.imageIds.length >= maxPerPost) break;
        result.imageIds.push(c.imageId);
        result.confidences.push(c.score);
        result.reasons.push(c.reasons.length > 0 ? c.reasons.join('; ') : 'Secondary match');
      }
    }
  }

  // Phase 2.5: Guarantee target — fill up to imagesPerPost even if below threshold
  if (imagesPerPost > 1) {
    const allImageIds = pool.map((p) => p.id);
    for (let pi = 0; pi < posts.length; pi++) {
      const result = resultMap.get(pi);
      if (!result || result.imageIds.length >= imagesPerPost) continue;

      const assigned = new Set(result.imageIds);
      // Pick remaining candidates by score (even score 0), excluding already assigned
      const remaining = scoreMatrix
        .filter((c) => c.postIndex === pi && !assigned.has(c.imageId))
        .slice(0, imagesPerPost - result.imageIds.length);

      for (const c of remaining) {
        if (result.imageIds.length >= maxPerPost) break;
        result.imageIds.push(c.imageId);
        result.confidences.push(c.score);
        result.reasons.push(c.reasons.length > 0 ? c.reasons.join('; ') : 'Fill to target');
      }
    }
  }

  // Phase 3: Round-robin fallback for unassigned posts
  if (resultMap.size < posts.length) {
    const availableImages = pool.map((p) => p.id);
    let rrIdx = 0;
    for (let pi = 0; pi < posts.length; pi++) {
      if (resultMap.has(pi)) continue;
      if (availableImages.length === 0) break;
      resultMap.set(pi, {
        postIndex: pi,
        imageIds: [availableImages[rrIdx % availableImages.length]],
        confidences: [0],
        reasons: ['Round-robin fallback'],
      });
      rrIdx++;
    }
  }

  return Array.from(resultMap.values());
}
