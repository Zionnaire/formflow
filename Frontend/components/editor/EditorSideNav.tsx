'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { LogoMark } from '@/components/ui/Logo';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';

interface EditorSideNavProps {
  progress: number;
  onAutoFill: () => void;
  onSaveProgress: () => void;
  saved: boolean;
  saving?: boolean;
  autoFilling?: boolean;
}

export function EditorSideNav({ progress, onAutoFill, onSaveProgress, saved, saving = false, autoFilling = false }: EditorSideNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="md:hidden fixed top-0 w-full z-30 shadow-sm bg-background px-margin py-base flex justify-between items-center">
        <Link href="/" className="font-headline-md-mobile text-headline-lg-mobile font-bold text-primary flex items-center gap-2">
          <LogoMark size={24} />
          FormFlow
        </Link>
        <button onClick={() => setOpen(true)} className="p-2 rounded-full hover:bg-surface-container-low text-on-surface-variant transition-colors" aria-label="Open form editor menu">
          <Icon name="menu" />
        </button>
      </header>

      <aside
        className={cn(
          'fixed right-0 top-0 h-full w-80 bg-surface-container-low shadow-floating flex flex-col p-md z-40 transition-transform duration-300 ease-in-out transform md:translate-x-0',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="mb-lg">
          <h2 className="font-headline-md text-headline-md text-primary mb-1">Form Editor</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Complete your application</p>
        </div>

        <nav className="flex-1 flex flex-col gap-sm">
          <div className="bg-secondary-container text-on-secondary-container rounded-lg px-4 py-3 flex flex-col items-start gap-2 w-full text-left">
            <div className="flex items-center gap-3 w-full">
              <Icon name="assignment_turned_in" filled />
              <span className="font-label-md text-label-md flex-1">Progress Tracker</span>
              <span className="font-label-sm text-label-sm font-bold">{progress}%</span>
            </div>
            <ProgressBar value={progress} className="w-full mt-1 bg-on-secondary-container/20" barClassName="bg-on-secondary-container" />
          </div>

          <button
            onClick={onAutoFill}
            disabled={autoFilling}
            className="text-on-surface-variant hover:bg-surface-variant/50 rounded-lg px-4 py-3 flex items-center gap-3 w-full text-left transition-all active:scale-[0.98] disabled:opacity-60"
          >
            <Icon name={autoFilling ? 'progress_activity' : 'face'} className={autoFilling ? 'animate-spin' : undefined} />
            <span className="font-label-md text-label-md">{autoFilling ? 'Auto-filling…' : 'Auto-fill Profile'}</span>
          </button>

          <button
            onClick={onSaveProgress}
            disabled={saving}
            className="text-on-surface-variant hover:bg-surface-variant/50 rounded-lg px-4 py-3 flex items-center gap-3 w-full text-left transition-all active:scale-[0.98] disabled:opacity-60"
          >
            <Icon name="save" />
            <span className="font-label-md text-label-md">{saving ? 'Saving…' : saved ? 'Saved just now' : 'Save Progress'}</span>
          </button>
        </nav>

        <div className="mt-auto pt-md">
          <Link
            href="/forms"
            className="w-full bg-primary text-on-primary rounded-lg px-4 py-3 font-label-md text-label-md shadow-sm hover:bg-on-primary-container transition-colors active:scale-95 flex items-center justify-center gap-2"
          >
            <Icon name="pause_circle" className="text-[20px]" />
            Save &amp; continue later
          </Link>
        </div>

        <button
          onClick={() => setOpen(false)}
          className="md:hidden absolute top-4 right-4 p-2 rounded-full hover:bg-surface-variant text-on-surface-variant"
          aria-label="Close form editor menu"
        >
          <Icon name="close" />
        </button>
      </aside>

      {open && <div className="md:hidden fixed inset-0 bg-on-background/20 z-30" onClick={() => setOpen(false)} />}
    </>
  );
}
