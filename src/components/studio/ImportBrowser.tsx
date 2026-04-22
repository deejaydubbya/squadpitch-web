'use client';

import { useState } from 'react';
import {
  Cloud,
  FolderOpen,
  ChevronRight,
  Loader2,
  Check,
  X,
  ArrowLeft,
} from 'lucide-react';
import {
  useMediaImportFiles,
  useMediaImportFile,
  type MediaImportFile,
} from '@/hooks/useIntegrations';

export interface ImportBrowserProps {
  integrationId: string;
  providerType: string;
  clientId: string;
  onClose: () => void;
  /** Called after a file is successfully imported, with the file reference */
  onImported?: (file: MediaImportFile, result: Record<string, unknown>) => void;
}

function canImport(file: MediaImportFile) {
  if (file.isFolder) return false;
  const mime = file.mimeType || '';
  return mime.startsWith('image/') || mime.startsWith('video/');
}

export function ImportBrowser({ integrationId, providerType, clientId, onClose, onImported }: ImportBrowserProps) {
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
      {
        onSuccess: (result) => {
          setImportedIds((s) => new Set(s).add(file.id));
          onImported?.(file, result);
        },
      },
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
