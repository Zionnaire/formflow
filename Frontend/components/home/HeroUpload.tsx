'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';
import { api, ApiRequestError } from '@/lib/api';

type Stage = 'idle' | 'uploading' | 'reading' | 'creating';

const STAGE_LABEL: Record<Stage, string> = {
  idle: '',
  uploading: 'Uploading your PDF…',
  reading: 'Reading your form and finding its fields…',
  creating: 'Almost ready…',
};

/** Upload -> hash-check -> extract-fields -> create submission -> editor (brief section 7.1). */
export function HeroUpload() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);

  function openPicker() {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    inputRef.current?.click();
  }

  async function handleFile(file: File) {
    setError(null);
    try {
      setStage('uploading');
      const uploaded = await api.uploadTemplateFile(file);

      let template = uploaded.template;
      if (!template) {
        setStage('reading');
        const title = file.name.replace(/\.pdf$/i, '');
        ({ template } = await api.extractFields(uploaded.fileHash, uploaded.cloudinaryId, title));
      }

      setStage('creating');
      const { submission } = await api.createSubmission(template._id);
      router.push(`/forms/${submission._id}/editor`);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Something went wrong reading that PDF.');
      setStage('idle');
    }
  }

  const isBusy = stage !== 'idle';

  return (
    <section className="flex flex-col md:flex-row gap-lg items-center">
      <div className="w-full md:w-1/2 flex flex-col gap-md">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background">
          Tackle your paperwork with ease.
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg">
          Upload your university forms, PDFs, or applications. We&apos;ll help you fill them out automatically and
          seamlessly.
        </p>
        <div className="flex gap-4 mt-sm">
          <Button variant="primary" size="lg" className="rounded" onClick={openPicker} disabled={isBusy}>
            <Icon name="upload_file" />
            Upload new form
          </Button>
        </div>
        {error && (
          <p role="alert" className="font-label-sm text-label-sm text-error">
            {error}
          </p>
        )}
      </div>

      <button type="button" onClick={openPicker} disabled={isBusy} className="w-full md:w-1/2 text-left">
        <div className="shadow-card bg-surface-container-lowest rounded-lg p-lg flex flex-col items-center justify-center text-center border-2 border-dashed border-primary min-h-[300px] cursor-pointer hover:bg-surface-container-low transition-colors group disabled:opacity-70">
          {isBusy ? (
            <>
              <Icon name="progress_activity" className="text-primary text-4xl mb-md animate-spin" />
              <h3 className="font-headline-md text-headline-md text-on-background mb-xs">{STAGE_LABEL[stage]}</h3>
              <p className="text-on-surface-variant font-body-md text-body-md">This can take a few seconds.</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-primary-container/20 flex items-center justify-center mb-md group-hover:scale-110 transition-transform">
                <Icon name="cloud_upload" className="text-primary text-4xl" />
              </div>
              <h3 className="font-headline-md text-headline-md text-on-background mb-xs">Drop your PDF here</h3>
              <p className="text-on-surface-variant font-body-md text-body-md">or click to browse files</p>
              <p className="text-on-surface-variant/70 text-sm mt-4">Supports PDF (Max 10MB)</p>
            </>
          )}
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </section>
  );
}
