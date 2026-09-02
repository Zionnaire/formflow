'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

/** The real /submissions/:id/generate endpoint isn't wired up yet — see aiPipeline.controller.ts. */
export function DownloadButton() {
  const [clicked, setClicked] = useState(false);

  return (
    <div className="flex flex-col gap-xs">
      <Button variant="primary" className="w-full rounded-full shadow-card" onClick={() => setClicked(true)}>
        <Icon name="download" filled />
        Download Filled PDF
      </Button>
      {clicked && (
        <p className="font-label-sm text-label-sm text-on-surface-variant text-center">
          PDF generation isn&apos;t connected yet — this is a UI preview.
        </p>
      )}
    </div>
  );
}
