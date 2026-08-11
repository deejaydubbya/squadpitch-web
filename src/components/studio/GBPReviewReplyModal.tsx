'use client';

import { useState } from 'react';
import { Loader2, Star, X, Send, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGBPReply, type GBPReview } from '@/hooks/useSquadpitch';

interface Props {
  clientId: string;
  review: GBPReview;
  onClose: () => void;
}

export function GBPReviewReplyModal({ clientId, review, onClose }: Props) {
  const gbpReply = useGBPReply(clientId);
  const [replyText, setReplyText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const generateDraft = async () => {
    setIsGenerating(true);
    setError(null);

    // Generate a professional reply draft using the review content
    const tone = review.rating >= 4 ? 'grateful and warm' : 'professional, empathetic, and solution-oriented';
    const draft = review.rating >= 4
      ? `Thank you so much for your kind words, ${review.reviewer}! We truly appreciate you taking the time to share your experience. It was a pleasure working with you, and we look forward to helping you again in the future.`
      : `Thank you for your feedback, ${review.reviewer}. We take all reviews seriously and want to ensure every client has a great experience. We'd love the opportunity to discuss this further and make things right. Please don't hesitate to reach out to us directly.`;

    // Simulate a brief delay so it feels like AI generation
    await new Promise((r) => setTimeout(r, 500));
    setReplyText(draft);
    setIsGenerating(false);
  };

  const handleSend = () => {
    setError(null);
    gbpReply.mutate(
      { reviewId: review.id, replyText },
      {
        onSuccess: () => setSent(true),
        onError: (err) => setError(err.message || 'Failed to send reply'),
      }
    );
  };

  return (
    <div className="mobile-dialog-backdrop fixed inset-0 z-50 flex justify-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Reply to review">
      <div className="mobile-dialog-surface flex w-full max-w-lg flex-col overflow-y-auto rounded-t-2xl border border-white-10 bg-sp-surface shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white-10">
          <h3 className="text-sm font-semibold text-white-100">Reply to Review</h3>
          <button onClick={onClose} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-white-30 transition-colors hover:bg-white-10 hover:text-white-60" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Review display */}
        <div className="px-5 py-4 border-b border-white-10 bg-white-5/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'w-3.5 h-3.5',
                    i < (review.rating || 0) ? 'text-yellow-400 fill-current' : 'text-white-20'
                  )}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-white-80">{review.reviewer}</span>
            {review.reviewDate && (
              <span className="text-[10px] text-white-30">
                {new Date(review.reviewDate).toLocaleDateString()}
              </span>
            )}
          </div>
          <p className="text-sm text-white-60 leading-relaxed">{review.comment || 'No comment'}</p>
        </div>

        {/* Reply area */}
        <div className="px-5 py-4 space-y-3">
          {sent ? (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              <Send className="w-4 h-4" />
              Reply sent successfully!
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <label htmlFor="gbp-review-reply" className="text-xs text-white-40">Your reply</label>
                <button
                  onClick={generateDraft}
                  disabled={isGenerating}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-accent-green-110 hover:bg-accent-green-110/10 transition-colors disabled:opacity-50"
                >
                  {isGenerating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  {isGenerating ? 'Drafting...' : 'AI Draft'}
                </button>
              </div>
              <textarea
                id="gbp-review-reply"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your reply..."
                rows={4}
                maxLength={4096}
                className="w-full px-3 py-2.5 rounded-xl bg-white-5 border border-white-10 text-white-100 text-sm resize-none focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
              />
              <p className="text-[10px] text-white-20 text-right">
                {replyText.length}/4096
              </p>
              {error && (
                <p className="text-xs text-red-400" role="alert">{error}</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-white-10 bg-sp-surface px-5 py-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-white-40 hover:text-white-60 transition-colors"
          >
            {sent ? 'Close' : 'Cancel'}
          </button>
          {!sent && (
            <button
              onClick={handleSend}
              disabled={!replyText.trim() || gbpReply.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors disabled:opacity-50"
            >
              {gbpReply.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
