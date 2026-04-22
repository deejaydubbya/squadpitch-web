'use client';

import { useEffect, useMemo, useState } from 'react';
import { GripVertical, Calendar, Sparkles } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { useChannelSettings, type Channel } from '@/hooks/useSquadpitch';
import { useCampaignIntelligence } from '@/hooks/useCampaignIntelligence';
import { CHANNEL_REGISTRY } from '@/lib/channelRegistry';
import {
  SEQUENCE_PRESETS,
  buildSlotsForChannels,
  buildSlotsFromStrategy,
  type CampaignSlotConfig,
  type SequencePreset,
} from '@/lib/assistant/schedulePresets';
import type { AssistantAction, AssistantSessionState, ScheduleSlot } from '@/lib/assistant/types';
import { CAMPAIGN_CADENCES, getStrategy } from '@/lib/assistant/campaignStrategy';
import type { CampaignCadenceKey } from '@/lib/assistant/campaignStrategy.types';
import { LEGACY_PRESET_TO_CADENCE, CADENCE_TO_LEGACY_PRESET } from '@/lib/assistant/campaignStrategy.types';

interface Props {
  session: AssistantSessionState;
  clientId: string;
  onSelection: (action: AssistantAction | AssistantAction[], confirmationText: string) => void;
}

function toScheduleSlots(configs: CampaignSlotConfig[]): ScheduleSlot[] {
  return configs.map((c) => ({
    channel: c.channel as Channel,
    campaignDay: c.campaignDay,
    label: c.label,
    slotType: 'social_post',
    angle: c.phase,
  }));
}

function formatDate(isoDate: string, offsetDays: number): string {
  // Parse as local date to avoid UTC timezone shift (e.g. "2026-04-21" → Apr 20 in CDT)
  const [y, m, day] = isoDate.split('-').map(Number);
  const d = new Date(y, m - 1, day + offsetDays - 1); // campaignDay 1 = start date
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

const CADENCE_OPTIONS: { key: CampaignCadenceKey; label: string; description: string }[] = [
  { key: 'fast', label: 'Fast', description: 'Front-loaded for maximum early impact' },
  { key: 'standard', label: 'Standard', description: 'Even pacing over about a week' },
  { key: 'extended', label: 'Extended', description: 'Slow build over 10+ days' },
];

export function ScheduleReviewCard({ session, clientId, onSelection }: Props) {
  const { data: channelSettings } = useChannelSettings(clientId);

  const connectedChannels: Channel[] = useMemo(() => {
    if (!channelSettings) return [];
    return channelSettings.filter((cs) => cs.isEnabled).map((cs) => cs.channel);
  }, [channelSettings]);

  const { scheduleRec } = useCampaignIntelligence(session, connectedChannels, undefined);

  // Resolve the recommended strategy + cadence from intelligence
  const hasStrategyRec = !!scheduleRec?.strategy;
  const recStrategy = scheduleRec?.strategy ? getStrategy(scheduleRec.strategy) : null;

  // Build cadence presets for the pill selector
  // "Suggested" appears first when intelligence provides a recommendation
  const cadencePresets = useMemo(() => {
    const base = CADENCE_OPTIONS.map((opt) => ({
      ...opt,
      isSuggested: false,
    }));

    if (scheduleRec && hasStrategyRec) {
      return [
        {
          key: 'suggested' as CampaignCadenceKey | 'suggested',
          label: 'Suggested',
          description: scheduleRec.cadenceReason,
          isSuggested: true,
        },
        ...base,
      ];
    }

    // Legacy fallback: show old presets as before
    if (scheduleRec && !hasStrategyRec) {
      return [
        {
          key: 'suggested' as CampaignCadenceKey | 'suggested',
          label: 'Suggested',
          description: scheduleRec.cadenceReason,
          isSuggested: true,
        },
        ...base,
      ];
    }

    return base;
  }, [scheduleRec, hasStrategyRec]);

  // Active cadence selection
  const [activeCadenceKey, setActiveCadenceKey] = useState<string>(() => {
    if (scheduleRec) return 'suggested';
    // Map legacy preferredPreset to new cadence key
    const legacyPreset = session.memory.preferredPreset;
    if (legacyPreset && LEGACY_PRESET_TO_CADENCE[legacyPreset]) {
      return LEGACY_PRESET_TO_CADENCE[legacyPreset];
    }
    if (legacyPreset) return legacyPreset;
    return 'standard';
  });

  const [localSlots, setLocalSlots] = useState<CampaignSlotConfig[]>([]);
  const [startDate, setStartDate] = useState<string>(session.campaignStartDate ?? todayISO());

  // Rebuild slots when cadence changes
  useEffect(() => {
    if (activeCadenceKey === 'suggested' && scheduleRec) {
      setLocalSlots(scheduleRec.slots);
    } else if (hasStrategyRec && scheduleRec?.phases) {
      // Use strategy phases with selected cadence
      const cadenceKey = activeCadenceKey as CampaignCadenceKey;
      if (CAMPAIGN_CADENCES[cadenceKey]) {
        const built = buildSlotsFromStrategy(scheduleRec.phases, cadenceKey, session.channels);
        setLocalSlots(built);
      } else {
        // Unknown key — fall back to legacy preset
        const preset = SEQUENCE_PRESETS.find((p) => p.key === activeCadenceKey)
          ?? SEQUENCE_PRESETS.find((p) => p.key === (CADENCE_TO_LEGACY_PRESET[activeCadenceKey as CampaignCadenceKey] ?? activeCadenceKey))
          ?? SEQUENCE_PRESETS[0];
        setLocalSlots(buildSlotsForChannels(preset, session.channels));
      }
    } else {
      // Legacy path — use old presets
      const legacyKey = CADENCE_TO_LEGACY_PRESET[activeCadenceKey as CampaignCadenceKey] ?? activeCadenceKey;
      const preset = SEQUENCE_PRESETS.find((p) => p.key === legacyKey) ?? SEQUENCE_PRESETS[0];
      const built = buildSlotsForChannels(preset, session.channels);
      setLocalSlots(built);
    }
  }, [activeCadenceKey, session.channels, scheduleRec, hasStrategyRec]);

  const handleDayChange = (idx: number, day: number) => {
    setLocalSlots((prev) => prev.map((s, i) => i === idx ? { ...s, campaignDay: day } : s));
  };

  const handleChannelChange = (idx: number, channel: Channel) => {
    setLocalSlots((prev) => prev.map((s, i) => i === idx ? { ...s, channel } : s));
  };

  // DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const slotIds = useMemo(() => localSlots.map((_, i) => `slot-${i}`), [localSlots]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = slotIds.indexOf(String(active.id));
    const newIdx = slotIds.indexOf(String(over.id));
    setLocalSlots((prev) => {
      const next = [...prev];
      const [moved] = next.splice(oldIdx, 1);
      next.splice(newIdx, 0, moved);
      // Renumber campaign days to maintain order
      return next.map((s, i) => ({ ...s, campaignDay: i + 1 }));
    });
  };

  const confirm = () => {
    const slots = toScheduleSlots(localSlots);
    const actions: AssistantAction[] = [
      { type: 'SET_SLOTS', payload: slots },
      { type: 'SET_CAMPAIGN_START_DATE', payload: startDate },
    ];

    // Store cadence preference (use legacy key for backward compat in memory)
    if (activeCadenceKey !== 'suggested') {
      const legacyKey = CADENCE_TO_LEGACY_PRESET[activeCadenceKey as CampaignCadenceKey] ?? activeCadenceKey;
      actions.push({ type: 'SET_PREFERRED_PRESET', payload: legacyKey });
    }

    onSelection(
      actions,
      `Schedule: ${slots.length} posts over ${Math.max(...slots.map((s) => s.campaignDay))} days, starting ${formatDate(startDate, 1)}`
    );
  };

  return (
    <div className="space-y-3">
      {/* Strategy explanation banner */}
      {recStrategy && scheduleRec?.strategyExplanation && (
        <div className="rounded-lg border border-accent-green-110/20 bg-accent-green-110/5 p-2.5 space-y-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-accent-green-110" />
            <span className="text-[11px] font-medium text-accent-green-110">
              {recStrategy.label} Strategy
            </span>
          </div>
          <p className="text-[10px] text-white-40 leading-relaxed">
            {scheduleRec.strategyExplanation}
          </p>
        </div>
      )}

      {/* Cadence selector */}
      <div className="space-y-1">
        <p className="text-[10px] font-medium text-white-40 uppercase tracking-wider">Cadence</p>
        <div className="flex flex-wrap gap-1.5">
          {cadencePresets.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setActiveCadenceKey(opt.key)}
              className={cn(
                'px-2.5 py-1.5 rounded-lg border text-left transition-colors',
                activeCadenceKey === opt.key
                  ? 'border-accent-green-110 bg-accent-green-110/10'
                  : 'border-white-10 hover:border-white-20',
                opt.isSuggested && 'ring-1 ring-accent-green-110/20'
              )}
            >
              <p className="text-[11px] font-medium text-white-100">{opt.label}</p>
              <p className="text-[10px] text-white-40">{opt.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Start date */}
      <div className="flex items-center gap-2">
        <Calendar className="w-3.5 h-3.5 text-white-40" />
        <label className="text-[10px] font-medium text-white-40 uppercase tracking-wider">Start date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          min={todayISO()}
          className="px-2 py-1 bg-white-5 border border-white-10 rounded text-[11px] text-white-100 focus:outline-none focus:border-accent-green-110"
        />
      </div>

      {/* Slot table — drag to reorder */}
      <div className="rounded-lg border border-white-10 overflow-hidden text-xs">
        <div className="grid grid-cols-[20px_50px_60px_1fr_110px] gap-1 px-2 py-1.5 bg-white-5 text-[10px] font-medium text-white-40 uppercase tracking-wider">
          <span />
          <span>Day</span>
          <span>Date</span>
          <span>Phase</span>
          <span>Channel</span>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={slotIds} strategy={verticalListSortingStrategy}>
            {localSlots.map((slot, idx) => (
              <SortableSlotRow
                key={slotIds[idx]}
                id={slotIds[idx]}
                slot={slot}
                idx={idx}
                startDate={startDate}
                channels={session.channels}
                onDayChange={(day) => handleDayChange(idx, day)}
                onChannelChange={(ch) => handleChannelChange(idx, ch)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <button
        onClick={confirm}
        disabled={localSlots.length === 0}
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-green-110 text-sp-bg hover:bg-accent-green-110/90 transition-colors"
      >
        Confirm Schedule
      </button>
    </div>
  );
}

// ── Sortable Slot Row ───────────────────────────────────────────────────

function SortableSlotRow({
  id,
  slot,
  idx,
  startDate,
  channels,
  onDayChange,
  onChannelChange,
}: {
  id: string;
  slot: CampaignSlotConfig;
  idx: number;
  startDate: string;
  channels: Channel[];
  onDayChange: (day: number) => void;
  onChannelChange: (ch: Channel) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="grid grid-cols-[20px_50px_60px_1fr_110px] gap-1 px-2 py-1.5 border-t border-white-5 items-center"
    >
      <div {...listeners} className="cursor-grab active:cursor-grabbing text-white-20 hover:text-white-40 transition-colors">
        <GripVertical className="w-3.5 h-3.5" />
      </div>
      <input
        type="number"
        min={1}
        max={30}
        value={slot.campaignDay}
        onChange={(e) => onDayChange(Math.max(1, parseInt(e.target.value) || 1))}
        className="w-10 px-1.5 py-0.5 bg-white-5 border border-white-10 rounded text-[11px] text-white-100 text-center"
      />
      <span className="text-[10px] text-white-40 tabular-nums">
        {formatDate(startDate, slot.campaignDay)}
      </span>
      <span className="text-[11px] text-white-100 truncate">{slot.label}</span>
      <select
        value={slot.channel}
        onChange={(e) => onChannelChange(e.target.value as Channel)}
        className="px-1.5 py-0.5 bg-white-5 border border-white-10 rounded text-[11px] text-white-100"
      >
        {channels.map((ch) => (
          <option key={ch} value={ch}>
            {CHANNEL_REGISTRY[ch]?.label ?? ch}
          </option>
        ))}
      </select>
    </div>
  );
}
