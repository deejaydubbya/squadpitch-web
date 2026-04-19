'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Loader2,
  HardDrive,
  Cloud,
  Folder,
  FileImage,
  FileVideo,
  File,
  Download,
  ExternalLink,
  Unplug,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGenericIntegrations,
  useMediaImportConnect,
  useMediaImportFiles,
  useMediaImportFile,
  useMediaImportDisconnect,
  type MediaImportFile,
} from '@/hooks/useIntegrations';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const MEDIA_PROVIDERS = [
  { type: 'google_drive' as const, label: 'Google Drive', icon: HardDrive },
  { type: 'dropbox' as const, label: 'Dropbox', icon: Cloud },
];

interface Props {
  clientId: string;
}

export function CloudStorageManager({ clientId }: Props) {
  const qc = useQueryClient();
  const { data: integrations, isLoading } = useGenericIntegrations();
  const connect = useMediaImportConnect();
  const disconnect = useMediaImportDisconnect();
  const [browsing, setBrowsing] = useState<string | null>(null);

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

  if (isLoading) return <LoadingSpinner size="sm" />;

  const driveInt = integrations?.find((i) => i.type === 'google_drive' && i.isActive);
  const dropboxInt = integrations?.find((i) => i.type === 'dropbox' && i.isActive);

  const handleConnect = (provider: 'google_drive' | 'dropbox') => {
    connect.mutate(provider, {
      onSuccess: (data) => {
        window.open(data.authUrl, 'sp-oauth-popup', 'width=600,height=720');
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white-100">Cloud Storage</h3>
        <p className="text-xs text-white-40 mt-0.5">
          Connect cloud storage so Squadpitch can use your existing photos and files in posts.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {MEDIA_PROVIDERS.map(({ type, label, icon: Icon }) => {
          const connected = type === 'google_drive' ? driveInt : dropboxInt;
          return (
            <div key={type} className="card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-accent-green-110/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4.5 h-4.5 text-accent-green-110" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white-100">{label}</p>
                  <p className="text-xs text-white-40">
                    {connected
                      ? `Connected${(connected.config as { email?: string })?.email ? ` — ${(connected.config as { email?: string }).email}` : ''}`
                      : 'Not connected'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {connected ? (
                  <>
                    <button
                      onClick={() => setBrowsing(browsing === connected.id ? null : connected.id)}
                      className="text-xs text-accent-green-110 hover:underline flex items-center gap-1"
                    >
                      <Folder className="w-3 h-3" />
                      {browsing === connected.id ? 'Close' : 'Browse files'}
                    </button>
                    <button
                      onClick={() => disconnect.mutate(connected.id)}
                      className="text-xs text-red-400 hover:underline flex items-center gap-1"
                    >
                      <Unplug className="w-3 h-3" />
                      {disconnect.isPending ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleConnect(type)}
                    className="btn-primary text-xs px-3 py-1 flex items-center gap-1"
                  >
                    {connect.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ExternalLink className="w-3 h-3" />
                    )}
                    Connect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* File browser */}
      {browsing && (
        <FileBrowser integrationId={browsing} clientId={clientId} />
      )}
    </div>
  );
}

function FileBrowser({
  integrationId,
  clientId,
}: {
  integrationId: string;
  clientId: string;
}) {
  const [folderPath, setFolderPath] = useState<{ id?: string; path?: string; name: string }[]>([
    { name: 'Root' },
  ]);
  const current = folderPath[folderPath.length - 1];

  const queryOptions: Record<string, string> = {};
  if (current.id) queryOptions.folderId = current.id;
  if (current.path) queryOptions.path = current.path;

  const { data, isLoading } = useMediaImportFiles(integrationId, queryOptions);
  const importFile = useMediaImportFile();

  const navigateToFolder = useCallback(
    (file: MediaImportFile) => {
      setFolderPath((p) => [
        ...p,
        { id: file.id, path: file.path, name: file.name },
      ]);
    },
    [],
  );

  const navigateUp = useCallback(
    (index: number) => {
      setFolderPath((p) => p.slice(0, index + 1));
    },
    [],
  );

  const handleImport = (file: MediaImportFile) => {
    const fileRef = file.path || file.id;
    importFile.mutate({ integrationId, fileRef, clientId });
  };

  const getFileIcon = (file: MediaImportFile) => {
    if (file.isFolder) return Folder;
    if (file.mimeType?.startsWith('image/')) return FileImage;
    if (file.mimeType?.startsWith('video/')) return FileVideo;
    return File;
  };

  const isImportable = (file: MediaImportFile) => {
    return (
      !file.isFolder &&
      (file.mimeType?.startsWith('image/') || file.mimeType?.startsWith('video/'))
    );
  };

  return (
    <div className="card p-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 mb-3 flex-wrap">
        {folderPath.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-white-30">/</span>}
            <button
              onClick={() => navigateUp(i)}
              className={`text-xs hover:underline ${
                i === folderPath.length - 1
                  ? 'text-white-100 font-medium'
                  : 'text-accent-green-110'
              }`}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="sm" />
        </div>
      ) : (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {data?.files && data.files.length > 0 ? (
            data.files.map((file) => {
              const Icon = getFileIcon(file);
              return (
                <div
                  key={file.id || file.path}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white-5 transition-colors"
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      file.isFolder ? 'text-accent-green-110' : 'text-white-40'
                    }`}
                  />
                  {file.isFolder ? (
                    <button
                      onClick={() => navigateToFolder(file)}
                      className="text-sm text-white-100 hover:text-accent-green-110 text-left truncate"
                    >
                      {file.name}
                    </button>
                  ) : (
                    <span className="text-sm text-white-100 truncate">{file.name}</span>
                  )}
                  <span className="text-xs text-white-30 ml-auto flex-shrink-0">
                    {file.size ? `${(file.size / 1024).toFixed(0)} KB` : ''}
                  </span>
                  {isImportable(file) && (
                    <button
                      onClick={() => handleImport(file)}
                      className="text-xs text-accent-green-110 hover:underline flex items-center gap-1 flex-shrink-0"
                      disabled={importFile.isPending}
                    >
                      {importFile.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                      Import
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-white-40 text-center py-4">No files found.</p>
          )}
        </div>
      )}
    </div>
  );
}
