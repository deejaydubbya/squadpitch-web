'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useChannelSettings, type Channel } from '@/hooks/useSquadpitch';
import { useCampaignIntelligence } from '@/hooks/useCampaignIntelligence';
import { CHANNEL_REGISTRY } from '@/lib/channelRegistry';
import {
  SEQUENCE_PRESETS,
  buildSlotsForChannels,
  type CampaignSlotConfig,
  type SequencePreset,
} from '@/lib/assistant/schedulePresets';
import type { AssistantAction, AssistantSessionState, ScheduleSlot } from '@/lib/assistant/types';

interface Props {
  session: AssistantSessionState;
  dispatch: React.Dispatch<AssistantAction>;
  clientId: string;
}

function toScheduleSlots(configs: CampaignSlotConfig[]): ScheduleSlot[] {
  return configs.map((c) => ({
    channel: c.channel as Channel,
    campaignDay: c.campaignDay,
    label: c.label,
    slotType: 'social_post',
  }));
}

export function ScheduleReviewStep({ session, dispatch, clientId }: Props) {
  const { data: channelSettings } = useChannelSettings(clientId);

  const connectedChannels: Channel[] = useMemo(() => {
    if (!channelSettings) return [];
    return channelSettings
      .filter((cs) => cs.isEnabled)
      .map((cs) => cs.channel);
  }, [channelSettings]);

  const { scheduleRec } = useCampaignIntelligence(session, connectedChannels, undefined);

  // Build the preset list, prepending a "Suggested" preset when intelligence has a recommendation
  const presets: SequencePreset[] = useMemo(() => {
    if (!scheduleRec) return SEQUENCE_PRESETS;
    const suggestedPreset: SequencePreset = {
      key: 'suggested',
      label: 'Suggested',
      description: scheduleRec.cadenceReason,
      slots: scheduleRec.slots,
    };
    return [suggestedPreset, ...SEQUENCE_PRESETS];
  }, [scheduleRec]);

  const [activePresetKey, setActivePresetKey] = useState(() => {
    if (scheduleRec) return 'suggested';
    if (session.memory.preferredPreset) return session.memory.preferredPreset;
    return 'balanced';
  });
  const [localSlots, setLocalSlots] = useState<CampaignSlotConfig[]>([]);

  // Default to 'suggested' when intelligence becomes available
  useEffect(() => {
    if (scheduleRec && activePresetKey === 'balanced') {
      setActivePresetKey('suggested');
    }
  }, [scheduleRec]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize on mount or when preset/channels change
  useEffect(() => {
    if (activePresetKey === 'suggested' && scheduleRec) {
      // Use the intelligently built slots directly
      setLocalSlots(scheduleRec.slots);
      dispatch({ type: 'SET_SLOTS', payload: toScheduleSlots(scheduleRec.slots) });
    } else {
      const preset = SEQUENCE_PRESETS.find((p) => p.key === activePresetKey) ?? SEQUENCE_PRESETS[0];
      const built = buildSlotsForChannels(preset, session.channels);
      setLocalSlots(built);
      dispatch({ type: 'SET_SLOTS', payload: toScheduleSlots(built) });
    }
  }, [activePresetKey, session.channels, scheduleRec, dispatch]);

  const handlePresetChange = (key: string) => {
    setActivePresetKey(key);
    if (key !== 'suggested') {
      dispatch({ type: 'SET_PREFERRED_PRESET', payload: key });
    }
  };

  const handleChannelChange = (slotIndex: number, channel: Channel) => {
    const updated = localSlots.map((s, i) =>
      i === slotIndex ? { ...s, channel } : s
    );
    setLocalSlots(updated);
    dispatch({ type: 'SET_SLOTS', payload: toScheduleSlots(updated) });
  };

  const handleDayChange = (slotIndex: number, day: number) => {
    const updated = localSlots.map((s, i) =>
      i === slotIndex ? { ...s, campaignDay: day } : s
    );
    setLocalSlots(updated);
    dispatch({ type: 'SET_SLOTS', payload: toScheduleSlots(updated) });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Preset selector */}
      <div>
        <p className="text-sm text-white-60 mb-3">Choose a schedule preset</p>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.key}
              onClick={() => handlePresetChange(preset.key)}
              className={cn(
                'px-3 py-2 rounded-lg border text-left transition-colors',
                activePresetKey === preset.key
                  ? 'border-accent-green-110 bg-accent-green-110/10'
                  : 'border-white-10 hover:border-white-20 hover:bg-white-5',
                preset.key === 'suggested' && 'ring-1 ring-accent-green-110/30'
              )}
            >
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium text-white-100">{preset.label}</p>
                {preset.key === 'suggested' && (
                  <span className="px-1 py-0.5 rounded bg-accent-green-110/20 text-accent-green-110 text-[9px] font-semibold uppercase">
                    AI
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white-40">{preset.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Editable slot table */}
      <div>
        <p className="text-sm text-white-60 mb-3">Campaign posts</p>
        <div className="rounded-lg border border-white-10 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[60px_1fr_140px] gap-2 px-3 py-2 bg-white-5 text-[11px] font-medium text-white-40 uppercase tracking-wider">
            <span>Day</span>
            <span>Label</span>
            <span>Channel</span>
          </div>

          {/* Rows */}
          {localSlots.map((slot, idx) => (
            <div
              key={slot.id}
              className="grid grid-cols-[60px_1fr_140px] gap-2 px-3 py-2.5 border-t border-white-5 items-center"
            >
              {/* Day input */}
              <input
                type="number"
                min={1}
                max={30}
                value={slot.campaignDay}
                onChange={(e) => handleDayChange(idx, Math.max(1, parseInt(e.target.value) || 1))}
                className="w-12 px-2 py-1 bg-white-5 border border-white-10 rounded text-xs text-white-100 text-center"
              />

              {/* Label (read-only) */}
              <span className="text-xs text-white-100 truncate">{slot.label}</span>

              {/* Channel select */}
              <select
                value={slot.channel}
                onChange={(e) => handleChannelChange(idx, e.target.value as Channel)}
                className="px-2 py-1 bg-white-5 border border-white-10 rounded text-xs text-white-100 appearance-none cursor-pointer"
              >
                {session.channels.map((ch) => (
                  <option key={ch} value={ch}>
                    {CHANNEL_REGISTRY[ch]?.label ?? ch}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
