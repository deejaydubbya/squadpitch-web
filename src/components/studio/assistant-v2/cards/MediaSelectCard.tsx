'use client';

import { useMemo, useState, useCallback } from 'react';
import { ImageIcon, Film, Image as ImageLucide, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useAssets,
  useChannelSettings,
  useContentPreferences,
  useMediaProfile,
  type Channel,
  type MediaAsset,
} from '@/hooks/useSquadpitch';
import { useCampaignIntelligence } from '@/hooks/useCampaignIntelligence';
import { CHANNEL_REGISTRY } from '@/lib/channelRegistry';
import type { AssistantAction, AssistantSessionState } from '@/lib/assistant/types';
import { ImagePreviewModal } from './ImagePreviewModal';
import type { SelectableImage, TabId } from './media/types';
import { SelectionStrip } from './media/SelectionStrip';
import { MediaTabContext } from './media/MediaTabContext';
import { MediaTabRecent } from './media/MediaTabRecent';
import { MediaTabLibrary } from './media/MediaTabLibrary';
import { MediaTabUpload } from './media/MediaTabUpload';
import { MediaTabGenerate } from './media/MediaTabGenerate';

interface Props {
  session: AssistantSessionState;
  clientId: string;
  onSelection: (action: AssistantAction | AssistantAction[], confirmationText: string) => void;
}

interface TabDef {
  id: TabId;
  label: string;
}

function resolveTabs(session: AssistantSessionState, showGenerate: boolean): TabDef[] {
  const tabs: TabDef[] = [];

  // Context tab — only when there's relevant context
  const hasPropertyContext = session.mode === 'campaign' && !!session.propertyData;
  const hasDataItemContext = session.quickPostSource === 'data' && !!session.quickPostDataItemId;

  if (hasPropertyContext) {
    tabs.push({ id: 'context', label: 'Property Photos' });
  } else if (hasDataItemContext) {
    tabs.push({ id: 'context', label: 'Item Media' });
  }

  tabs.push({ id: 'recent', label: 'Recent' });
  tabs.push({ id: 'library', label: 'Library' });
  tabs.push({ id: 'upload', label: 'Upload & Import' });
  if (showGenerate) {
    tabs.push({ id: 'generate', label: 'Generate' });
  }

  return tabs;
}

function resolveDefaultTab(tabs: TabDef[]): TabId {
  return tabs[0]?.id ?? 'recent';
}

export function MediaSelectCard({ session, clientId, onSelection }: Props) {
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'image' | 'video'>('all');
  const { data: assets, isLoading } = useAssets(clientId, { status: 'READY' });
  const { data: channelSettings } = useChannelSettings(clientId);
  const { data: mediaProfile } = useMediaProfile(clientId);

  // Derive active channel for capability checks
  const activeChannel: Channel | null = session.quickPostChannel ?? null;
  const channelCap = activeChannel ? CHANNEL_REGISTRY[activeChannel] : null;
  const channelRequiresVideo = channelCap?.requiresVideo ?? false;

  // Effective media type filter — locked to 'video' when channel requires it
  const effectiveMediaTypeFilter = channelRequiresVideo ? 'video' : mediaTypeFilter;

  // AI generation availability
  const aiImageAvailable = mediaProfile?.mode === 'BRAND_ASSETS_PLUS_AI' || mediaProfile?.mode === 'AI_CHARACTER';

  // Content Preferences hint — when `autoGenerateMedia` is true and
  // AI is available, we default the active tab to "Generate" and
  // surface a banner so the user sees why. We deliberately don't
  // kick off generation silently — generation has cost/usage
  // implications that need a confirm click. The preference becomes
  // a visible default action, not an automatic side effect.
  const { data: contentPreferences } = useContentPreferences(clientId);
  const autoGenerateMedia = contentPreferences?.autoGenerateMedia ?? false;

  const connectedChannels: Channel[] = useMemo(() => {
    if (!channelSettings) return [];
    return channelSettings.filter((cs) => cs.isEnabled).map((cs) => cs.channel);
  }, [channelSettings]);

  const { mediaRec } = useCampaignIntelligence(session, connectedChannels, assets);

  // Build priority score map from intelligence
  const priorityScoreMap = useMemo(() => {
    const map = new Map<string, number>();
    if (mediaRec?.prioritized) {
      for (const item of mediaRec.prioritized) {
        map.set(item.id, item.score);
      }
    }
    return map;
  }, [mediaRec]);

  // Tab resolution. When `autoGenerateMedia=true` and the Generate
  // tab is available and the user hasn't already picked media, jump
  // them straight to Generate so generating-from-content is the
  // primary action surfaced.
  const tabs = useMemo(() => resolveTabs(session, aiImageAvailable), [session, aiImageAvailable]);
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const noPriorMedia =
      !session.mediaAcknowledged && session.selectedMediaIds.length === 0;
    if (autoGenerateMedia && aiImageAvailable && noPriorMedia) {
      return 'generate';
    }
    return resolveDefaultTab(tabs);
  });

  // Selection state
  const [selected, setSelected] = useState<Set<string>>(() => new Set(session.selectedMediaIds));
  const [heroId, setHeroId] = useState<string | null>(session.heroImageId);
  const [previewImage, setPreviewImage] = useState<SelectableImage | null>(null);

  // Image registry — deduped from all tabs
  const [imageRegistry, setImageRegistry] = useState<Map<string, SelectableImage>>(new Map());
  const allImages = useMemo(() => Array.from(imageRegistry.values()), [imageRegistry]);

  const handleImagesAvailable = useCallback((images: SelectableImage[]) => {
    setImageRegistry((prev) => {
      const next = new Map(prev);
      let changed = false;
      for (const img of images) {
        if (!next.has(img.id)) {
          next.set(img.id, img);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  // Auto-select context images on first render only — skip if user already went through media step
  const [autoSelected, setAutoSelected] = useState(
    () => session.mediaAcknowledged || session.selectedMediaIds.length > 0
  );
  const handleContextImagesAvailable = useCallback((images: SelectableImage[]) => {
    handleImagesAvailable(images);
    if (!autoSelected && images.length > 0 && selected.size === 0) {
      setAutoSelected(true);
      setSelected(new Set(images.map((img) => img.id)));
    }
  }, [handleImagesAvailable, autoSelected, selected.size]);

  // Selection actions
  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleHero = useCallback((id: string) => {
    setHeroId((prev) => (prev === id ? null : id));
  }, []);

  const handleSelectAll = useCallback((ids: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const handleClearIds = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setSelected((prev) => {
      const next = new Set(prev);
      idSet.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  const handleRemove = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // Upload handler — auto-selects uploaded images
  const handleImageUploaded = useCallback((image: SelectableImage) => {
    setImageRegistry((prev) => {
      const next = new Map(prev);
      next.set(image.id, image);
      return next;
    });
    setSelected((prev) => {
      const next = new Set(prev);
      next.add(image.id);
      return next;
    });
  }, []);

  // Build confirmation text with source + type breakdown
  const buildConfirmationText = (): string => {
    const selectedMedia = allImages.filter((img) => selected.has(img.id));
    const bySource: Record<string, number> = {};
    let imageCount = 0;
    let videoCount = 0;
    for (const img of selectedMedia) {
      bySource[img.source] = (bySource[img.source] ?? 0) + 1;
      if (img.assetType === 'video') videoCount++;
      else imageCount++;
    }

    const total = selectedMedia.length;
    if (total === 0) return 'No media selected';

    const typeParts: string[] = [];
    if (imageCount > 0) typeParts.push(`${imageCount} image${imageCount !== 1 ? 's' : ''}`);
    if (videoCount > 0) typeParts.push(`${videoCount} video${videoCount !== 1 ? 's' : ''}`);

    const parts: string[] = [];
    if (bySource.property) parts.push(`${bySource.property} property`);
    if (bySource.item) parts.push(`${bySource.item} data item`);
    if (bySource.library) parts.push(`${bySource.library} media library`);
    if (bySource.recent) parts.push(`${bySource.recent} recent`);
    if (bySource.upload) parts.push(`${bySource.upload} uploaded`);

    const heroSuffix = heroId ? ' \u00b7 cover photo set' : '';
    return `${typeParts.join(', ')} selected (${parts.join(', ')})${heroSuffix}`;
  };

  const confirm = () => {
    // Batch all actions into a single call so handleCardSelection advances only once
    const actions: AssistantAction[] = [];

    // Hero image if changed
    if (heroId !== session.heroImageId) {
      actions.push({ type: 'SET_HERO_IMAGE', payload: heroId });
    }

    // Store ALL selected IDs (including synthetic property_img_*/item_img_*).
    // Synthetic IDs are filtered at API boundaries (save, generation) not here.
    const allSelectedIds = Array.from(selected);
    if (allSelectedIds.length > 0) {
      actions.push({ type: 'SET_MEDIA', payload: allSelectedIds });
    } else {
      actions.push({ type: 'SET_MEDIA', payload: [] });
    }

    const text = allSelectedIds.length > 0
      ? buildConfirmationText()
      : 'No media selected';

    onSelection(actions, text);
  };

  const skip = () => {
    onSelection(
      { type: 'SET_MEDIA_ACKNOWLEDGED' },
      'Skipped \u2014 AI will generate without specific images'
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-4">
        <div className="w-5 h-5 border-2 border-white-20 border-t-accent-green-110 rounded-full animate-spin" />
        <span className="text-xs text-white-40">Loading media...</span>
      </div>
    );
  }

  const hasContextTab = tabs.some((t) => t.id === 'context');

  return (
    <div className="space-y-3">
      {/* Selection strip */}
      <SelectionStrip
        allImages={allImages}
        selected={selected}
        heroId={heroId}
        onRemove={handleRemove}
        onToggleHero={toggleHero}
      />

      {/* Auto-generate-media preference banner — only when the user
          has the preference set, AI is available, and nothing has
          been selected yet. Stays visible so the user can switch to
          a different tab if they prefer; we don't kick off
          generation automatically (cost/usage confirmation needs to
          happen inside MediaTabGenerate). */}
      {autoGenerateMedia && aiImageAvailable && selected.size === 0 && !session.mediaAcknowledged && (
        <div className="rounded-lg border border-accent-green-110/20 bg-accent-green-110/5 px-3 py-2 text-[11px] text-accent-green-110">
          Your preferences default to generating media when none is
          attached. Click <span className="font-semibold">Generate</span> to start, or pick a different tab.
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors',
              activeTab === tab.id
                ? 'bg-accent-green-110 text-sp-bg'
                : 'bg-white-5 text-white-40 hover:bg-white-10 hover:text-white-60'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Media type filter pills — hidden when channel locks to video */}
      {channelRequiresVideo ? (
        <div className="flex items-center gap-1.5">
          <Film className="w-3 h-3 text-white-40" />
          <span className="text-[9px] text-white-40">
            {channelCap?.label ?? 'Channel'} requires video
          </span>
        </div>
      ) : (
        <div className="flex gap-1">
          {(['all', 'image', 'video'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setMediaTypeFilter(filter)}
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors flex items-center gap-1',
                effectiveMediaTypeFilter === filter
                  ? 'bg-white-10 text-white-80'
                  : 'text-white-30 hover:text-white-50'
              )}
            >
              {filter === 'all' && <LayoutGrid className="w-2.5 h-2.5" />}
              {filter === 'image' && <ImageLucide className="w-2.5 h-2.5" />}
              {filter === 'video' && <Film className="w-2.5 h-2.5" />}
              {filter === 'all' ? 'All' : filter === 'image' ? 'Images' : 'Videos'}
            </button>
          ))}
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'context' && hasContextTab && (
        <MediaTabContext
          session={session}
          clientId={clientId}
          selected={selected}
          heroId={heroId}
          onToggle={toggle}
          onToggleHero={toggleHero}
          onPreview={setPreviewImage}
          priorityScoreMap={priorityScoreMap}
          mediaTypeFilter={effectiveMediaTypeFilter}
          onSelectAll={handleSelectAll}
          onClearIds={handleClearIds}
          onImagesAvailable={handleContextImagesAvailable}
        />
      )}

      {activeTab === 'recent' && (
        <MediaTabRecent
          clientId={clientId}
          selected={selected}
          heroId={heroId}
          onToggle={toggle}
          onToggleHero={toggleHero}
          onPreview={setPreviewImage}
          priorityScoreMap={priorityScoreMap}
          mediaTypeFilter={effectiveMediaTypeFilter}
          onImagesAvailable={handleImagesAvailable}
        />
      )}

      {activeTab === 'library' && (
        <MediaTabLibrary
          clientId={clientId}
          selected={selected}
          heroId={heroId}
          onToggle={toggle}
          onToggleHero={toggleHero}
          onPreview={setPreviewImage}
          priorityScoreMap={priorityScoreMap}
          mediaTypeFilter={effectiveMediaTypeFilter}
          mediaRec={mediaRec}
          onImagesAvailable={handleImagesAvailable}
        />
      )}

      {activeTab === 'upload' && (
        <MediaTabUpload
          clientId={clientId}
          onImageUploaded={handleImageUploaded}
        />
      )}

      {activeTab === 'generate' && aiImageAvailable && (
        <MediaTabGenerate
          clientId={clientId}
          session={session}
          selected={selected}
          onToggle={toggle}
          onImagesAvailable={handleImagesAvailable}
          onImageUploaded={handleImageUploaded}
          channelRequiresVideo={channelRequiresVideo}
          activeChannel={activeChannel}
          onSwitchToLibrary={() => setActiveTab('library')}
        />
      )}

      {/* Empty state — only show if no media at all across tabs */}
      {allImages.length === 0 && activeTab !== 'upload' && activeTab !== 'generate' && (
        <div className="flex flex-col items-center py-4 text-center">
          <ImageIcon className="w-5 h-5 text-white-30 mb-2" />
          <p className="text-xs text-white-40">No media available. Upload some or skip to generate without media.</p>
        </div>
      )}

      {/* Confirm / Skip buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={confirm}
          disabled={selected.size === 0}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            selected.size > 0
              ? 'bg-accent-green-110 text-sp-bg hover:bg-accent-green-110/90'
              : 'bg-white-10 text-white-40 cursor-not-allowed'
          )}
        >
          {selected.size > 0 ? `Confirm (${selected.size})` : 'Select media'}
        </button>

        <button
          onClick={skip}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white-40 hover:text-white-100 hover:bg-white-5 transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Selection summary */}
      {selected.size > 0 && (
        <p className="text-[10px] text-white-40">
          {buildConfirmationText()}
        </p>
      )}

      {/* Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          image={previewImage}
          isHero={heroId === previewImage.id}
          onHeroToggle={() => toggleHero(previewImage.id)}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}
