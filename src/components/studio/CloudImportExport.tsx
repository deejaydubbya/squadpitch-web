'use client';

import { useState, useEffect } from 'react';
import {
  Cloud,
  HardDrive,
  FolderOpen,
  ChevronRight,
  Download,
  Upload,
  Loader2,
  Check,
  X,
  ArrowLeft,
  ExternalLink,
  Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGenericIntegrations,
  useMediaImportConnect,
  useMediaImportFiles,
  useMediaImportFile,
  useMediaExportFile,
  type MediaImportFile,
  type Integration,
} from '@/hooks/useIntegrations';
import type { MediaAsset } from '@/hooks/useSquadpitch';

interface Props {
  clientId: string;
  assets?: MediaAsset[];
}

const MEDIA_PROVIDERS = ['google_drive', 'dropbox'] as const;

const CONNECT_PROVIDERS = [
  { type: 'google_drive' as const, label: 'Google Drive', icon: HardDrive },
  { type: 'dropbox' as const, label: 'Dropbox', icon: Cloud },
];

function providerLabel(type: string) {
  return type === 'google_drive' ? 'Google Drive' : type === 'dropbox' ? 'Dropbox' : type;
}

function providerIcon(type: string) {
  return type === 'google_drive' ? HardDrive : Cloud;
}

function canImport(file: MediaImportFile) {
  if (file.isFolder) return false;
  const mime = file.mimeType || '';
  return mime.startsWith('image/') || mime.startsWith('video/');
}

export function CloudImportExport({ clientId, assets }: Props) {
  const qc = useQueryClient();
  const { data: integrations } = useGenericIntegrations();
  const connect = useMediaImportConnect();

  const cloudIntegrations = integrations?.filter(
    (i) => i.isActive && MEDIA_PROVIDERS.includes(i.type as typeof MEDIA_PROVIDERS[number]),
  );

  // Listen for OAuth popup completion → refresh integrations
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const expectedOrigin = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      if (e.origin !== expectedOrigin && e.origin !== window.location.origin) return;
      const ch = e.data?.channel?.toUpperCase();
      if (e.data?.type === 'sp-oauth-complete' && (ch === 'DRIVE' || ch === 'DROPBOX')) {
        qc.invalidateQueries({ queryKey: ['integrations'] });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [qc]);

  const handleConnect = (provider: 'google_drive' | 'dropbox') => {
    connect.mutate(provider, {
      onSuccess: (data) => {
        window.open(data.authUrl, 'sp-oauth-popup', 'width=600,height=720');
      },
    });
  };

  const connectedTypes = new Set(cloudIntegrations?.map((i) => i.type) ?? []);
  const unconnectedProviders = CONNECT_PROVIDERS.filter((p) => !connectedTypes.has(p.type));

  // No providers connected — show connect cards
  if (!cloudIntegrations?.length) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-white-40">
          Connect a cloud storage provider to browse and import media.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CONNECT_PROVIDERS.map(({ type, label, icon: Icon }) => (
            <div
              key={type}
              className="rounded-lg border border-white-10 bg-white-5 p-4 flex flex-col items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-white-10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-white-60" />
              </div>
              <span className="text-sm font-medium text-white-100">{label}</span>
              <button
                onClick={() => handleConnect(type)}
                disabled={connect.isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-green-110 text-sp-dark text-xs font-medium hover:bg-accent-green-110/90 transition-colors disabled:opacity-50"
              >
                {connect.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ExternalLink className="w-3.5 h-3.5" />
                )}
                Connect
              </button>
            </div>
          ))}
        </div>
        {connect.error && (
          <p className="text-xs text-accent-red text-center">
            {(connect.error as Error).message}
          </p>
        )}
      </div>
    );
  }

  // Some providers connected
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {cloudIntegrations.map((integration) => (
          <CloudProvider
            key={integration.id}
            integration={integration}
            clientId={clientId}
            assets={assets}
          />
        ))}
      </div>

      {/* Connect additional providers */}
      {unconnectedProviders.length > 0 && (
        <div className="border-t border-white-10 pt-3">
          <div className="flex items-center gap-3 flex-wrap">
            {unconnectedProviders.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                onClick={() => handleConnect(type)}
                disabled={connect.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white-5 border border-white-10 text-xs text-white-60 hover:text-white-100 hover:bg-white-10 transition-colors disabled:opacity-50"
              >
                {connect.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Link2 className="w-3 h-3" />
                )}
                <Icon className="w-3 h-3" />
                Connect {label}
              </button>
            ))}
          </div>
          {connect.error && (
            <p className="text-xs text-accent-red mt-2">
              {(connect.error as Error).message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Single provider panel ─────────────────────────────────────────────

interface CloudProviderProps {
  integration: Integration;
  clientId: string;
  assets?: MediaAsset[];
}

function CloudProvider({ integration, clientId, assets }: CloudProviderProps) {
  const [mode, setMode] = useState<'idle' | 'import' | 'export'>('idle');
  const Icon = providerIcon(integration.type);

  return (
    <div className="rounded-lg border border-white-10 bg-white-5 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-white-60" />
          <span className="text-sm font-medium text-white-100">
            {providerLabel(integration.type)}
          </span>
          <span className="text-[10px] text-white-40">
            {(integration.config as Record<string, unknown>)?.email as string || ''}
          </span>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zone-green/20 text-zone-green">
          Connected
        </span>
      </div>

      {mode === 'idle' && (
        <div className="flex gap-2">
          <button
            onClick={() => setMode('import')}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white-10 text-white-60 text-xs font-medium hover:bg-white-20 hover:text-white-100 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Import
          </button>
          <button
            onClick={() => setMode('export')}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white-10 text-white-60 text-xs font-medium hover:bg-white-20 hover:text-white-100 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      )}

      {mode === 'import' && (
        <ImportBrowser
          integrationId={integration.id}
          providerType={integration.type}
          clientId={clientId}
          onClose={() => setMode('idle')}
        />
      )}

      {mode === 'export' && (
        <ExportPicker
          integrationId={integration.id}
          providerType={integration.type}
          assets={assets}
          onClose={() => setMode('idle')}
        />
      )}
    </div>
  );
}

// ── Import File Browser ───────────────────────────────────────────────

interface ImportBrowserProps {
  integrationId: string;
  providerType: string;
  clientId: string;
  onClose: () => void;
}

function ImportBrowser({ integrationId, providerType, clientId, onClose }: ImportBrowserProps) {
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([]);
  const currentFolder = folderStack[folderStack.length - 1];

  const queryOpts: Record<string, string> = {};
  if (providerType === 'google_drive' && currentFolder) {
    queryOpts.folderId = currentFolder.id;
  } else if (providerType === 'dropbox' && currentFolder) {
    queryOpts.path = currentFolder.id;
  }

  const { data, isLoading, error: listError } = useMediaImportFiles(integrationId, queryOpts);
  const importFile = useMediaImportFile();
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

  const files = data?.files ?? [];

  const handleImport = (file: MediaImportFile) => {
    const fileRef = providerType === 'dropbox' ? (file.path || file.id) : file.id;
    importFile.mutate(
      { integrationId, fileRef, clientId },
      { onSuccess: () => setImportedIds((s) => new Set(s).add(file.id)) },
    );
  };

  const openFolder = (file: MediaImportFile) => {
    const id = providerType === 'dropbox' ? (file.path || file.id) : file.id;
    setFolderStack((s) => [...s, { id, name: file.name }]);
  };

  const goBack = () => setFolderStack((s) => s.slice(0, -1));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {folderStack.length > 0 && (
            <button
              onClick={goBack}
              className="p-1 rounded hover:bg-white-10 text-white-40 hover:text-white-100 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-xs text-white-60">
            {currentFolder?.name || 'Root'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white-10 text-white-40 hover:text-white-100 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-0.5 rounded-lg border border-white-10 bg-sp-bg p-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-white-40" />
          </div>
        ) : listError ? (
          <p className="text-xs text-accent-red text-center py-4">
            Failed to load files. Try reconnecting in Settings &gt; Integrations.
          </p>
        ) : files.length === 0 ? (
          <p className="text-xs text-white-40 text-center py-4">No files found in this folder</p>
        ) : (
          files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white-5 group"
            >
              {file.isFolder ? (
                <FolderOpen className="w-3.5 h-3.5 text-zone-yellow flex-shrink-0" />
              ) : file.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={file.thumbnailUrl}
                  alt=""
                  className="w-7 h-7 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded bg-white-10 flex items-center justify-center flex-shrink-0">
                  <Cloud className="w-3 h-3 text-white-40" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-xs text-white-100 truncate">{file.name}</p>
                {file.size && (
                  <p className="text-[10px] text-white-40">
                    {file.size < 1024 * 1024
                      ? `${(file.size / 1024).toFixed(0)} KB`
                      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                  </p>
                )}
              </div>

              {file.isFolder ? (
                <button
                  onClick={() => openFolder(file)}
                  className="p-1 rounded text-white-40 hover:text-white-100 hover:bg-white-10 transition-all"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : importedIds.has(file.id) ? (
                <Check className="w-3.5 h-3.5 text-zone-green flex-shrink-0" />
              ) : canImport(file) ? (
                <button
                  onClick={() => handleImport(file)}
                  disabled={importFile.isPending}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-accent-green-110/20 text-accent-green-110 hover:bg-accent-green-110/30 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                >
                  {importFile.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    'Import'
                  )}
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>

      {importFile.error && (
        <p className="text-[10px] text-accent-red">
          {(importFile.error as Error).message}
        </p>
      )}
    </div>
  );
}

// ── Export Picker ─────────────────────────────────────────────────────

interface ExportPickerProps {
  integrationId: string;
  providerType: string;
  assets?: MediaAsset[];
  onClose: () => void;
}

function ExportPicker({ integrationId, providerType, assets, onClose }: ExportPickerProps) {
  const exportFile = useMediaExportFile();
  const [exportedIds, setExportedIds] = useState<Set<string>>(new Set());
  const [exportingId, setExportingId] = useState<string | null>(null);

  const readyAssets = assets?.filter((a) => a.status === 'READY' && a.url) ?? [];

  const handleExport = (asset: MediaAsset) => {
    setExportingId(asset.id);
    exportFile.mutate(
      { integrationId, assetId: asset.id },
      {
        onSuccess: () => {
          setExportedIds((s) => new Set(s).add(asset.id));
          setExportingId(null);
        },
        onError: () => setExportingId(null),
      },
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white-60">
          Select assets to export to {providerLabel(providerType)}
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white-10 text-white-40 hover:text-white-100 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-0.5 rounded-lg border border-white-10 bg-sp-bg p-1">
        {readyAssets.length === 0 ? (
          <p className="text-xs text-white-40 text-center py-4">No assets to export</p>
        ) : (
          readyAssets.map((asset) => (
            <div
              key={asset.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white-5 group"
            >
              {asset.thumbnailUrl || asset.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={(asset.assetType === 'video' ? asset.thumbnailUrl : asset.url) || asset.url!}
                  alt=""
                  className="w-7 h-7 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded bg-white-10 flex items-center justify-center flex-shrink-0">
                  <Cloud className="w-3 h-3 text-white-40" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-xs text-white-100 truncate">
                  {asset.filename || (asset.source === 'AI_GENERATED' ? 'AI Generated' : 'Untitled')}
                </p>
                <p className="text-[10px] text-white-40">{asset.assetType}</p>
              </div>

              {exportedIds.has(asset.id) ? (
                <Check className="w-3.5 h-3.5 text-zone-green flex-shrink-0" />
              ) : (
                <button
                  onClick={() => handleExport(asset)}
                  disabled={exportingId === asset.id}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-zone-blue/20 text-zone-blue hover:bg-zone-blue/30 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                >
                  {exportingId === asset.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    'Export'
                  )}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {exportFile.error && (
        <p className="text-[10px] text-accent-red">
          {(exportFile.error as Error).message?.includes('403') || (exportFile.error as Error).message?.includes('permission')
            ? 'Permission denied. Reconnect this provider in Settings > Integrations to grant write access.'
            : (exportFile.error as Error).message}
        </p>
      )}
    </div>
  );
}
