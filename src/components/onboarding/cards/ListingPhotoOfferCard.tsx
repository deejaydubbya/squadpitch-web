'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Upload, ArrowRight, Loader2, X, ImageIcon } from 'lucide-react';

interface Props {
  onUpload: (files: File[], onProgress?: (p: { uploaded: number; total: number; currentName: string }) => void) => void;
  onSkip: () => void;
  /** When 'business', card copy says "business photos" instead of "listing photos". */
  variant?: 'listing' | 'business';
}

export function ListingPhotoOfferCard({ onUpload, onSkip, variant = 'listing' }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ uploaded: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBusiness = variant === 'business';
  const photoLabel = isBusiness ? 'business photos' : 'listing photos';

  const previews = useMemo(() => {
    return files.map((f) => ({ file: f, url: URL.createObjectURL(f) }));
  }, [files]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpload = () => {
    if (files.length === 0 || uploading) return;
    setUploading(true);
    onUpload(files, (p) => setProgress(p));
  };

  if (uploading && progress) {
    return (
      <div className="flex flex-col gap-2 p-4 rounded-lg bg-white-5 border border-white-10">
        <div className="flex items-center justify-between text-xs text-white-50">
          <span>Uploading {progress.uploaded + 1} of {progress.total}</span>
          <span>{Math.round((progress.uploaded / progress.total) * 100)}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white-10 overflow-hidden">
          <div
            className="h-full rounded-full bg-accent-green-110 transition-all duration-300"
            style={{ width: `${(progress.uploaded / progress.total) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Heading */}
      <div>
        <h3 className="text-sm font-semibold text-white-90">
          {isBusiness ? 'Add business photos' : 'Add listing photos'}
        </h3>
        <p className="text-xs text-white-40 mt-0.5">
          Photos help Squadpitch create better Instagram, Facebook, and {isBusiness ? 'marketing' : 'listing'} posts.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={cn(
          'flex flex-col items-center justify-center gap-2 p-6 rounded-lg cursor-pointer',
          'bg-white-5 border border-dashed border-white-20 hover:border-accent-green-110/50',
          'transition-all',
        )}
      >
        <Upload className="w-6 h-6 text-white-40" />
        <p className="text-sm text-white-50">
          {files.length > 0
            ? `${files.length} photo${files.length > 1 ? 's' : ''} selected — click to add more`
            : `Click or drag ${photoLabel} here`}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Thumbnail previews */}
      {previews.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-dark">
          {previews.map(({ file, url }, i) => (
            <div key={`${file.name}-${i}`} className="relative flex-none group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={file.name}
                className="w-16 h-16 rounded object-cover"
              />
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                className={cn(
                  'absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full',
                  'bg-red-500 text-white flex items-center justify-center',
                  'opacity-0 group-hover:opacity-100 transition-opacity',
                )}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onSkip}
          className="text-xs text-white-40 hover:text-white-60 transition-colors"
        >
          Skip — I&apos;ll add photos later
        </button>
        {files.length > 0 && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium',
              'bg-accent-green-110 text-white hover:bg-accent-green-120 cursor-pointer transition-all',
              uploading && 'opacity-50 cursor-not-allowed',
            )}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            Upload ({files.length})
          </button>
        )}
      </div>
    </div>
  );
}
