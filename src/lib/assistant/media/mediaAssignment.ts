/**
 * Score-based image-to-post assignment for campaigns.
 *
 * Replaces naive round-robin with weighted scoring that considers:
 * - imageHint ↔ label match (40pts)
 * - Post angle → preferred image types (20pts)
 * - Hero image priority for first post (15pts)
 * - Tag/caption match against post label (10pts)
 * - Quality score weighting (0-10pts)
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
}

export interface AssignmentResult {
  postIndex: number;
  imageId: string;
  confidence: number;
  reason: string;
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

  return { score, reasons };
}

/**
 * Assign images to posts using weighted scoring.
 * Greedy: highest-confidence assignments first, avoiding duplicates
 * unless fewer images than posts.
 */
export function assignImagesToPosts(
  posts: CampaignPostInfo[],
  pool: ImagePoolEntry[]
): AssignmentResult[] {
  if (posts.length === 0 || pool.length === 0) return [];

  // Score all candidates
  const candidates: Array<{
    postIndex: number;
    imageId: string;
    score: number;
    reasons: string[];
  }> = [];

  for (let pi = 0; pi < posts.length; pi++) {
    for (const img of pool) {
      const { score, reasons } = scoreCandidate(posts[pi], pi, img);
      candidates.push({ postIndex: pi, imageId: img.id, score, reasons });
    }
  }

  // Sort by score descending (greedy assignment)
  candidates.sort((a, b) => b.score - a.score);

  const results: AssignmentResult[] = [];
  const assignedPosts = new Set<number>();
  const usedImages = new Set<string>();
  const allowReuse = pool.length < posts.length;

  for (const c of candidates) {
    if (assignedPosts.has(c.postIndex)) continue;
    if (usedImages.has(c.imageId) && !allowReuse) continue;

    results.push({
      postIndex: c.postIndex,
      imageId: c.imageId,
      confidence: c.score,
      reason: c.reasons.length > 0 ? c.reasons.join('; ') : 'Round-robin fallback',
    });
    assignedPosts.add(c.postIndex);
    usedImages.add(c.imageId);

    if (assignedPosts.size === posts.length) break;
  }

  // Fill any unassigned posts with round-robin
  if (assignedPosts.size < posts.length) {
    const availableImages = pool.map((p) => p.id);
    let rrIdx = 0;
    for (let pi = 0; pi < posts.length; pi++) {
      if (assignedPosts.has(pi)) continue;
      if (availableImages.length === 0) break;
      results.push({
        postIndex: pi,
        imageId: availableImages[rrIdx % availableImages.length],
        confidence: 0,
        reason: 'Round-robin fallback',
      });
      rrIdx++;
    }
  }

  return results;
}
