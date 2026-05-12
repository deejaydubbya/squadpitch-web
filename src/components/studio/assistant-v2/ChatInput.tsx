'use client';

import { useState, useRef, useCallback } from 'react';
import { SendHorizonal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onSend: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({ onSend, placeholder = 'Type a message...', disabled }: Props) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.focus();
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    // No border/bg here — the AssistantCommandBar wrapper now owns
    // the bottom-bar chrome (border-top + bg + helper rows). If
    // someone wants ChatInput standalone they can wrap it.
    <div className="flex items-end gap-2 px-3 pb-3 pt-1">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          const el = e.target;
          el.style.height = 'auto';
          el.style.height = Math.min(el.scrollHeight, 128) + 'px';
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className={cn(
          'flex-1 resize-none rounded-lg px-3 py-2 text-sm bg-white-5 border border-white-10',
          'text-white-100 placeholder:text-white-30',
          'focus:outline-none focus:border-accent-green-110',
          'max-h-32',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        style={{ minHeight: '38px' }}
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className={cn(
          'flex items-center justify-center w-9 h-9 rounded-lg transition-colors',
          value.trim() && !disabled
            ? 'bg-accent-green-110 text-sp-bg hover:bg-accent-green-110/90'
            : 'bg-white-10 text-white-30 cursor-not-allowed'
        )}
        aria-label="Send message"
      >
        <SendHorizonal className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
