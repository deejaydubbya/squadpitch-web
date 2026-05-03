'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { X, Loader2, RefreshCw, Check, Sparkles, ChevronDown, RotateCcw, Trash2, Move } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/apiFetch';
import {
  type MediaAsset,
  type ComposePose,
  type SceneType,
  type LightingStyle,
  type ComposeOutfit,
  type ComposeVibe,
  type FramingPreset,
  usePersonaCutout,
  usePersonaBlend,
} from '@/hooks/useSquadpitch';

interface Props {
  asset: MediaAsset;
  clientId: string;
  onClose: () => void;
  onSuccess?: (newAsset: MediaAsset) => void;
}

type Step = 'configure' | 'generating' | 'position' | 'blending' | 'done';

const POSE_OPTIONS: { value: ComposePose; label: string }[] = [
  { value: 'standing', label: 'Standing' },
  { value: 'presenting', label: 'Presenting' },
  { value: 'pointing', label: 'Pointing' },
  { value: 'arms_crossed', label: 'Arms Crossed' },
  { value: 'casual', label: 'Casual' },
  { value: 'walking', label: 'Walking' },
];

const OUTFIT_OPTIONS: { value: ComposeOutfit; label: string }[] = [
  { value: 'smart_casual', label: 'Smart Casual' },
  { value: 'business_suit', label: 'Business Suit' },
  { value: 'polo_casual', label: 'Polo / Casual' },
  { value: 'branded_shirt', label: 'Branded Shirt' },
  { value: 'luxury_agent', label: 'Luxury Agent' },
  { value: 'outdoor_casual', label: 'Outdoor Casual' },
];

const VIBE_OPTIONS: { value: ComposeVibe; label: string }[] = [
  { value: 'friendly_smile', label: 'Friendly Smile' },
  { value: 'professional', label: 'Professional' },
  { value: 'confident', label: 'Confident' },
  { value: 'welcoming', label: 'Welcoming' },
  { value: 'energetic', label: 'Energetic' },
];

const SCENE_TYPE_OPTIONS: { value: SceneType; label: string }[] = [
  { value: 'auto', label: 'Auto Detect' },
  { value: 'interior', label: 'Interior' },
  { value: 'exterior', label: 'Exterior' },
];

const INTERIOR_LIGHTING: { value: LightingStyle; label: string; desc: string }[] = [
  { value: 'warm_cozy', label: 'Warm / Cozy', desc: 'Soft warm indoor lighting' },
  { value: 'bright_clean', label: 'Bright / Clean', desc: 'Crisp white modern lighting' },
  { value: 'natural_window', label: 'Window Light', desc: 'Soft daylight from windows' },
  { value: 'moody_cinematic', label: 'Moody', desc: 'Cinematic contrast' },
  { value: 'luxury_high_end', label: 'Luxury', desc: 'Premium editorial lighting' },
];

const EXTERIOR_LIGHTING: { value: LightingStyle; label: string; desc: string }[] = [
  { value: 'golden_hour', label: 'Golden Hour', desc: 'Warm sunset sunlight' },
  { value: 'midday_sun', label: 'Midday Sun', desc: 'Bright direct daylight' },
  { value: 'overcast', label: 'Overcast', desc: 'Soft cloudy lighting' },
  { value: 'sunset_dusk', label: 'Sunset / Dusk', desc: 'Dramatic warm sky tones' },
  { value: 'twilight_lights_on', label: 'Twilight', desc: 'Twilight with building lights' },
];

// Marching ants keyframe (injected once)
const MARCHING_ANTS_STYLE = `
@keyframes marchingAnts {
  0% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: -16; }
}
`;

// Checkerboard pattern for transparency debugging
const CHECKERBOARD_BG = 'repeating-conic-gradient(rgba(128,128,128,0.3) 0% 25%, transparent 0% 50%) 0 0 / 16px 16px';

// Shadow preview blur lookup by lighting style (CSS-only preview)
const SHADOW_PREVIEW_BLUR: Record<string, number> = {
  golden_hour: 12, midday_sun: 5, overcast: 16, sunset_dusk: 14,
  twilight_lights_on: 12, warm_cozy: 10, bright_clean: 6,
  natural_window: 12, moody_cinematic: 14, luxury_high_end: 10,
};

const FRAMING_PRESETS: { value: FramingPreset; label: string }[] = [
  { value: 'full_body', label: 'Full Body' },
  { value: 'waist_up', label: 'Waist Up' },
  { value: 'bust', label: 'Bust' },
];

// Compute rendered image area within an <img> element (handles object-fit: contain)
function getImageDisplayMetrics(img: HTMLImageElement) {
  const rect = img.getBoundingClientRect();
  const { naturalWidth, naturalHeight } = img;
  if (!naturalWidth || !naturalHeight) return null;
  const elementAspect = rect.width / rect.height;
  const imageAspect = naturalWidth / naturalHeight;
  let rW: number, rH: number, rL: number, rT: number;
  if (imageAspect > elementAspect) {
    rW = rect.width; rH = rect.width / imageAspect;
    rL = rect.left; rT = rect.top + (rect.height - rH) / 2;
  } else {
    rH = rect.height; rW = rect.height * imageAspect;
    rL = rect.left + (rect.width - rW) / 2; rT = rect.top;
  }
  return { renderedImageLeft: rL, renderedImageTop: rT, renderedImageWidth: rW, renderedImageHeight: rH, naturalWidth, naturalHeight };
}

function SelectControl<T extends string>({ label, value, options, onChange, disabled }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-medium text-white-40 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value as T)} disabled={disabled}
          className="w-full appearance-none bg-white-5 border border-white-10 rounded-lg px-3 py-2 text-xs text-white-100 pr-8 focus:outline-none focus:border-purple-500/50 disabled:opacity-50">
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#1a1a2e] text-white">{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white-40 pointer-events-none" />
      </div>
    </div>
  );
}

export function AddMeToPhotoModal({ asset, clientId, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('configure');

  // Persona config state
  const [pose, setPose] = useState<ComposePose>('standing');
  const [outfit, setOutfit] = useState<ComposeOutfit>('smart_casual');
  const [vibe, setVibe] = useState<ComposeVibe>('friendly_smile');
  const [sceneType, setSceneType] = useState<SceneType>('auto');
  const [lightingStyle, setLightingStyle] = useState<LightingStyle>('natural_window');
  const [framingPreset, setFramingPreset] = useState<FramingPreset>('full_body');

  // Cutout + blend state
  const [cutoutAssetId, setCutoutAssetId] = useState<string | null>(null);
  const [blendAssetId, setBlendAssetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Transform state for positioning (normalized 0-1)
  const [tx, setTx] = useState(0.5);
  const [ty, setTy] = useState(0.55);
  const [tScale, setTScale] = useState(0.4);
  const [tRotation, setTRotation] = useState(0);
  const [tOpacity, setTOpacity] = useState(1);

  // Advanced blend options
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [shadowIntensity, setShadowIntensity] = useState(0.5);
  const [warmthAdjust, setWarmthAdjust] = useState(0);
  const [blendStrength, setBlendStrength] = useState(0.8);

  // Shadow preview toggle (visible by default during positioning)
  const [showShadowPreview, setShowShadowPreview] = useState(true);

  // Before/After comparison in done step
  const [compareMode, setCompareMode] = useState<'before' | 'after'>('after');

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragOffset = useRef({ dx: 0, dy: 0 });
  const resizeStart = useRef({ scale: 0, dist: 0 });

  // Refs
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgRect, setImgRect] = useState({ width: 0, height: 0, left: 0, top: 0 });

  // Hooks
  const cutoutMutation = usePersonaCutout(clientId);
  const blendMutation = usePersonaBlend(clientId);

  // Poll cutout asset
  const { data: cutoutAsset } = useQuery({
    queryKey: ['asset', cutoutAssetId],
    queryFn: () => apiFetch<MediaAsset>(`assets/${cutoutAssetId}`),
    enabled: !!cutoutAssetId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'PENDING' || status === 'GENERATING' ? 2000 : false;
    },
  });

  // Poll blend asset
  const { data: blendAsset } = useQuery({
    queryKey: ['asset', blendAssetId],
    queryFn: () => apiFetch<MediaAsset>(`assets/${blendAssetId}`),
    enabled: !!blendAssetId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'PENDING' || status === 'GENERATING' ? 2000 : false;
    },
  });

  // Step transitions based on asset status
  const cutoutReady = cutoutAsset?.status === 'READY' && cutoutAsset.url;
  const cutoutFailed = cutoutAsset?.status === 'FAILED';
  const blendReady = blendAsset?.status === 'READY' && blendAsset.url;
  const blendFailed = blendAsset?.status === 'FAILED';

  useEffect(() => {
    if (step === 'generating' && cutoutReady) setStep('position');
    if (step === 'generating' && cutoutFailed) {
      setError(cutoutAsset?.errorMessage || 'Persona generation failed.');
      setStep('configure');
    }
    if (step === 'blending' && blendReady) setStep('done');
    if (step === 'blending' && blendFailed) {
      const msg = blendAsset?.errorMessage || 'Blending failed.';
      const isTransparencyError = msg.toLowerCase().includes('transparency') || msg.toLowerCase().includes('isolate');
      setError(isTransparencyError
        ? 'Persona background was not removed properly. Try regenerating the persona cutout.'
        : msg);
      setStep('position');
    }
  }, [step, cutoutReady, cutoutFailed, blendReady, blendFailed, cutoutAsset, blendAsset]);

  // Track image rect
  const updateRect = useCallback(() => {
    const img = imageRef.current;
    if (!img) return;
    const metrics = getImageDisplayMetrics(img);
    if (!metrics) return;
    const cRect = containerRef.current?.getBoundingClientRect();
    if (cRect) {
      setImgRect({
        width: metrics.renderedImageWidth, height: metrics.renderedImageHeight,
        left: metrics.renderedImageLeft - cRect.left, top: metrics.renderedImageTop - cRect.top,
      });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(updateRect, 100);
    window.addEventListener('resize', updateRect);
    return () => { clearTimeout(timer); window.removeEventListener('resize', updateRect); };
  }, [updateRect, asset.url, step]);

  // Convert mouse to normalized coords
  const mouseToNormalized = useCallback((clientX: number, clientY: number) => {
    const img = imageRef.current;
    if (!img) return null;
    const metrics = getImageDisplayMetrics(img);
    if (!metrics) return null;
    return {
      x: (clientX - metrics.renderedImageLeft) / metrics.renderedImageWidth,
      y: (clientY - metrics.renderedImageTop) / metrics.renderedImageHeight,
    };
  }, []);

  // Cutout dimensions for rendering
  const cutoutNaturalW = cutoutAsset?.width || 1;
  const cutoutNaturalH = cutoutAsset?.height || 1;
  const cutoutAspect = cutoutNaturalW / cutoutNaturalH;

  // Display dimensions of the persona cutout
  const personaH = tScale * imgRect.height;
  const personaW = personaH * cutoutAspect;
  const personaLeft = imgRect.left + tx * imgRect.width - personaW / 2;
  const personaTop = imgRect.top + ty * imgRect.height - personaH / 2;

  // ── Drag handlers ──────────────────────────────────────────────────
  const handlePersonaPointerDown = useCallback((e: React.PointerEvent) => {
    if (step !== 'position') return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const pos = mouseToNormalized(e.clientX, e.clientY);
    if (pos) {
      dragOffset.current = { dx: pos.x - tx, dy: pos.y - ty };
      setIsDragging(true);
    }
  }, [step, mouseToNormalized, tx, ty]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isDragging) {
      const pos = mouseToNormalized(e.clientX, e.clientY);
      if (!pos) return;
      setTx(pos.x - dragOffset.current.dx);
      setTy(pos.y - dragOffset.current.dy);
    } else if (isResizing) {
      const pos = mouseToNormalized(e.clientX, e.clientY);
      if (!pos) return;
      const dist = Math.sqrt((pos.x - tx) ** 2 + ((pos.y - ty) * (imgRect.width / imgRect.height)) ** 2);
      const newScale = resizeStart.current.scale * (dist / resizeStart.current.dist);
      setTScale(Math.max(0.08, Math.min(1.5, newScale)));
    }
  }, [isDragging, isResizing, mouseToNormalized, tx, ty, imgRect]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  // ── Resize handle ──────────────────────────────────────────────────
  const handleResizePointerDown = useCallback((e: React.PointerEvent) => {
    if (step !== 'position') return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const pos = mouseToNormalized(e.clientX, e.clientY);
    if (pos) {
      const dist = Math.sqrt((pos.x - tx) ** 2 + ((pos.y - ty) * (imgRect.width / imgRect.height)) ** 2);
      resizeStart.current = { scale: tScale, dist: Math.max(0.01, dist) };
      setIsResizing(true);
    }
  }, [step, mouseToNormalized, tx, ty, tScale, imgRect]);

  // Click on background to reposition
  const handleImageClick = useCallback((e: React.PointerEvent) => {
    if (step !== 'position' || isDragging || isResizing) return;
    const pos = mouseToNormalized(e.clientX, e.clientY);
    if (pos) {
      setTx(pos.x);
      setTy(pos.y);
    }
  }, [step, isDragging, isResizing, mouseToNormalized]);

  // ── Actions ────────────────────────────────────────────────────────
  const handleGenerateCutout = () => {
    setError(null);
    setCutoutAssetId(null);
    cutoutMutation.mutate(
      { clientId, pose, outfit, vibe, sceneType, lightingStyle, framingPreset, folderId: asset.folderId ?? undefined },
      {
        onSuccess: (data) => { setCutoutAssetId(data.asset.id); setStep('generating'); },
        onError: (err: Error) => { setError(err.message || 'Failed to start generation.'); },
      },
    );
  };

  const handleBlend = () => {
    if (!cutoutAsset?.url) return;
    setError(null);
    setBlendAssetId(null);
    blendMutation.mutate(
      {
        clientId,
        backgroundImageUrl: asset.url!,
        backgroundAssetId: asset.id,
        cutoutImageUrl: cutoutAsset.url,
        cutoutAssetId: cutoutAsset.id,
        transform: { x: tx, y: ty, scale: tScale, rotation: tRotation, opacity: tOpacity },
        sceneType, lightingStyle,
        advanced: { shadowIntensity, warmthAdjust, blendStrength },
        folderId: asset.folderId ?? undefined,
      },
      {
        onSuccess: (data) => { setBlendAssetId(data.asset.id); setStep('blending'); },
        onError: (err: Error) => { setError(err.message || 'Failed to start blending.'); },
      },
    );
  };

  const handleUseImage = () => {
    if (blendAsset) onSuccess?.(blendAsset);
    onClose();
  };

  const handleTryAgain = () => {
    setBlendAssetId(null);
    setError(null);
    setStep('position');
  };

  const handleRegenerate = () => {
    setCutoutAssetId(null);
    setBlendAssetId(null);
    setError(null);
    setStep('configure');
  };

  const handleResetPosition = () => {
    setTx(0.5);
    setTy(0.55);
    setTScale(0.4);
    setTRotation(0);
    setTOpacity(1);
  };

  const autoFitToScene = useCallback(() => {
    const interiorLighting = ['warm_cozy', 'bright_clean', 'natural_window', 'moody_cinematic', 'luxury_high_end'];
    const isInterior = sceneType === 'interior' || (sceneType === 'auto' && interiorLighting.includes(lightingStyle));
    setTx(0.5);
    setTy(isInterior ? 0.65 : 0.70);
    setTScale(isInterior ? 0.38 : 0.35);
    setTRotation(0);
  }, [sceneType, lightingStyle]);

  const isLoading = step === 'generating' || step === 'blending' || cutoutMutation.isPending || blendMutation.isPending;
  const showPersonaOnCanvas = step === 'position' && cutoutReady;

  // Step labels
  const stepLabel = step === 'configure' ? 'Step 1: Configure Persona'
    : step === 'generating' ? 'Generating Persona...'
    : step === 'position' ? 'Step 2: Position Persona'
    : step === 'blending' ? 'Blending Into Scene...'
    : 'Done';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-5xl max-h-[90vh] mx-4 bg-sp-surface rounded-2xl overflow-hidden flex flex-col md:flex-row" onClick={(e) => e.stopPropagation()}>
        {/* Close */}
        <button onClick={onClose} className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white-10 text-white-60 hover:bg-white-20 hover:text-white-100 transition-colors">
          <X className="w-5 h-5" />
        </button>

        {/* Left: Image canvas */}
        <div
          ref={containerRef}
          className="flex-1 min-h-[300px] md:min-h-0 bg-black flex items-center justify-center p-4 relative select-none overflow-hidden"
          onPointerMove={(isDragging || isResizing) ? handlePointerMove : undefined}
          onPointerUp={(isDragging || isResizing) ? handlePointerUp : undefined}
        >
          {step === 'done' && blendReady ? (
            <div className="flex flex-col items-center gap-2">
              {/* Before / After toggle */}
              <div className="flex gap-1">
                <button
                  onClick={() => setCompareMode('before')}
                  className={cn('px-3 py-1 rounded-full text-[10px] font-medium transition-colors',
                    compareMode === 'before' ? 'bg-white-20 text-white-100' : 'bg-white-5 text-white-40 hover:bg-white-10')}
                >Before</button>
                <button
                  onClick={() => setCompareMode('after')}
                  className={cn('px-3 py-1 rounded-full text-[10px] font-medium transition-colors',
                    compareMode === 'after' ? 'bg-purple-500/20 text-purple-300' : 'bg-white-5 text-white-40 hover:bg-white-10')}
                >After</button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={compareMode === 'before' ? asset.url! : blendAsset!.url!}
                alt={compareMode === 'before' ? 'Original photo' : 'Final composite'}
                className="max-w-full max-h-[65vh] rounded-lg object-contain select-none"
                draggable={false}
                onPointerDown={() => setCompareMode('before')}
                onPointerUp={() => setCompareMode('after')}
                onPointerLeave={() => setCompareMode('after')}
              />
              <span className="text-[9px] text-white-30">Hold image to compare with original</span>
            </div>
          ) : asset.url ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imageRef}
                src={asset.url}
                alt={asset.altText || asset.filename || 'Original photo'}
                className={cn('max-w-full max-h-[70vh] rounded-lg object-contain', isLoading && 'opacity-50')}
                draggable={false}
                onLoad={updateRect}
              />

              {/* Persona cutout layer */}
              {showPersonaOnCanvas && cutoutAsset?.url && imgRect.width > 0 && (
                <>
                  {/* Click area for repositioning */}
                  <div className="absolute inset-0 cursor-crosshair" style={{ zIndex: 1 }} onPointerDown={handleImageClick} />

                  {/* Persona image */}
                  <div
                    className="absolute cursor-move"
                    style={{
                      left: `${personaLeft - imgRect.left}px`,
                      top: `${personaTop - imgRect.top}px`,
                      width: `${personaW}px`,
                      height: `${personaH}px`,
                      zIndex: 3,
                      opacity: tOpacity,
                      transform: tRotation !== 0 ? `rotate(${tRotation}deg)` : undefined,
                      pointerEvents: 'auto',
                    }}
                    onPointerDown={handlePersonaPointerDown}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cutoutAsset.url}
                      alt="Persona cutout"
                      className="w-full h-full object-contain pointer-events-none"
                      draggable={false}
                      style={{ background: showAdvanced ? CHECKERBOARD_BG : undefined }}
                    />

                    {/* Selection outline — dual layer: black outer + marching ants (editor-only) */}
                    <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" style={{ zIndex: 3, filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.7)) drop-shadow(0 0 3px rgba(255,255,255,0.5))' }}>
                      <style>{MARCHING_ANTS_STYLE}</style>
                      {/* Black outer stroke */}
                      <rect x="0" y="0" width="100%" height="100%" rx="2"
                        fill="none" stroke="rgba(0,0,0,0.8)" strokeWidth={isDragging ? 3 : 2} />
                      {/* White marching ants inner stroke */}
                      <rect x="0" y="0" width="100%" height="100%" rx="2"
                        fill="none" stroke="white" strokeWidth={isDragging ? 2.5 : 1.5}
                        strokeDasharray="6 4" style={{ animation: 'marchingAnts 0.6s linear infinite' }} />
                    </svg>

                    {/* Corner resize handles */}
                    {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
                      <div
                        key={corner}
                        className="absolute w-5 h-5 md:w-3 md:h-3 bg-white rounded-full"
                        style={{
                          ...(corner.includes('t') ? { top: -8 } : { bottom: -8 }),
                          ...(corner.includes('l') ? { left: -8 } : { right: -8 }),
                          zIndex: 4,
                          cursor: corner === 'tl' || corner === 'br' ? 'nwse-resize' : 'nesw-resize',
                          border: '2px solid rgba(0,0,0,0.7)',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
                        }}
                        onPointerDown={handleResizePointerDown}
                      />
                    ))}
                  </div>

                  {/* Live shadow preview ellipse */}
                  {showShadowPreview && shadowIntensity > 0 && (
                    <div
                      className="pointer-events-none"
                      style={{
                        position: 'absolute',
                        left: `${personaLeft - imgRect.left + personaW * 0.1}px`,
                        top: `${personaTop - imgRect.top + personaH - 4}px`,
                        width: `${personaW * 0.8}px`,
                        height: `${personaH * 0.06}px`,
                        background: 'rgba(0,0,0,0.25)',
                        borderRadius: '50%',
                        filter: `blur(${SHADOW_PREVIEW_BLUR[lightingStyle] || 10}px)`,
                        opacity: shadowIntensity,
                        zIndex: 2,
                        transform: tRotation !== 0 ? `rotate(${tRotation}deg)` : undefined,
                      }}
                    />
                  )}

                  {/* Helper text */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full pointer-events-none" style={{ zIndex: 5 }}>
                    <span className="text-[10px] text-white-60">Drag to move, corners to resize</span>
                  </div>
                </>
              )}

              {/* Loading overlay */}
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                  <span className="text-xs text-white-60 bg-black/60 px-3 py-1 rounded-full">
                    {step === 'generating' && (cutoutAsset?.progressStage || 'Generating persona cutout\u2026')}
                    {step === 'blending' && (blendAsset?.progressStage || 'Blending into scene\u2026')}
                    {!cutoutAsset?.progressStage && !blendAsset?.progressStage && step !== 'generating' && step !== 'blending' && 'Processing\u2026'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-white-40 text-sm">No preview available</div>
          )}
        </div>

        {/* Right: Controls */}
        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-white-10 p-5 overflow-y-auto flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-white-100">{stepLabel}</h3>

          {/* ── Step 1: Configure ──────────────────────────────── */}
          {(step === 'configure' || step === 'generating') && (
            <>
              <p className="text-[10px] text-white-40">Generate a real persona cutout, then drag and resize it directly on your image.</p>

              {/* Framing */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-white-40 uppercase tracking-wider">Framing</label>
                <div className="grid grid-cols-3 gap-1">
                  {FRAMING_PRESETS.map((opt) => (
                    <button key={opt.value} onClick={() => setFramingPreset(opt.value)} disabled={isLoading}
                      className={cn('px-1.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors border',
                        framingPreset === opt.value ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-white-5 border-white-10 text-white-50 hover:bg-white-10', 'disabled:opacity-50')}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <SelectControl label="Pose" value={pose} options={POSE_OPTIONS} onChange={setPose} disabled={isLoading} />
              <SelectControl label="Outfit" value={outfit} options={OUTFIT_OPTIONS} onChange={setOutfit} disabled={isLoading} />
              <SelectControl label="Expression" value={vibe} options={VIBE_OPTIONS} onChange={setVibe} disabled={isLoading} />

              {/* Scene Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-white-40 uppercase tracking-wider">Scene Type</label>
                <div className="grid grid-cols-3 gap-1">
                  {SCENE_TYPE_OPTIONS.map((opt) => (
                    <button key={opt.value}
                      onClick={() => {
                        setSceneType(opt.value);
                        if (opt.value === 'exterior') setLightingStyle('golden_hour');
                        else if (opt.value === 'interior') setLightingStyle('natural_window');
                      }}
                      disabled={isLoading}
                      className={cn('px-1.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors border',
                        sceneType === opt.value ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-white-5 border-white-10 text-white-50 hover:bg-white-10', 'disabled:opacity-50')}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lighting */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-white-40 uppercase tracking-wider">Lighting</label>
                <div className="grid grid-cols-2 gap-1">
                  {(sceneType === 'exterior' ? EXTERIOR_LIGHTING : INTERIOR_LIGHTING).map((opt) => (
                    <button key={opt.value} onClick={() => setLightingStyle(opt.value)} disabled={isLoading}
                      className={cn('px-2 py-1.5 rounded-lg text-left transition-colors border',
                        lightingStyle === opt.value ? 'bg-purple-500/20 border-purple-500/40' : 'bg-white-5 border-white-10 hover:bg-white-10', 'disabled:opacity-50')}>
                      <div className="text-[10px] font-medium" style={{ color: lightingStyle === opt.value ? 'rgb(216 180 254)' : 'rgb(255 255 255 / 0.5)' }}>{opt.label}</div>
                      <div className="text-[8px] text-white-30 leading-tight">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Step 2: Position ───────────────────────────────── */}
          {step === 'position' && (
            <>
              <p className="text-[10px] text-white-40">Move, resize, or drag the persona partly off the image for cropped shots.</p>

              {/* Scale slider */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-white-40 uppercase tracking-wider">Size</label>
                <input type="range" min={0.1} max={1.2} step={0.01} value={tScale}
                  onChange={(e) => setTScale(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 h-1.5" />
                <div className="flex justify-between text-[9px] text-white-30">
                  <span>Smaller</span><span>{Math.round(tScale * 100)}%</span><span>Larger</span>
                </div>
              </div>

              {/* Rotation slider */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-white-40 uppercase tracking-wider">Rotation</label>
                <input type="range" min={-30} max={30} step={1} value={tRotation}
                  onChange={(e) => setTRotation(parseInt(e.target.value))}
                  className="w-full accent-purple-500 h-1.5" />
                <div className="flex justify-between text-[9px] text-white-30">
                  <span>-30°</span><span>{tRotation}°</span><span>30°</span>
                </div>
              </div>

              {/* Opacity slider */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-white-40 uppercase tracking-wider">Opacity</label>
                <input type="range" min={0.3} max={1} step={0.05} value={tOpacity}
                  onChange={(e) => setTOpacity(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 h-1.5" />
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2">
                <button onClick={autoFitToScene} className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-colors" title="Adjusts persona size and position based on scene type">
                  <Sparkles className="w-3 h-3" /> Auto fit
                </button>
                <button onClick={handleResetPosition} className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-colors">
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
                <button onClick={handleRegenerate} className="flex items-center gap-1 text-[10px] text-white-40 hover:text-white-60 transition-colors">
                  <RefreshCw className="w-3 h-3" /> Regenerate
                </button>
              </div>

              {/* Advanced blend options */}
              <div className="border-t border-white-10 pt-2">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1 text-[10px] font-medium text-white-40 hover:text-white-60 transition-colors"
                >
                  <ChevronDown className={cn('w-3 h-3 transition-transform', showAdvanced && 'rotate-180')} />
                  Advanced
                </button>

                {showAdvanced && (
                  <div className="mt-2 space-y-2.5">
                    {/* Shadow preview toggle */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={showShadowPreview} onChange={(e) => setShowShadowPreview(e.target.checked)}
                        className="w-3 h-3 accent-purple-500 rounded" />
                      <span className="text-[10px] text-white-40">Show shadow preview</span>
                    </label>

                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-white-40 uppercase tracking-wider">Shadow Intensity</label>
                      <input type="range" min={0} max={100} step={1} value={Math.round(shadowIntensity * 100)}
                        onChange={(e) => setShadowIntensity(parseInt(e.target.value) / 100)}
                        className="w-full accent-purple-500 h-1.5" />
                      <div className="flex justify-between text-[9px] text-white-30">
                        <span>None</span><span>{Math.round(shadowIntensity * 100)}%</span><span>Max</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-white-40 uppercase tracking-wider">Warmth</label>
                      <input type="range" min={-50} max={50} step={1} value={Math.round(warmthAdjust * 50)}
                        onChange={(e) => setWarmthAdjust(parseInt(e.target.value) / 50)}
                        className="w-full accent-purple-500 h-1.5" />
                      <div className="flex justify-between text-[9px] text-white-30">
                        <span>Cool</span><span>{Math.round(warmthAdjust * 50) > 0 ? '+' : ''}{Math.round(warmthAdjust * 50)}</span><span>Warm</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-white-40 uppercase tracking-wider">Blend Strength</label>
                      <input type="range" min={0} max={100} step={1} value={Math.round(blendStrength * 100)}
                        onChange={(e) => setBlendStrength(parseInt(e.target.value) / 100)}
                        className="w-full accent-purple-500 h-1.5" />
                      <div className="flex justify-between text-[9px] text-white-30">
                        <span>None</span><span>{Math.round(blendStrength * 100)}%</span><span>Full</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Step: Done ─────────────────────────────────────── */}
          {step === 'done' && (
            <p className="text-[10px] text-accent-green-110">Persona has been blended into the scene.</p>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-accent-red/10 border border-accent-red/20 p-2.5 text-xs text-accent-red">{error}</div>
          )}

          {/* Action buttons */}
          <div className="mt-auto space-y-2 pt-3 border-t border-white-10">
            {step === 'configure' && (
              <button onClick={handleGenerateCutout} disabled={isLoading || !asset.url}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-medium hover:bg-purple-500/30 transition-colors disabled:opacity-50">
                {cutoutMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Starting&hellip;</> : <><Sparkles className="w-3.5 h-3.5" /> Generate Persona</>}
              </button>
            )}

            {step === 'generating' && (
              <button disabled className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white-10 text-white-40 text-xs font-medium opacity-50">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating persona&hellip;
              </button>
            )}

            {step === 'position' && (
              <button onClick={handleBlend} disabled={blendMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-medium hover:bg-purple-500/30 transition-colors disabled:opacity-50">
                {blendMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Starting&hellip;</> : <><Sparkles className="w-3.5 h-3.5" /> Blend Into Scene</>}
              </button>
            )}

            {step === 'blending' && (
              <button disabled className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white-10 text-white-40 text-xs font-medium opacity-50">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Blending&hellip;
              </button>
            )}

            {step === 'done' && (
              <>
                <button onClick={handleUseImage}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-accent-green-110/20 text-accent-green-110 text-xs font-medium hover:bg-accent-green-110/30 transition-colors">
                  <Check className="w-3.5 h-3.5" /> Use this image
                </button>
                <button onClick={handleTryAgain}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white-10 text-white-60 text-xs font-medium hover:bg-white-20 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" /> Try again
                </button>
              </>
            )}

            <button onClick={onClose} className="w-full flex items-center justify-center px-3 py-2 rounded-lg text-white-40 text-xs hover:text-white-60 transition-colors">
              Cancel
            </button>
          </div>

          <p className="text-[10px] text-white-30 text-center">
            {step === 'configure' || step === 'generating' ? 'Generate a real persona, then position it on your photo' : 'Position your persona and blend into the scene'}
          </p>
        </div>
      </div>
    </div>
  );
}
