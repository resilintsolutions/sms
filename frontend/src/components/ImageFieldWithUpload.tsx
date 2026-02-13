'use client';

import { useRef } from 'react';
import { Upload } from 'lucide-react';
import { uploadLandingImage } from '@/lib/api';

type UploadType = 'logo' | 'banner' | 'hero' | 'about' | 'slide' | 'gallery' | 'testimonial';

type ImageFieldWithUploadProps = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  onUploadSuccess?: (url: string) => void;
  onUploadError?: (err: string) => void;
  uploadType: UploadType;
  uploading: boolean;
  onUploadingChange: (loading: boolean) => void;
  placeholder?: string;
  /** Preview variant: logo (small), banner (wide), hero (landscape), about (medium) */
  previewVariant?: UploadType;
  /** Compact mode: only show the upload button, no text input or preview */
  compact?: boolean;
};

const PREVIEW_STYLES: Record<UploadType, string> = {
  logo: 'h-12 w-auto max-w-[100px] object-contain rounded sm:h-14 sm:max-w-[120px]',
  banner: 'h-14 w-full max-w-full object-cover rounded sm:h-20 sm:max-h-[80px]',
  hero: 'h-20 w-full max-w-full object-cover rounded sm:h-28 sm:max-h-[120px]',
  about: 'h-24 w-full max-w-[160px] object-cover rounded sm:h-32 sm:max-w-[200px] sm:max-h-[140px]',
  slide: 'h-20 w-full max-w-full object-cover rounded sm:h-28 sm:max-h-[120px]',
  gallery: 'h-24 w-full max-w-[160px] object-cover rounded sm:h-32 sm:max-w-[200px] sm:max-h-[140px]',
  testimonial: 'h-12 w-12 rounded-full object-cover',
};

export function ImageFieldWithUpload({
  label,
  value,
  onChange,
  onUploadSuccess,
  onUploadError,
  uploadType,
  uploading,
  onUploadingChange,
  placeholder = 'URL or upload',
  previewVariant,
  compact = false,
}: ImageFieldWithUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const variant = previewVariant ?? uploadType;
  const previewClass = PREVIEW_STYLES[variant];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUploadingChange(true);
    try {
      const res = await uploadLandingImage(uploadType, file);
      if (res.success && res.data?.url) {
        onChange(res.data.url);
        onUploadSuccess?.(res.data.url);
      } else {
        onUploadError?.(res.message || 'Upload failed');
      }
    } finally {
      onUploadingChange(false);
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  if (compact) {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn shrink-0 flex items-center justify-center gap-1 text-xs px-2 py-1"
        >
          {uploading ? (
            <span className="animate-pulse text-xs">…</span>
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
        </button>
      </>
    );
  }

  return (
    <div className="w-full space-y-2">
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="input min-w-0 flex-1"
            placeholder={placeholder}
          />
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="btn shrink-0 flex items-center justify-center gap-2 self-stretch sm:self-auto"
          >
            {uploading ? (
              <span className="animate-pulse">Uploading…</span>
            ) : (
              <>
                <Upload className="h-4 w-4 shrink-0" /> Upload
              </>
            )}
          </button>
        </div>
        {value && (
          <div className="flex w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-2 sm:w-auto sm:min-w-[120px] sm:max-w-[280px] sm:self-start">
            <img
              src={value}
              alt={label}
              className={previewClass}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
