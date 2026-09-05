'use client';

import { forwardRef } from 'react';
import type { ReactNode } from 'react';

interface PageImageCanvasProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  children?: ReactNode;
  maxWidth?: number;
}

/**
 * The shared "rendered page as a background, everything else drawn on top by fractional
 * coordinate" container — used by both the field-position editor (drag/resize correction) and
 * the fill canvas (live inputs), so the two never drift into computing box position two
 * different ways.
 */
export const PageImageCanvas = forwardRef<HTMLDivElement, PageImageCanvasProps>(function PageImageCanvas(
  { src, alt, width, height, children, maxWidth = 900 },
  ref,
) {
  return (
    <div ref={ref} className="relative mx-auto select-none" style={{ width: '100%', maxWidth, aspectRatio: `${width} / ${height}` }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- server-rendered preview, not a static asset */}
      <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-contain pointer-events-none" draggable={false} />
      {children}
    </div>
  );
});
