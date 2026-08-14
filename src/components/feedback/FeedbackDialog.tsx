'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { apiFetch } from '@/lib/apiFetch';
import { track } from '@/lib/analytics';

const TYPES = [
  ['bug', 'Bug'], ['feature_request', 'Feature request'], ['ux_issue', 'Confusing / hard to use'], ['general', 'General feedback'],
] as const;

export function FeedbackDialog({ clientId, triggerClassName }: { clientId?: string; triggerClassName?: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const key = useRef(crypto.randomUUID());
  const messageRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const prior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => messageRef.current?.focus(), 0);
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', escape);
    return () => { document.body.style.overflow = prior; document.removeEventListener('keydown', escape); };
  }, [open]);

  const show = () => { setOpen(true); setState('idle'); setError(''); track('feedback_opened', { route: window.location.pathname }); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!type || !message.trim() || state === 'sending') return;
    setState('sending'); setError('');
    try {
      const width = window.innerWidth;
      await apiFetch('v1/feedback', { method: 'POST', body: JSON.stringify({ type, message: message.trim(), clientId: clientId || null, route: window.location.pathname, releaseVersion: process.env.NEXT_PUBLIC_APP_VERSION || null, deviceClass: width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop', viewport: { width, height: window.innerHeight }, idempotencyKey: key.current }) });
      setState('success'); track('feedback_submitted', { type, route: window.location.pathname });
      setMessage(''); setType(''); key.current = crypto.randomUUID();
    } catch (cause) {
      setState('error'); setError(cause instanceof Error ? cause.message : 'Feedback could not be sent. Please try again.');
      track('feedback_submission_failed', { type, route: window.location.pathname });
    }
  };

  return <>
    <button type="button" onClick={show} className={triggerClassName || 'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white-60 transition-colors hover:bg-white-5 hover:text-white-100'}>
      <MessageSquare className="h-5 w-5 shrink-0" aria-hidden="true" /><span>Send feedback</span>
    </button>
    {open && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
      <button type="button" className="absolute inset-0" aria-label="Close feedback" onClick={() => setOpen(false)} />
      <div className="relative max-h-[calc(100dvh-1rem)] w-full overflow-y-auto rounded-t-2xl border border-white-10 bg-sp-bg p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-w-lg sm:rounded-2xl sm:p-6">
        <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-lg text-white-50 hover:bg-white-10" aria-label="Close"><X className="h-5 w-5" /></button>
        <h2 id="feedback-title" className="pr-12 text-xl font-semibold text-white">Send feedback</h2>
        <p className="mt-1 text-sm text-white-50">Help us improve Squadpitch.</p>
        {state === 'success' ? <div className="py-10 text-center"><p className="font-medium text-accent-green-110">Thanks — your feedback was sent.</p><button type="button" onClick={() => setOpen(false)} className="mt-6 min-h-11 rounded-lg bg-white-10 px-5 text-sm text-white">Close</button></div> :
        <form onSubmit={submit} className="mt-5 space-y-5">
          <fieldset><legend className="mb-2 text-sm font-medium text-white">Feedback type</legend><div className="grid gap-2 sm:grid-cols-2">{TYPES.map(([value, label]) => <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-white-10 px-3 text-sm text-white-70 has-[:checked]:border-accent-green-110/60 has-[:checked]:bg-accent-green-110/10"><input required type="radio" name="feedback-type" value={value} checked={type === value} onChange={() => setType(value)} />{label}</label>)}</div></fieldset>
          <label className="block text-sm font-medium text-white">Tell us what happened or what you&apos;d like to see.<textarea ref={messageRef} required maxLength={5000} value={message} onChange={(e) => setMessage(e.target.value)} rows={6} className="mt-2 w-full resize-y rounded-xl border border-white-10 bg-sp-surface p-3 text-base text-white outline-none focus:border-accent-green-110/60" /></label>
          {state === 'error' && <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error} Your message is still here; retry when ready.</div>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-lg px-4 text-sm text-white-60 hover:bg-white-5">Cancel</button><button type="submit" disabled={state === 'sending' || !type || !message.trim()} className="min-h-11 rounded-lg bg-accent-green-110 px-5 text-sm font-semibold text-sp-bg disabled:opacity-50">{state === 'sending' ? 'Sending…' : state === 'error' ? 'Retry' : 'Send feedback'}</button></div>
        </form>}
      </div>
    </div>}
  </>;
}
