'use client';

import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { api, ApiRequestError, type ApiFormTemplate, type FieldDefinition } from '@/lib/api';

type Coordinates = FieldDefinition['coordinates'];
type CellCoord = { x: number; y: number };

function clampOffset(v: number): number {
  return Math.min(1.3, Math.max(-0.2, v));
}

function clampSize(v: number): number {
  return Math.min(1.4, Math.max(0.005, v));
}

/** Same uniform-division fallback pdf.service.ts's drawRatingGrid computes server-side, so an
 * uncorrected cell marker starts out exactly where the generated PDF would actually mark it. */
function defaultCellCenter(field: FieldDefinition, criterionIndex: number, optionIndex: number): CellCoord {
  const criteriaCount = field.gridCriteria?.length ?? 1;
  const optionsCount = field.gridOptions?.length ?? 1;
  const colWidth = field.coordinates.width / (optionsCount + 1); // +1 for the criteria-label column
  const rowHeight = field.coordinates.height / criteriaCount;
  return {
    x: field.coordinates.x + (optionIndex + 1.5) * colWidth,
    y: field.coordinates.y + (criterionIndex + 0.5) * rowHeight,
  };
}

/**
 * Lets a student drag a misplaced field's box into the right spot on the real rendered page,
 * instead of that needing an engineering fix — saving writes back to the template itself, so
 * it's fixed for everyone who fills out this same form from here on (Backend's
 * Services/template.service.ts updateFieldCoordinates).
 */
export function FieldPositionEditor({ submissionId }: { submissionId: string }) {
  const [template, setTemplate] = useState<ApiFormTemplate | null>(null);
  const [page, setPage] = useState(1);
  const [coords, setCoords] = useState<Record<string, Coordinates>>({});
  const [gridOverrides, setGridOverrides] = useState<Record<string, Record<string, Record<string, CellCoord>>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { submission } = await api.getSubmission(submissionId);
        const templateId = typeof submission.formTemplateId === 'string' ? submission.formTemplateId : submission.formTemplateId._id;
        const { template } = await api.getTemplate(templateId);
        if (cancelled) return;
        setTemplate(template);
        setCoords(Object.fromEntries(template.fieldSchema.map((f) => [f.id, f.coordinates])));
        setGridOverrides(
          Object.fromEntries(
            template.fieldSchema.filter((f) => f.type === 'rating_grid').map((f) => [f.id, f.gridCellOverrides ?? {}]),
          ),
        );
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiRequestError ? err.message : 'Could not load this form.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  if (loading) {
    return (
      <main className="flex-grow flex items-center justify-center py-xl">
        <Icon name="progress_activity" className="text-primary text-4xl animate-spin" />
      </main>
    );
  }

  if (error && !template) {
    return (
      <main className="flex-grow flex flex-col items-center justify-center gap-md py-xl text-center px-margin">
        <Icon name="error" className="text-error text-4xl" />
        <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">{error}</p>
        <Link href={`/forms/${submissionId}/editor`} className="text-primary font-label-md text-label-md hover:underline">
          Back to editor
        </Link>
      </main>
    );
  }

  if (!template) return null;

  const pageImage = template.pageImages?.find((p) => p.page === page);
  const pageFields = template.fieldSchema.filter((f) => f.page === page);
  const selectedField = pageFields.find((f) => f.id === selectedId);
  const selectedIsRatingGrid = selectedField?.type === 'rating_grid' && !!selectedField.gridCriteria?.length && !!selectedField.gridOptions?.length;

  async function persist(fieldId: string, next: Coordinates) {
    setSavingId(fieldId);
    setError(null);
    try {
      await api.updateFieldCoordinates(template!._id, fieldId, next);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not save this position.');
    } finally {
      setSavingId(null);
    }
  }

  function startDrag(fieldId: string, mode: 'move' | 'resize', e: ReactPointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(fieldId);
    const container = containerRef.current;
    const initial = coords[fieldId];
    if (!container || !initial) return;
    const start: Coordinates = initial;

    const rect = container.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    let latest: Coordinates = start;

    function onMove(ev: PointerEvent) {
      const dxFrac = (ev.clientX - startX) / rect.width;
      const dyFrac = (ev.clientY - startY) / rect.height;
      latest =
        mode === 'move'
          ? { ...start, x: clampOffset(start.x + dxFrac), y: clampOffset(start.y + dyFrac) }
          : { ...start, width: clampSize(start.width + dxFrac), height: clampSize(start.height + dyFrac) };
      setCoords((prev) => ({ ...prev, [fieldId]: latest }));
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      void persist(fieldId, latest);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function getCellCenter(field: FieldDefinition, criterion: string, option: string, criterionIndex: number, optionIndex: number): CellCoord {
    return gridOverrides[field.id]?.[criterion]?.[option] ?? defaultCellCenter(field, criterionIndex, optionIndex);
  }

  async function persistGridCell(fieldId: string, criterion: string, option: string, next: CellCoord) {
    setSavingId(fieldId);
    setError(null);
    try {
      await api.updateGridCellOverride(template!._id, fieldId, criterion, option, next);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not save this cell position.');
    } finally {
      setSavingId(null);
    }
  }

  function startGridCellDrag(fieldId: string, criterion: string, option: string, initial: CellCoord, e: ReactPointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    const start: CellCoord = initial;

    const rect = container.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    let latest: CellCoord = start;

    function onMove(ev: PointerEvent) {
      const dxFrac = (ev.clientX - startX) / rect.width;
      const dyFrac = (ev.clientY - startY) / rect.height;
      latest = { x: clampOffset(start.x + dxFrac), y: clampOffset(start.y + dyFrac) };
      setGridOverrides((prev) => ({
        ...prev,
        [fieldId]: { ...prev[fieldId], [criterion]: { ...prev[fieldId]?.[criterion], [option]: latest } },
      }));
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      void persistGridCell(fieldId, criterion, option, latest);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  return (
    <main className="flex-grow w-full max-w-5xl mx-auto px-margin py-lg flex flex-col gap-md">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-sm">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">
            Fix field positions
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1 max-w-xl">
            {selectedIsRatingGrid
              ? 'Drag one of the small dots to move where that row/column mark actually lands. Each dot is one criterion × option cell.'
              : 'Drag a box to move it, or drag its bottom-right corner to resize. Saved changes apply to this form for everyone, not just you.'}
          </p>
        </div>
        <Link href={`/forms/${submissionId}/editor`}>
          <Button variant="ghost" className="rounded-full">
            <Icon name="arrow_back" className="text-[18px]" />
            Back to editor
          </Button>
        </Link>
      </header>

      {template.pageCount > 1 && (
        <div className="flex items-center gap-xs overflow-x-auto pb-1">
          {Array.from({ length: template.pageCount }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setPage(n);
                setSelectedId(null);
              }}
              className={`shrink-0 px-3 py-1.5 rounded-full font-label-sm text-label-sm transition-colors ${
                n === page ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              Page {n}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="font-label-sm text-label-sm text-error">
          {error}
        </p>
      )}

      <div className="w-full bg-surface-container-lowest rounded-lg shadow-card p-md overflow-x-auto">
        {pageImage ? (
          <div
            ref={containerRef}
            className="relative mx-auto select-none"
            style={{ width: '100%', maxWidth: 900, aspectRatio: `${pageImage.width} / ${pageImage.height}` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- server-rendered preview, not a static asset */}
            <img
              src={api.getTemplatePagePreviewUrl(template._id, page)}
              alt={`Page ${page} of ${template.title}`}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              draggable={false}
            />
            {pageFields.map((field) => {
              const c = coords[field.id];
              if (!c) return null;
              const isSelected = selectedId === field.id;
              return (
                <div
                  key={field.id}
                  onPointerDown={(e) => startDrag(field.id, 'move', e)}
                  className={`absolute border-2 rounded-sm cursor-move transition-colors ${
                    isSelected ? 'border-primary bg-primary/10' : 'border-secondary/70 bg-secondary/5 hover:border-primary'
                  }`}
                  style={{
                    left: `${c.x * 100}%`,
                    top: `${c.y * 100}%`,
                    width: `${c.width * 100}%`,
                    height: `${c.height * 100}%`,
                  }}
                >
                  <span className="absolute -top-5 left-0 whitespace-nowrap font-label-sm text-label-sm bg-surface-container-highest text-on-surface px-1.5 py-0.5 rounded shadow-sm">
                    {field.label}
                    {savingId === field.id && '  • saving…'}
                  </span>
                  <div
                    onPointerDown={(e) => startDrag(field.id, 'resize', e)}
                    className="absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 rounded-full bg-primary border-2 border-surface-container-lowest cursor-nwse-resize"
                  />
                </div>
              );
            })}

            {selectedId &&
              pageFields
                .filter((f) => f.id === selectedId && f.type === 'rating_grid' && f.gridCriteria?.length && f.gridOptions?.length)
                .flatMap((field) =>
                  field.gridCriteria!.flatMap((criterion, ri) =>
                    field.gridOptions!.map((option, oi) => {
                      const cell = getCellCenter(field, criterion, option, ri, oi);
                      return (
                        <div
                          key={`${field.id}::${criterion}::${option}`}
                          onPointerDown={(e) => startGridCellDrag(field.id, criterion, option, cell, e)}
                          title={`${criterion} — ${option}`}
                          className="absolute w-3.5 h-3.5 -ml-[7px] -mt-[7px] rounded-full bg-tertiary border-2 border-surface-container-lowest shadow-sm cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                          style={{ left: `${cell.x * 100}%`, top: `${cell.y * 100}%` }}
                        />
                      );
                    }),
                  ),
                )}
          </div>
        ) : (
          <p className="text-center text-on-surface-variant font-body-md text-body-md py-xl">
            No page preview available for page {page}.
          </p>
        )}
      </div>

      {pageFields.length === 0 && (
        <p className="text-center text-on-surface-variant font-body-md text-body-md py-md">No fields on this page.</p>
      )}
    </main>
  );
}
