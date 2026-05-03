'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePersonaFeedback, type PersonaFeedbackReason } from '@/hooks/useSquadpitch';

const FEEDBACK_OPTIONS: { value: PersonaFeedbackReason; label: string }[] = [
  { value: 'doesnt_look_like_me', label: "Doesn't look like me" },
  { value: 'wrong_style', label: 'Wrong style' },
  { value: 'too_artificial', label: 'Too artificial' },
  { value: 'not_relevant', label: 'Not relevant' },
  { value: 'other', label: 'Other' },
];

interface PersonaFeedbackPopoverProps {
  assetId: string;
  onClose: () => void;
}

export function PersonaFeedbackPopover({ assetId, onClose }: PersonaFeedbackPopoverProps) {
  const [reason, setReason] = useState<PersonaFeedbackReason | null>(null);
  const [detail, setDetail] = useState('');
  const feedback = usePersonaFeedback(assetId);

  const handleSubmit = () => {
    if (!reason) return;
    feedback.mutate(
      { reason, detail: detail.trim() || undefined },
      { onSettled: onClose }
    );
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-64 rounded-xl bg-sp-card border border-white-10 p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-white-80">Why didn&apos;t this work?</p>
          <button onClick={onClose} className="text-white-30 hover:text-white-60">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-1">
          {FEEDBACK_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setReason(opt.value)}
              className={cn(
                'w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] transition-colors',
                reason === opt.value
                  ? 'bg-purple-500/20 text-purple-300'
                  : 'text-white-50 hover:bg-white-5 hover:text-white-70'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {reason === 'other' && (
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Tell us more (optional)..."
            maxLength={500}
            rows={2}
            className="w-full rounded-lg bg-white-5 border border-white-10 px-2.5 py-1.5 text-[11px] text-white-70 placeholder:text-white-30 focus:outline-none focus:border-purple-500/50 resize-none"
          />
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSubmit}
            disabled={!reason || feedback.isPending}
            className="flex-1 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 text-[11px] font-medium hover:bg-purple-500/30 disabled:opacity-40 transition-colors"
          >
            {feedback.isPending ? 'Sending...' : 'Submit'}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-[11px] text-white-40 hover:text-white-60 transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
