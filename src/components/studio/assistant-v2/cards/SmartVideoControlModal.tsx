'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { X, GripVertical, Trash2, Loader2, EyeOff, Eye, AlertTriangle, User, Info } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { SmartVideoConfig, SmartVideoSceneConfig, MotionStyle } from '@/lib/video/videoCompositor.types';
import type { VideoImageInput } from '@/hooks/useVideoCompositor';
import { classifyImageLabel, getStyledClipDuration } from '@/lib/video/motionPresets';
import { extractTextSlides } from '@/lib/video/textOverlay';
import { getConfidenceTier } from '@/lib/assistant/media/mediaAssignment';
import { StatusBanner } from '@/components/common/StatusBanner';
import { useBrandPersona } from '@/hooks/useSquadpitch';

// ── Types ────────────────────────────────────────────────────────────

interface SmartVideoControlModalProps {
  images: VideoImageInput[];
  body: string;
  cta: string | null;
  channel: string;
  clientId: string;
  onGenerate: (config: SmartVideoConfig) => void;
  onClose: () => void;
  isGenerating?: boolean;
}

// ── Motion style options ─────────────────────────────────────────────

const MOTION_OPTIONS: { value: MotionStyle; label: string; description: string }[] = [
  { value: 'smooth', label: 'Smooth', description: 'Gentle, cinematic movement' },
  { value: 'dynamic', label: 'Dynamic', description: 'Faster, energetic pans & zooms' },
  { value: 'slow', label: 'Slow', description: 'Relaxed, longer scenes' },
];

// ── Sortable scene row ───────────────────────────────────────────────

interface SortableSceneRowProps {
  scene: SmartVideoSceneConfig;
  index: number;
  id: string;
  overlaysEnabled: boolean;
  onDurationChange: (index: number, dur: number) => void;
  onTextChange: (index: number, text: string) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

function SortableSceneRow({
  scene,
  index,
  id,
  overlaysEnabled,
  onDurationChange,
  onTextChange,
  onRemove,
  canRemove,
}: SortableSceneRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const tier = getConfidenceTier(scene.confidence);
  const badgeColor =
    tier === 'high'
      ? 'bg-accent-green-110/20 text-accent-green-110'
      : tier === 'medium'
        ? 'bg-accent-orange/20 text-accent-orange'
        : 'bg-accent-red/20 text-accent-red';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex items-center gap-2 p-1.5 rounded-lg bg-white-5 border border-white-10"
    >
      {/* Drag handle */}
      <div
        {...listeners}
        className="shrink-0 px-0.5 py-2 cursor-grab active:cursor-grabbing text-white-20 hover:text-white-40 transition-colors"
        title="Drag to reorder"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Thumbnail */}
      <img
        src={scene.imageUrl}
        alt={scene.label}
        className="w-12 h-12 rounded object-cover shrink-0"
      />

      {/* Label badge */}
      <span className={`shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded capitalize ${badgeColor} max-w-[80px] truncate`}>
        {scene.label !== 'other'
          ? scene.label.replace(/_/g, ' ')
          : scene.tags?.[0] || `Photo ${index + 1}`}
      </span>

      {/* Duration slider */}
      <div className="flex flex-col items-center gap-0.5 shrink-0 w-20">
        <span className="text-[9px] text-white-40 tabular-nums">{scene.durationSec.toFixed(1)}s</span>
        <input
          type="range"
          min={0.5}
          max={10.0}
          step={0.5}
          value={scene.durationSec}
          onChange={(e) => onDurationChange(index, parseFloat(e.target.value))}
          className="w-full h-1 accent-accent-green-110"
        />
      </div>

      {/* Text input */}
      {overlaysEnabled ? (
        <input
          type="text"
          value={scene.text ?? ''}
          onChange={(e) => onTextChange(index, e.target.value)}
          placeholder="Overlay text…"
          className="flex-1 min-w-0 px-1.5 py-1 rounded bg-white-5 border border-white-10 text-[10px] text-white-80 placeholder:text-white-20 focus:outline-none focus:border-accent-green-110/50"
        />
      ) : (
        <div className="flex-1 min-w-0 px-1.5 py-1 text-[10px] text-white-20 italic">
          Overlays disabled
        </div>
      )}

      {/* Remove button */}
      <button
        onClick={() => onRemove(index)}
        disabled={!canRemove}
        className="shrink-0 p-1 rounded hover:bg-white-10 text-white-30 hover:text-accent-red transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Main modal ───────────────────────────────────────────────────────

export function SmartVideoControlModal({
  images,
  body,
  cta,
  channel,
  clientId,
  onGenerate,
  onClose,
  isGenerating,
}: SmartVideoControlModalProps) {
  const [motionStyle, setMotionStyle] = useState<MotionStyle>('smooth');
  const [manualDurations, setManualDurations] = useState<Set<number>>(new Set());
  const [overlaysEnabled, setOverlaysEnabled] = useState(true);

  // Persona branding
  const { data: persona } = useBrandPersona(clientId);
  const personaReady = persona?.status === 'COMPLETED';
  const [personaIntro, setPersonaIntro] = useState(false);
  const [personaOutro, setPersonaOutro] = useState(false);
  const [personaThumbnail, setPersonaThumbnail] = useState(false);

  // Build initial scenes from images
  const buildInitialScenes = useCallback(
    (style: MotionStyle): SmartVideoSceneConfig[] => {
      const validImages = images.filter((img) => img.confidence >= 25 && img.url);
      const fallbackImages = validImages.length > 0 ? validImages : images.filter((img) => img.url);
      const textSlides = extractTextSlides(body, cta, fallbackImages.length);
      const textByScene = new Map(textSlides.map((s) => [s.sceneIndex, s]));

      return fallbackImages.map((img, i) => {
        const label = classifyImageLabel(img.label, img.tags, img.url);
        const slide = textByScene.get(i);
        return {
          imageUrl: img.url,
          label,
          originalLabel: img.label,
          durationSec: getStyledClipDuration(label, style),
          text: slide?.text,
          textRole: slide?.role,
          confidence: img.confidence,
          tags: img.tags,
        };
      });
    },
    [images, body, cta],
  );

  const [scenes, setScenes] = useState<SmartVideoSceneConfig[]>(() => buildInitialScenes('smooth'));

  // Stable IDs for dnd-kit
  const sceneIds = useMemo(() => scenes.map((_, i) => `scene-${i}`), [scenes.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const hasWeakConfidence = scenes.some((s) => getConfidenceTier(s.confidence) === 'low');
  const fewImages = scenes.length < 3;

  const personaFrameCount = (personaIntro ? 1 : 0) + (personaOutro ? 1 : 0);
  const totalDuration = useMemo(
    () => scenes.reduce((sum, s) => sum + s.durationSec, 0) + personaFrameCount * 3.0,
    [scenes, personaFrameCount],
  );

  // ── Handlers ─────────────────────────────────────────────────────

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIdx = sceneIds.indexOf(String(active.id));
      const newIdx = sceneIds.indexOf(String(over.id));

      setScenes((prev) => {
        const next = [...prev];
        const [moved] = next.splice(oldIdx, 1);
        next.splice(newIdx, 0, moved);
        return next;
      });

      // Update manual duration tracking indices
      setManualDurations((prev) => {
        const arr = Array.from(prev);
        const remapped = new Set<number>();
        for (const idx of arr) {
          if (idx === oldIdx) {
            remapped.add(newIdx);
          } else if (idx > oldIdx && idx <= newIdx) {
            remapped.add(idx - 1);
          } else if (idx < oldIdx && idx >= newIdx) {
            remapped.add(idx + 1);
          } else {
            remapped.add(idx);
          }
        }
        return remapped;
      });
    },
    [sceneIds],
  );

  const handleDurationChange = useCallback(
    (index: number, dur: number) => {
      setScenes((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], durationSec: dur };
        return next;
      });
      setManualDurations((prev) => new Set(prev).add(index));
    },
    [],
  );

  const handleTextChange = useCallback((index: number, text: string) => {
    setScenes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], text: text || undefined };
      return next;
    });
  }, []);

  const handleRemove = useCallback((index: number) => {
    setScenes((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
    setManualDurations((prev) => {
      const next = new Set<number>();
      Array.from(prev).forEach((idx) => {
        if (idx === index) return;
        next.add(idx > index ? idx - 1 : idx);
      });
      return next;
    });
  }, []);

  const handleMotionStyleChange = useCallback(
    (style: MotionStyle) => {
      setMotionStyle(style);
      // Recalculate durations for non-manually-edited scenes
      setScenes((prev) =>
        prev.map((scene, i) => {
          if (manualDurations.has(i)) return scene;
          return { ...scene, durationSec: getStyledClipDuration(scene.label, style) };
        }),
      );
    },
    [manualDurations],
  );

  const handleGenerate = useCallback(() => {
    // If overlays disabled, strip text from scenes
    const finalScenes = overlaysEnabled
      ? scenes
      : scenes.map((s) => ({ ...s, text: undefined, textRole: undefined }));

    const config: SmartVideoConfig = {
      scenes: finalScenes,
      motionStyle,
      transitionDurationSec: 0.5,
      personaFrames: (personaIntro || personaOutro || personaThumbnail)
        ? { intro: personaIntro, outro: personaOutro, thumbnail: personaThumbnail }
        : undefined,
    };
    onGenerate(config);
  }, [scenes, motionStyle, overlaysEnabled, personaIntro, personaOutro, personaThumbnail, onGenerate]);

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[85vh] flex flex-col bg-sp-surface rounded-xl border border-white-10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white-10">
          <h2 className="text-sm font-semibold text-white-100">Smart Video Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white-10 text-white-40 hover:text-white-60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Warnings */}
          {hasWeakConfidence && (
            <StatusBanner warning="Some images have low confidence — they may not match the post content well." />
          )}
          {fewImages && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-accent-orange/10 border border-accent-orange/20 text-[11px] text-accent-orange">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Fewer than 3 images selected. Listing/property videos work best with 3–5 images.
            </div>
          )}

          {/* Scene list */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[9px] text-white-40 uppercase tracking-wider font-medium">
                Scenes ({scenes.length})
              </p>
              <span className="text-[9px] text-white-30">Drag to reorder</span>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sceneIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
                  {scenes.map((scene, i) => (
                    <SortableSceneRow
                      key={sceneIds[i]}
                      id={sceneIds[i]}
                      scene={scene}
                      index={i}
                      overlaysEnabled={overlaysEnabled}
                      onDurationChange={handleDurationChange}
                      onTextChange={handleTextChange}
                      onRemove={handleRemove}
                      canRemove={scenes.length > 1}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* Motion style pills */}
          <div>
            <p className="text-[9px] text-white-40 uppercase tracking-wider mb-1.5">Motion Style</p>
            <div className="flex gap-2">
              {MOTION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleMotionStyleChange(opt.value)}
                  className={`flex-1 px-2.5 py-2 rounded-lg text-left transition-colors border ${
                    motionStyle === opt.value
                      ? 'border-accent-green-110 bg-accent-green-110/10'
                      : 'border-white-10 bg-white-5 hover:bg-white-10'
                  }`}
                >
                  <span
                    className={`text-[11px] font-medium block ${
                      motionStyle === opt.value ? 'text-accent-green-110' : 'text-white-80'
                    }`}
                  >
                    {opt.label}
                  </span>
                  <span className="text-[9px] text-white-40">{opt.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Text overlay toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-[9px] text-white-40 uppercase tracking-wider">Text Overlays</p>
              <p className="text-[9px] text-white-30 mt-0.5">
                {overlaysEnabled ? 'Hook, key points, and CTA text on video' : 'No text overlays on video'}
              </p>
            </div>
            <button
              onClick={() => setOverlaysEnabled(!overlaysEnabled)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-white-5 border border-white-10 hover:bg-white-10 transition-colors"
            >
              {overlaysEnabled ? (
                <><Eye className="w-3 h-3 text-accent-green-110" /> On</>
              ) : (
                <><EyeOff className="w-3 h-3 text-white-40" /> Off</>
              )}
            </button>
          </div>

          {/* Personalized Branding */}
          <div>
            <p className="text-[9px] text-white-40 uppercase tracking-wider mb-1.5">
              Personalized Branding
            </p>
            {personaReady ? (
              <>
                <p className="text-[10px] text-white-60 mb-2">
                  <User className="w-3 h-3 inline-block mr-1 -mt-0.5" />
                  {persona?.name || 'AI Brand Persona'}
                </p>
                <div className="flex gap-2">
                  {([
                    { key: 'intro' as const, label: 'Intro frame', value: personaIntro, set: setPersonaIntro },
                    { key: 'outro' as const, label: 'Outro frame', value: personaOutro, set: setPersonaOutro },
                    { key: 'thumbnail' as const, label: 'Thumbnail', value: personaThumbnail, set: setPersonaThumbnail },
                  ]).map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => opt.set(!opt.value)}
                      className={`flex-1 px-2.5 py-2 rounded-lg text-center transition-colors border ${
                        opt.value
                          ? 'border-accent-green-110 bg-accent-green-110/10'
                          : 'border-white-10 bg-white-5 hover:bg-white-10'
                      }`}
                    >
                      <span
                        className={`text-[11px] font-medium ${
                          opt.value ? 'text-accent-green-110' : 'text-white-80'
                        }`}
                      >
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <Link
                href={`/workspaces/${clientId}/settings/ai-persona`}
                className="block text-[10px] text-accent-green-110 hover:underline"
              >
                Create your AI Brand Persona for personalized intro/outro frames &rarr;
              </Link>
            )}
            <div className="flex items-start gap-1.5 mt-2 p-2 rounded-lg bg-white-5 border border-white-10">
              <Info className="w-3 h-3 text-white-30 shrink-0 mt-0.5" />
              <p className="text-[9px] text-white-30 leading-relaxed">
                Smart Video uses your selected images and optional persona frames. It does not use AI video generation.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white-10">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-white-40">
              Total: {totalDuration.toFixed(1)}s · {scenes.length} scene{scenes.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={onClose}
              className="text-[11px] text-white-40 hover:text-white-100 transition-colors"
            >
              Cancel
            </button>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || scenes.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-accent-green-110 text-sp-surface hover:bg-accent-green-110/90 transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Creating…
              </>
            ) : (
              'Create Smart Video'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
