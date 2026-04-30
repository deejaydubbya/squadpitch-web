'use client';

import { useState, useMemo, useCallback } from 'react';
import type { ScoredHook } from '@/hooks/useSquadpitch';
import type { NormalizedPost, PostScore, PostVersion } from '@/lib/assistant/normalizedPost.types';
import { computePostStrength, selectBestVersion } from '@/lib/assistant/normalizedPost.scoring';

export interface ImproveState {
  status: 'idle' | 'loading' | 'error';
  error: string | null;
  lastActionId: string | null;
}

const IDLE_IMPROVE: ImproveState = { status: 'idle', error: null, lastActionId: null };
const MAX_VERSIONS = 4;

/**
 * Hook managing local edit state for a NormalizedPost during review.
 * Tracks the selected version, edited body/cta/hashtags, and computed
 * post strength — all the state that was previously duplicated between
 * QuickPostReviewInner and PostReviewItem.
 */
export function usePostEditorState(normalizedPost: NormalizedPost) {
  const { versions: baseVersions, scoredHooks } = normalizedPost;

  // ── Local versions from AI improvements ──────────────────────────
  const [localVersions, setLocalVersions] = useState<PostVersion[]>([]);
  const [improveState, setImproveState] = useState<ImproveState>(IDLE_IMPROVE);

  // Merge base + local versions, cap at MAX_VERSIONS
  const versions = useMemo(() => {
    const merged = [...baseVersions, ...localVersions];
    return merged.slice(0, MAX_VERSIONS);
  }, [baseVersions, localVersions]);

  // Recompute best version from all versions
  const bestVersionId = useMemo(() => selectBestVersion(versions), [versions]);

  const [selectedVersionId, setSelectedVersionId] = useState(
    normalizedPost.selectedVersionId,
  );

  const selectedVersion = useMemo(
    () => versions.find((v) => v.id === selectedVersionId) ?? versions[0],
    [versions, selectedVersionId],
  );

  const [editedBody, setEditedBody] = useState(selectedVersion?.body ?? '');
  const [editedCta, setEditedCta] = useState(selectedVersion?.cta ?? '');
  const [editedHashtags, setEditedHashtags] = useState(
    selectedVersion?.hashtags?.join(', ') ?? '',
  );
  const [hashtagInput, setHashtagInput] = useState('');

  const parsedHashtags = useMemo(
    () =>
      editedHashtags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean),
    [editedHashtags],
  );

  const handleSelectVersion = useCallback(
    (versionId: string) => {
      setSelectedVersionId(versionId);
      const v = versions.find((ver) => ver.id === versionId);
      if (v) {
        setEditedBody(v.body);
        setEditedCta(v.cta ?? '');
        setEditedHashtags(v.hashtags.join(', '));
      }
    },
    [versions],
  );

  // ── Add a new version (from AI improvement) ─────────────────────
  const addVersion = useCallback(
    (version: PostVersion) => {
      setLocalVersions((prev) => {
        // Cap total at MAX_VERSIONS (accounting for base versions)
        const maxLocal = MAX_VERSIONS - baseVersions.length;
        const next = [...prev, version].slice(-maxLocal);
        return next;
      });
      // Auto-select the new version
      setSelectedVersionId(version.id);
      setEditedBody(version.body);
      setEditedCta(version.cta ?? '');
      setEditedHashtags(version.hashtags.join(', '));
    },
    [baseVersions.length],
  );

  // ── Improve state management ─────────────────────────────────────
  const setImproveLoading = useCallback((actionId: string) => {
    setImproveState({ status: 'loading', error: null, lastActionId: actionId });
  }, []);

  const setImproveError = useCallback((error: string) => {
    setImproveState((prev) => ({ ...prev, status: 'error', error }));
  }, []);

  const clearImproveState = useCallback(() => {
    setImproveState(IDLE_IMPROVE);
  }, []);

  // Sorted hooks: prefer scored hooks sorted by hookScore desc, else fall back
  const sortedHooks = useMemo<ScoredHook[]>(() => {
    const scored = scoredHooks ?? [];
    if (scored.length > 0) {
      return [...scored].sort((a, b) => b.hookScore - a.hookScore).slice(0, 5);
    }
    const fallback = selectedVersion?.hooks ?? [];
    return fallback.map((text) => ({ text, hookScore: 0, reason: '' }));
  }, [scoredHooks, selectedVersion?.hooks]);

  const hasScored = (scoredHooks?.length ?? 0) > 0;

  // Post strength score (recomputed live as edits happen)
  const postStrength: PostScore = useMemo(
    () =>
      computePostStrength({
        body: editedBody,
        cta: editedCta,
        hashtags: parsedHashtags,
        hooks: selectedVersion?.hooks ?? [],
        scoredHooks: scoredHooks ?? null,
      }),
    [editedBody, editedCta, parsedHashtags, selectedVersion?.hooks, scoredHooks],
  );

  // Replace first line of body with a hook
  const useHookAsOpeningLine = useCallback(
    (hookText: string) => {
      const lines = editedBody.split('\n');
      lines[0] = hookText;
      setEditedBody(lines.join('\n'));
    },
    [editedBody],
  );

  // Add a hashtag from the input field
  const addHashtag = useCallback(
    (tag: string) => {
      const clean = tag.trim().replace(/^#/, '');
      if (clean && !parsedHashtags.includes(clean)) {
        setEditedHashtags((prev) => (prev ? `${prev}, ${clean}` : clean));
      }
    },
    [parsedHashtags],
  );

  // Remove a hashtag by index
  const removeHashtag = useCallback(
    (index: number) => {
      const updated = parsedHashtags.filter((_, idx) => idx !== index);
      setEditedHashtags(updated.join(', '));
    },
    [parsedHashtags],
  );

  return {
    // Version state
    versions,
    selectedVersionId,
    bestVersionId,
    selectedVersion,
    handleSelectVersion,
    addVersion,

    // Improve state
    improveState,
    setImproveLoading,
    setImproveError,
    clearImproveState,

    // Edit state
    editedBody,
    setEditedBody,
    editedCta,
    setEditedCta,
    editedHashtags,
    setEditedHashtags,
    hashtagInput,
    setHashtagInput,
    parsedHashtags,
    addHashtag,
    removeHashtag,

    // Hooks
    sortedHooks,
    hasScored,
    useHookAsOpeningLine,

    // Score
    postStrength,
  };
}
