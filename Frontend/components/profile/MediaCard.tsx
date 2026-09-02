'use client';

import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { api, ApiRequestError } from '@/lib/api';

interface MediaCardProps {
  kind: 'photo' | 'signature';
  title: string;
  description: string;
  icon: string;
  previewUrl?: string;
  previewClassName: string;
  emptyLabel: string;
  replaceLabel: string;
  onUploaded: () => void;
}

export function MediaCard({ kind, title, description, icon, previewUrl, previewClassName, emptyLabel, replaceLabel, onUploaded }: MediaCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(file: File) {
    setUploading(true);
    setError(null);
    try {
      if (kind === 'photo') {
        await api.uploadPhoto(file);
      } else {
        await api.uploadSignature(file);
      }
      onUploaded();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="bg-surface-container-lowest/70 backdrop-blur rounded-lg p-lg flex flex-col items-center justify-center text-center group hover:shadow-floating shadow-card transition-shadow duration-300 border border-white/30">
      <div className="w-full flex justify-between items-start mb-md">
        <div className="text-left">
          <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">{description}</p>
        </div>
        <Icon name={icon} className="text-tertiary-container text-3xl" />
      </div>

      <div className={previewClassName}>
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, unpredictable source
          <img src={previewUrl} alt={title} className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-outline">
            <Icon name={icon} className="text-3xl" />
            <span className="font-label-sm text-label-sm">{emptyLabel}</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelected(file);
          e.target.value = '';
        }}
      />

      <div className="flex gap-sm w-full mt-md justify-center">
        <Button variant="primary" className="rounded-full" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? 'Uploading…' : previewUrl ? replaceLabel : `Upload ${title}`}
        </Button>
      </div>
      {error && (
        <p role="alert" className="font-label-sm text-label-sm text-error mt-sm">
          {error}
        </p>
      )}
    </div>
  );
}
