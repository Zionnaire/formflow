'use client';

import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api, ApiRequestError } from '@/lib/api';

interface PhotoUploadFieldProps {
  photoUrl?: string;
  onUploaded: () => void;
}

export function PhotoUploadField({ photoUrl, onUploaded }: PhotoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(file: File) {
    setUploading(true);
    setError(null);
    try {
      await api.uploadPhoto(file);
      onUploaded();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="md:col-span-2 flex flex-col items-center gap-xs">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full mb-sm flex flex-col items-center justify-center p-md border-2 border-dashed border-outline-variant rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors group overflow-hidden disabled:opacity-60"
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, unpredictable source
          <img src={photoUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover mb-2" />
        ) : (
          <Icon name="person_add" className="text-outline text-4xl mb-2 group-hover:text-primary transition-colors" />
        )}
        <span className="font-label-md text-label-md text-on-surface-variant group-hover:text-primary transition-colors">
          {uploading ? 'Uploading…' : photoUrl ? 'Replace Profile Photo' : 'Upload Profile Photo'}
        </span>
        <span className="font-label-sm text-label-sm text-outline mt-1">(Optional, but helpful)</span>
      </button>
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
      {error && (
        <p role="alert" className="font-label-sm text-label-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
