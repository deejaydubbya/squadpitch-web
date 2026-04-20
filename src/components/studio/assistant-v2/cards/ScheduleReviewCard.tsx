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
  clientId: string;
  onSelection: (action: AssistantAction, confirmationText: string) => void;
}

function toScheduleSlots(configs: CampaignSlotConfig[]): ScheduleSlot[] {
  return configs.map((c) => ({
    channel: c.channel as Channel,
    campaignDay: c.campaignDay,
    label: c.label,
    slotType: 'social_post',
  }));
}

export function ScheduleReviewCard({ session, clientId, onSelection }: Props) {
  const { data: channelSettings } = useChannelSettings(clientId);

  const connectedChannels: Channel[] = useMemo(() => {
    if (!channelSettings) return [];
    return channelSettings.filter((cs) => cs.isEnabled).map((cs) => cs.channel);
  }, [channelSettings]);

  const { scheduleRec } = useCampaignIntelligence(session, connectedChannels, undefined);

  const presets: SequencePreset[] = useMemo(() => {
    if (!scheduleRec) return SEQUENCE_PRESETS;
    const suggested: SequencePreset = {
      key: 'suggested',
      label: 'Suggested',
      description: scheduleRec.cadenceReason,
      slots: scheduleRec.slots,
    };
    return [suggested, ...SEQUENCE_PRESETS];
  }, [scheduleRec]);

  const [activePresetKey, setActivePresetKey] = useState(() => {
    if (scheduleRec) return 'suggested';
    if (session.memory.preferredPreset) return session.memory.preferredPreset;
    return 'balanced';
  });

  const [localSlots, setLocalSlots] = useState<CampaignSlotConfig[]>([]);

  useEffect(() => {
    if (activePresetKey === 'suggested' && scheduleRec) {
      setLocalSlots(scheduleRec.slots);
    } else {
      const preset = SEQUENCE_PRESETS.find((p) => p.key === activePresetKey) ?? SEQUENCE_PRESETS[0];
      const built = buildSlotsForChannels(preset, session.channels);
      setLocalSlots(built);
    }
  }, [activePresetKey, session.channels, scheduleRec]);

  const handleDayChange = (idx: number, day: number) => {
    setLocalSlots((prev) => prev.map((s, i) => i === idx ? { ...s, campaignDay: day } : s));
  };

  const handleChannelChange = (idx: number, channel: Channel) => {
    setLocalSlots((prev) => prev.map((s, i) => i === idx ? { ...s, channel } : s));
  };

  const confirm = () => {
    const slots = toScheduleSlots(localSlots);
    onSelection(
      { type: 'SET_SLOTS', payload: slots },
      `Schedule: ${slots.length} posts over ${Math.max(...slots.map((s) => s.campaignDay))} days`
    );
  };

  return (
    <div className="space-y-3">
      {/* Preset selector */}
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset.key}
            onClick={() => setActivePresetKey(preset.key)}
            className={cn(
              'px-2.5 py-1.5 rounded-lg border text-left transition-colors',
              activePresetKey === preset.key
                ? 'border-accent-green-110 bg-accent-green-110/10'
                : 'border-white-10 hover:border-white-20',
              preset.key === 'suggested' && 'ring-1 ring-accent-green-110/20'
            )}
          >
            <p className="text-[11px] font-medium text-white-100">{preset.label}</p>
            <p className="text-[10px] text-white-40">{preset.description}</p>
          </button>
        ))}
      </div>

      {/* Slot table */}
      <div className="rounded-lg border border-white-10 overflow-hidden text-xs">
        <div className="grid grid-cols-[50px_1fr_110px] gap-1 px-2 py-1.5 bg-white-5 text-[10px] font-medium text-white-40 uppercase tracking-wider">
          <span>Day</span>
          <span>Label</span>
          <span>Channel</span>
        </div>
        {localSlots.map((slot, idx) => (
          <div key={idx} className="grid grid-cols-[50px_1fr_110px] gap-1 px-2 py-1.5 border-t border-white-5 items-center">
            <input
              type="number"
              min={1}
              max={30}
              value={slot.campaignDay}
              onChange={(e) => handleDayChange(idx, Math.max(1, parseInt(e.target.value) || 1))}
              className="w-10 px-1.5 py-0.5 bg-white-5 border border-white-10 rounded text-[11px] text-white-100 text-center"
            />
            <span className="text-[11px] text-white-100 truncate">{slot.label}</span>
            <select
              value={slot.channel}
              onChange={(e) => handleChannelChange(idx, e.target.value as Channel)}
              className="px-1.5 py-0.5 bg-white-5 border border-white-10 rounded text-[11px] text-white-100"
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
