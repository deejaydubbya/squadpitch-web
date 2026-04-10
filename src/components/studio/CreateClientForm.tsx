'use client';

import { useState } from 'react';
import { Plus, Loader2, X } from 'lucide-react';
import { useCreateClient } from '@/hooks/useSquadpitch';
import { StatusBanner } from '@/components/common/StatusBanner';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

interface Props {
  onCreated?: (id: string) => void;
}

export function CreateClientForm({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  const create = useCreateClient();

  const reset = () => {
    setName('');
    setSlug('');
    setSlugTouched(false);
    create.reset();
  };

  const handleSubmit = () => {
    if (!name.trim() || !slug.trim()) return;
    create.mutate(
      { name: name.trim(), slug: slug.trim() },
      {
        onSuccess: (client) => {
          reset();
          setOpen(false);
          onCreated?.(client.id);
        },
      }
    );
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="card p-5 border-dashed hover:border-accent-green-110/50 transition-colors group text-left w-full"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white-5 border border-dashed border-white-20 flex items-center justify-center flex-shrink-0 group-hover:border-accent-green-110/50">
            <Plus className="w-6 h-6 text-white-40 group-hover:text-accent-green-110" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white-100 font-semibold text-lg group-hover:text-accent-green-110 transition-colors">
              Create new client
            </h3>
            <p className="text-sm text-white-40 mt-1">
              Add a new brand workspace.
            </p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white-100 font-semibold text-lg">New client</h3>
        <button
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="text-white-40 hover:text-white-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-2">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          placeholder="Acme Fitness"
          className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-2">
          Slug
        </label>
        <input
          type="text"
          value={slug}
          onChange={(e) => {
            setSlug(slugify(e.target.value));
            setSlugTouched(true);
          }}
          placeholder="acme-fitness"
          className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 font-mono"
        />
      </div>

      {create.error && <StatusBanner error={(create.error as Error).message} />}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || !slug.trim() || create.isPending}
          className="btn btn-primary text-xs flex items-center gap-1"
        >
          {create.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Plus className="w-3 h-3" />
          )}
          Create client
        </button>
        <button
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="btn btn-secondary text-xs"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
