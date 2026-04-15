'use client';

import { useState } from 'react';
import {
  Plus,
  Globe,
  FileSpreadsheet,
  PenLine,
  RefreshCw,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Pause,
  Play,
  AlertCircle,
  Server,
} from 'lucide-react';
import {
  useListingSources,
  useCreateListingSource,
  useUpdateListingSource,
  useSyncListingSource,
  useRemoveListingSource,
  type ListingSource,
} from '@/hooks/useSquadpitch';

interface Props {
  clientId: string;
  onImportCSV?: () => void;
  onAddManual?: () => void;
}

const SOURCE_TYPE_META: Record<string, { icon: typeof Globe; label: string; color: string }> = {
  URL: { icon: Globe, label: 'Website URL', color: 'text-blue-400' },
  CSV: { icon: FileSpreadsheet, label: 'CSV Import', color: 'text-emerald-400' },
  MANUAL: { icon: PenLine, label: 'Manual Entry', color: 'text-amber-400' },
};

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ListingFeedsManager({ clientId, onImportCSV, onAddManual }: Props) {
  const { data, isLoading } = useListingSources(clientId);
  const createSource = useCreateListingSource(clientId);
  const syncSource = useSyncListingSource(clientId);
  const removeSource = useRemoveListingSource(clientId);
  const updateSource = useUpdateListingSource(clientId);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addType, setAddType] = useState<'URL' | 'CSV' | 'MANUAL' | null>(null);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const sources = data?.sources ?? [];
  const stats = data?.stats;

  const handleAddSource = () => {
    if (addType === 'CSV' && onImportCSV) {
      onImportCSV();
      resetAddForm();
      return;
    }
    if (addType === 'MANUAL' && onAddManual) {
      onAddManual();
      resetAddForm();
      return;
    }

    createSource.mutate(
      {
        type: addType || 'URL',
        name: newName.trim() || undefined,
        sourceUrl: newUrl.trim() || undefined,
      },
      { onSuccess: () => resetAddForm() }
    );
  };

  const handleSync = (sourceId: string) => {
    setSyncingId(sourceId);
    syncSource.mutate(sourceId, {
      onSettled: () => setSyncingId(null),
    });
  };

  const handleRemove = (sourceId: string) => {
    removeSource.mutate(sourceId, {
      onSuccess: () => setConfirmRemoveId(null),
    });
  };

  const handleToggleEnabled = (source: ListingSource) => {
    updateSource.mutate({
      sourceId: source.id,
      isEnabled: !source.isEnabled,
    });
  };

  const resetAddForm = () => {
    setShowAddForm(false);
    setAddType(null);
    setNewName('');
    setNewUrl('');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white-100">Listing Feeds</h3>
          <p className="text-xs text-white-40 mt-0.5">
            Import your property inventory from one or more sources
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-accent-green-110 hover:text-accent-green-110/80 transition-colors flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Source
        </button>
      </div>

      {/* Stats bar */}
      {stats && stats.sourceCount > 0 && (
        <div className="flex items-center gap-4 text-xs text-white-40">
          <span>{stats.sourceCount} source{stats.sourceCount !== 1 ? 's' : ''}</span>
          <span className="text-white-10">·</span>
          <span>{stats.totalListings} listing{stats.totalListings !== 1 ? 's' : ''}</span>
          {stats.lastSyncedAt && (
            <>
              <span className="text-white-10">·</span>
              <span>Last sync {formatTimeAgo(stats.lastSyncedAt)}</span>
            </>
          )}
        </div>
      )}

      {/* Add source form */}
      {showAddForm && (
        <div className="card p-4 space-y-3 border-accent-green-110/20">
          {!addType ? (
            <>
              <p className="text-sm font-medium text-white-100">Choose source type</p>
              <div className="grid grid-cols-3 gap-2">
                {(['URL', 'CSV', 'MANUAL'] as const).map((type) => {
                  const meta = SOURCE_TYPE_META[type];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => setAddType(type)}
                      className="card p-3 text-center hover:border-accent-green-110/30 transition-colors"
                    >
                      <Icon className={`w-5 h-5 mx-auto mb-1.5 ${meta.color}`} />
                      <p className="text-xs font-medium text-white-100">{meta.label}</p>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Server className="w-3.5 h-3.5 text-white-20" />
                <span className="text-[11px] text-white-30">MLS / IDX API coming soon</span>
              </div>
              <button
                onClick={resetAddForm}
                className="text-xs text-white-40 hover:text-white-100"
              >
                Cancel
              </button>
            </>
          ) : addType === 'URL' ? (
            <>
              <p className="text-sm font-medium text-white-100">Add listings URL source</p>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Source name (e.g., My IDX Site)"
                className="input w-full text-sm"
              />
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://yoursite.com/listings"
                className="input w-full text-sm font-mono"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddSource}
                  disabled={!newUrl.trim() || createSource.isPending}
                  className="btn-primary text-sm px-4 disabled:opacity-50"
                >
                  {createSource.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Add Source'
                  )}
                </button>
                <button onClick={resetAddForm} className="text-sm text-white-40 hover:text-white-100">
                  Cancel
                </button>
              </div>
            </>
          ) : (
            // CSV and Manual — delegate to existing modals
            <div className="text-center py-2">
              <Loader2 className="w-4 h-4 animate-spin mx-auto text-white-40" />
            </div>
          )}
        </div>
      )}

      {/* Source list */}
      {isLoading ? (
        <div className="card p-6 text-center">
          <Loader2 className="w-4 h-4 animate-spin mx-auto text-white-40" />
        </div>
      ) : sources.length === 0 ? (
        <div className="card p-6 text-center text-sm text-white-40">
          No listing sources connected yet. Add a URL, upload a CSV, or enter listings manually.
        </div>
      ) : (
        <div className="space-y-2">
          {sources.map((source) => {
            const meta = SOURCE_TYPE_META[source.type] ?? SOURCE_TYPE_META.URL;
            const Icon = meta.icon;
            const isSyncing = syncingId === source.id || source.syncStatus === 'syncing';
            const isRemoving = confirmRemoveId === source.id;

            return (
              <div
                key={source.id}
                className={`card p-3 transition-colors ${
                  !source.isEnabled ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className="w-8 h-8 rounded-lg bg-white-5 flex items-center justify-center flex-shrink-0">
                    <Icon className={`w-4 h-4 ${meta.color}`} />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white-100 truncate">
                        {source.name}
                      </p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white-5 text-white-40 flex-shrink-0">
                        {meta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {source.sourceUrl && (
                        <span className="text-[11px] text-white-30 font-mono truncate max-w-[200px]">
                          {source.sourceUrl.replace(/^https?:\/\//, '')}
                        </span>
                      )}
                      <span className="text-[11px] text-white-30">
                        {source.listingCount} listing{source.listingCount !== 1 ? 's' : ''}
                      </span>
                      {source.syncStatus === 'error' && (
                        <span className="flex items-center gap-0.5 text-[11px] text-red-400">
                          <XCircle className="w-3 h-3" /> Error
                        </span>
                      )}
                      {source.syncStatus === 'synced' && (
                        <span className="flex items-center gap-0.5 text-[11px] text-green-400">
                          <CheckCircle className="w-3 h-3" /> Synced
                        </span>
                      )}
                      {source.lastSyncedAt && (
                        <span className="flex items-center gap-0.5 text-[11px] text-white-20">
                          <Clock className="w-3 h-3" /> {formatTimeAgo(source.lastSyncedAt)}
                        </span>
                      )}
                    </div>
                    {source.lastError && (
                      <p className="text-[11px] text-red-400/70 mt-0.5 truncate" title={source.lastError}>
                        {source.lastError}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {source.type === 'URL' && (
                      <button
                        onClick={() => handleSync(source.id)}
                        disabled={isSyncing || !source.isEnabled}
                        className="p-1.5 rounded-md hover:bg-white-5 text-white-40 hover:text-accent-green-110 transition-colors disabled:opacity-30"
                        title="Sync now"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleEnabled(source)}
                      className="p-1.5 rounded-md hover:bg-white-5 text-white-40 hover:text-white-100 transition-colors"
                      title={source.isEnabled ? 'Pause' : 'Enable'}
                    >
                      {source.isEnabled ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => setConfirmRemoveId(source.id)}
                      className="p-1.5 rounded-md hover:bg-white-5 text-white-40 hover:text-red-400 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Confirm remove */}
                {isRemoving && (
                  <div className="mt-2 pt-2 border-t border-white-5 flex items-center justify-between">
                    <p className="text-xs text-red-400">
                      Remove this source and its {source.listingCount} listing{source.listingCount !== 1 ? 's' : ''}?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRemove(source.id)}
                        disabled={removeSource.isPending}
                        className="text-xs text-red-400 font-medium hover:underline"
                      >
                        {removeSource.isPending ? 'Removing...' : 'Yes, remove'}
                      </button>
                      <button
                        onClick={() => setConfirmRemoveId(null)}
                        className="text-xs text-white-40 hover:text-white-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
