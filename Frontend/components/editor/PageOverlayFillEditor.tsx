'use client';

import { useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { PageImageCanvas } from '@/components/editor/PageImageCanvas';
import { PagePicker } from '@/components/editor/PagePicker';
import { getCellCenter, type CellCoord } from '@/lib/ratingGridGeometry';
import { api, type ApiFormTemplate, type FieldDefinition } from '@/lib/api';

type Coordinates = FieldDefinition['coordinates'];

function clampOffset(v: number): number {
  return Math.min(1.3, Math.max(-0.2, v));
}

function clampSize(v: number): number {
  return Math.min(1.4, Math.max(0.005, v));
}

function safeParseGrid(value: string): Record<string, string> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

interface PageOverlayFillEditorProps {
  /** Just enough of the template to render its page images — the full ApiFormTemplate for the
   * owner's own editor, or the smaller subset a share-token guest gets (PublicShareView). */
  template: Pick<ApiFormTemplate, '_id' | 'title' | 'pageImages'>;
  /** Exactly the fields this filler is allowed to see/edit — the owner's own section for the
   * student, or one section's fields for a share-token guest. */
  fields: FieldDefinition[];
  values: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
  suggestedSignature?: string;
  onSuggest?: (fieldId: string) => void;
  suggestingFieldId?: string | null;
  savingFieldId?: string | null;
  /**
   * Lets the filler drag a field's label to move its box, drag its corner to resize it, or
   * drag a rating-grid cell marker to correct it — right here, instead of a separate
   * field-position-editor page. Scoped to the owner's own authenticated session: the underlying
   * corrections (updateFieldCoordinates/updateGridCellOverride) both require auth a share-token
   * guest doesn't have, so this stays off by default for the guest fill canvas.
   */
  allowPositionEdit?: boolean;
  onPositionError?: (message: string) => void;
}

/**
 * Renders the real rasterized page as a background and every field as a live input positioned
 * exactly where it lands in the generated PDF — the Adobe-Acrobat-style "what you see is what you
 * get" experience, replacing the previous schema-driven field list (Frontend's DynamicFormEditor /
 * DynamicSharedFillForm + FieldRenderer). Reuses the exact page-image container, page picker, and
 * rating-grid cell math the field-position editor used (PageImageCanvas, PagePicker,
 * lib/ratingGridGeometry), and — when allowPositionEdit is on — the same drag/resize corrections
 * that used to live on their own separate page: the same box a person types into is the same box
 * they drag to fix, right here.
 */
export function PageOverlayFillEditor({
  template,
  fields,
  values,
  onChange,
  suggestedSignature,
  onSuggest,
  suggestingFieldId,
  savingFieldId,
  allowPositionEdit = false,
  onPositionError,
}: PageOverlayFillEditorProps) {
  const relevantPages = Array.from(new Set(fields.map((f) => f.page))).sort((a, b) => a - b);
  const [requestedPage, setPage] = useState(relevantPages[0] ?? 1);
  // Derived, not effect-synced: if `fields` ever changes shape (a different section, a
  // different template) and the previously-requested page no longer applies, fall back to the
  // first relevant page during render instead of chasing it with a setState-in-effect.
  const page = relevantPages.includes(requestedPage) ? requestedPage : (relevantPages[0] ?? 1);

  const [coordsOverride, setCoordsOverride] = useState<Record<string, Coordinates>>({});
  const [gridOverrides, setGridOverrides] = useState<Record<string, Record<string, Record<string, CellCoord>>>>(() =>
    Object.fromEntries(fields.filter((f) => f.type === 'rating_grid').map((f) => [f.id, f.gridCellOverrides ?? {}])),
  );
  const [savingPositionId, setSavingPositionId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const pageImage = template.pageImages?.find((p) => p.page === page);
  const pageFields = fields.filter((f) => f.page === page);

  function coordsFor(field: FieldDefinition): Coordinates {
    return coordsOverride[field.id] ?? field.coordinates;
  }

  async function persistCoords(fieldId: string, next: Coordinates) {
    setSavingPositionId(fieldId);
    try {
      await api.updateFieldCoordinates(template._id, fieldId, next);
    } catch {
      onPositionError?.('Could not save this position.');
    } finally {
      setSavingPositionId(null);
    }
  }

  async function persistGridCell(fieldId: string, criterion: string, option: string, next: CellCoord) {
    setSavingPositionId(fieldId);
    try {
      await api.updateGridCellOverride(template._id, fieldId, criterion, option, next);
    } catch {
      onPositionError?.('Could not save this cell position.');
    } finally {
      setSavingPositionId(null);
    }
  }

  function startDrag(field: FieldDefinition, mode: 'move' | 'resize', e: ReactPointerEvent) {
    if (!allowPositionEdit) return;
    e.preventDefault();
    e.stopPropagation();
    const container = containerRef.current;
    const start = coordsFor(field);
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    let latest = start;

    function onMove(ev: PointerEvent) {
      const dxFrac = (ev.clientX - startX) / rect.width;
      const dyFrac = (ev.clientY - startY) / rect.height;
      latest =
        mode === 'move'
          ? { ...start, x: clampOffset(start.x + dxFrac), y: clampOffset(start.y + dyFrac) }
          : { ...start, width: clampSize(start.width + dxFrac), height: clampSize(start.height + dyFrac) };
      setCoordsOverride((prev) => ({ ...prev, [field.id]: latest }));
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      void persistCoords(field.id, latest);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  /** A cell marker serves two purposes: a plain click selects that criterion's answer (always
   * available, guest fill included); a drag past a small threshold repositions the marker instead
   * (only when allowPositionEdit) — disambiguated by pointer movement, not a modifier key. */
  function handleGridCellPointerDown(
    field: FieldDefinition,
    criterion: string,
    option: string,
    initial: CellCoord,
    selections: Record<string, string>,
    e: ReactPointerEvent,
  ) {
    e.preventDefault();
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;
    let latest = initial;

    function onMove(ev: PointerEvent) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
      if (moved && allowPositionEdit) {
        latest = { x: clampOffset(initial.x + dx / rect.width), y: clampOffset(initial.y + dy / rect.height) };
        setGridOverrides((prev) => ({
          ...prev,
          [field.id]: { ...prev[field.id], [criterion]: { ...prev[field.id]?.[criterion], [option]: latest } },
        }));
      }
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (moved && allowPositionEdit) {
        void persistGridCell(field.id, criterion, option, latest);
      } else {
        onChange(field.id, JSON.stringify({ ...selections, [criterion]: option }));
      }
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  return (
    <div className="w-full flex flex-col gap-md">
      <PagePicker pages={relevantPages} page={page} onChange={setPage} />

      {allowPositionEdit && (
        <p className="font-label-sm text-label-sm text-on-surface-variant -mt-1">
          A field in the wrong spot? Drag its label to move it, or its corner handle to resize it — fixes it for
          everyone filling this same form.
        </p>
      )}

      <div className="w-full bg-surface-container-lowest rounded-lg shadow-card p-md overflow-x-auto">
        {pageImage ? (
          <PageImageCanvas
            ref={containerRef}
            src={api.getTemplatePagePreviewUrl(template._id, page)}
            alt={`Page ${page} of ${template.title}`}
            width={pageImage.width}
            height={pageImage.height}
            maxWidth={1000}
          >
            {pageFields.map((field) => (
              <FieldOverlay
                key={field.id}
                field={field}
                coordinates={coordsFor(field)}
                gridOverrides={gridOverrides[field.id]}
                value={values[field.id] ?? ''}
                onChange={(v) => onChange(field.id, v)}
                suggestedSignature={suggestedSignature}
                onSuggest={onSuggest}
                suggesting={suggestingFieldId === field.id}
                saving={savingFieldId === field.id || savingPositionId === field.id}
                allowPositionEdit={allowPositionEdit}
                onStartDrag={(mode, e) => startDrag(field, mode, e)}
                onGridCellPointerDown={(criterion, option, initial, selections, e) =>
                  handleGridCellPointerDown(field, criterion, option, initial, selections, e)
                }
              />
            ))}
          </PageImageCanvas>
        ) : (
          <p className="text-center text-on-surface-variant font-body-md text-body-md py-xl">
            No page preview available for page {page}.
          </p>
        )}
      </div>
    </div>
  );
}

function boxStyle(coordinates: Coordinates): CSSProperties {
  return {
    left: `${coordinates.x * 100}%`,
    top: `${coordinates.y * 100}%`,
    width: `${coordinates.width * 100}%`,
    height: `${coordinates.height * 100}%`,
  };
}

/** The small persistent label above every field box — doubles as the drag handle when position editing is on. */
function FieldTag({
  field,
  saving,
  draggable,
  onPointerDown,
}: {
  field: FieldDefinition;
  saving?: boolean;
  draggable?: boolean;
  onPointerDown?: (e: ReactPointerEvent) => void;
}) {
  return (
    <span
      onPointerDown={draggable ? onPointerDown : undefined}
      className={`absolute -top-5 left-0 whitespace-nowrap font-label-sm text-label-sm bg-surface-container-highest text-on-surface px-1.5 py-0.5 rounded shadow-sm z-10 ${
        draggable ? 'cursor-move' : ''
      }`}
    >
      {field.label}
      {field.required && ' *'}
      {saving && '  • saving…'}
    </span>
  );
}

/** Bottom-right resize handle, matching the field-position editor's own — shown only when allowPositionEdit is on. */
function ResizeHandle({ onPointerDown }: { onPointerDown: (e: ReactPointerEvent) => void }) {
  return (
    <div
      onPointerDown={onPointerDown}
      className="absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 rounded-full bg-primary border-2 border-surface-container-lowest cursor-nwse-resize z-10"
    />
  );
}

function AskAiButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={loading}
      title="Ask AI for a suggestion"
      className="absolute -top-5 right-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-label-sm text-label-sm text-primary bg-surface-container-highest shadow-sm hover:bg-primary-container/40 disabled:opacity-60 transition-colors z-10"
    >
      <Icon name="auto_awesome" className={loading ? 'animate-spin !text-sm' : '!text-sm'} />
      {loading ? '…' : 'Ask AI'}
    </button>
  );
}

interface FieldOverlayProps {
  field: FieldDefinition;
  coordinates: Coordinates;
  gridOverrides?: Record<string, Record<string, CellCoord>>;
  value: string;
  onChange: (value: string) => void;
  suggestedSignature?: string;
  onSuggest?: (fieldId: string) => void;
  suggesting?: boolean;
  saving?: boolean;
  allowPositionEdit: boolean;
  onStartDrag: (mode: 'move' | 'resize', e: ReactPointerEvent) => void;
  onGridCellPointerDown: (
    criterion: string,
    option: string,
    initial: CellCoord,
    selections: Record<string, string>,
    e: ReactPointerEvent,
  ) => void;
}

function FieldOverlay({
  field,
  coordinates,
  gridOverrides,
  value,
  onChange,
  suggestedSignature,
  onSuggest,
  suggesting,
  saving,
  allowPositionEdit,
  onStartDrag,
  onGridCellPointerDown,
}: FieldOverlayProps) {
  const canAskAi = onSuggest && (field.type === 'text' || field.type === 'long_text_ruled');
  const tag = <FieldTag field={field} saving={saving} draggable={allowPositionEdit} onPointerDown={(e) => onStartDrag('move', e)} />;
  const handle = allowPositionEdit ? <ResizeHandle onPointerDown={(e) => onStartDrag('resize', e)} /> : null;

  if (field.type === 'stamp') {
    return (
      <div className="absolute border border-dashed border-outline-variant rounded-sm flex items-center justify-center bg-surface-container/60" style={boxStyle(coordinates)}>
        {tag}
        {handle}
        <span className="font-label-sm text-label-sm text-on-surface-variant text-center px-1">Not digitally fillable</span>
      </div>
    );
  }

  if (field.type === 'computed') {
    return (
      <div className="absolute border border-outline-variant rounded-sm flex items-center px-1 bg-surface-container-low/80 italic" style={boxStyle(coordinates)}>
        {tag}
        {handle}
        <span className="font-label-sm text-label-sm text-on-surface-variant truncate">Calculated automatically</span>
      </div>
    );
  }

  if (field.type === 'rating_grid') {
    const criteria = field.gridCriteria ?? [];
    const options = field.gridOptions ?? [];
    const selections = safeParseGrid(value);

    return (
      <div className="absolute" style={boxStyle(coordinates)}>
        {tag}
        {handle}
        {criteria.flatMap((criterion, ri) =>
          options.map((option, oi) => {
            const cell = getCellCenter(field, gridOverrides, criterion, option, ri, oi);
            // Cell coordinates are absolute (fraction of the whole page); this wrapper div is
            // already positioned+sized to the field's own box, so re-express each cell relative
            // to the box's own top-left/width/height instead of the page.
            const relX = ((cell.x - coordinates.x) / coordinates.width) * 100;
            const relY = ((cell.y - coordinates.y) / coordinates.height) * 100;
            const selected = selections[criterion] === option;
            return (
              <button
                key={`${criterion}::${option}`}
                type="button"
                title={`${criterion} — ${option}`}
                onPointerDown={(e) => onGridCellPointerDown(criterion, option, cell, selections, e)}
                className={`absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 transition-colors ${
                  allowPositionEdit ? 'cursor-grab active:cursor-grabbing' : ''
                } ${selected ? 'bg-primary border-primary' : 'bg-surface-container-lowest/70 border-outline-variant hover:border-primary'}`}
                style={{ left: `${relX}%`, top: `${relY}%` }}
              />
            );
          }),
        )}
      </div>
    );
  }

  if (field.type === 'checkbox') {
    const checked = value === 'true';
    return (
      <button
        type="button"
        onClick={() => onChange(checked ? 'false' : 'true')}
        className="absolute flex items-center justify-center border-2 rounded-sm transition-colors border-outline-variant bg-surface-container-lowest/70 hover:border-primary"
        style={boxStyle(coordinates)}
      >
        {tag}
        {handle}
        {checked && <Icon name="check" className="text-primary !text-lg" />}
      </button>
    );
  }

  if (field.type === 'signature') {
    return (
      // items-start, not centered/stretched — matches pdf.service.ts's own convention for every
      // non-ruled field (drawTextOpaque draws the baseline one fontSize below the box's *top*).
      // Confirmed empirically against the real page image: the extracted box's top edge sits
      // right on the printed line itself, with a lot of reserved blank space *below* it (room
      // before the next field's own label) — so the line is at the top of the box, not centered
      // in it or at its bottom.
      <div className="absolute flex items-start" style={boxStyle(coordinates)}>
        {tag}
        {handle}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your full name to sign"
          autoComplete="off"
          className="w-full bg-transparent text-center focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-sm font-signature text-lg leading-none text-primary placeholder:font-body-md placeholder:text-xs placeholder:text-outline"
        />
        {suggestedSignature && suggestedSignature.trim() && value.trim() !== suggestedSignature.trim() && (
          <button
            type="button"
            onClick={() => onChange(suggestedSignature.trim())}
            className="absolute -bottom-5 left-0 whitespace-nowrap font-label-sm text-label-sm text-primary hover:underline bg-surface-container-highest px-1 rounded z-10"
          >
            Use &ldquo;{suggestedSignature.trim()}&rdquo;
          </button>
        )}
      </div>
    );
  }

  if (field.type === 'long_text_ruled') {
    return (
      <RuledTextField field={field} coordinates={coordinates} value={value} onChange={onChange} tag={tag} handle={handle}>
        {canAskAi && <AskAiButton onClick={() => onSuggest!(field.id)} loading={Boolean(suggesting)} />}
      </RuledTextField>
    );
  }

  // text | date — same top-aligned convention as signature above.
  return (
    <div className="absolute flex items-start" style={boxStyle(coordinates)}>
      {tag}
      {handle}
      {canAskAi && <AskAiButton onClick={() => onSuggest!(field.id)} loading={Boolean(suggesting)} />}
      <input
        type={field.type === 'date' ? 'date' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-sm font-body-md text-sm leading-none text-on-surface px-1"
      />
    </div>
  );
}

const RULED_LINE_HEIGHT_PX = 24;
const RULED_FONT_SIZE_PX = 14;

/**
 * A plain textarea has no idea where this page's *real* printed rules are, and trying to make its
 * default line spacing track them precisely (an earlier version of this component did, via a
 * single CSS line-height extrapolated from the field's detectedRuleYPositions) drifts out of sync
 * after a couple of lines — confirmed on the real reference form's longer answers, where later
 * lines visibly crossed through a rule instead of sitting above it. Small, cumulative CSS
 * line-height rounding just isn't precise enough to track pixel-measured image data reliably
 * across many lines.
 *
 * Fix: stop trying to align *to* the scanned lines at all. Mask them (an opaque background over
 * this field's own box only) and draw fresh synthetic lines from the exact same line-height value
 * the browser uses to lay out the text, so the lines and the text can never drift apart — by
 * construction, not by measurement. The generated PDF is unaffected: it still anchors to the real
 * detectedRuleYPositions server-side (Services/pdf.service.ts drawWrappedTextOnDetectedRules),
 * which is the actual source of truth: this is only the live-typing preview.
 */
function RuledTextField({
  field,
  coordinates,
  value,
  onChange,
  tag,
  handle,
  children,
}: {
  field: FieldDefinition;
  coordinates: Coordinates;
  value: string;
  onChange: (value: string) => void;
  tag: ReactNode;
  handle: ReactNode;
  children?: ReactNode;
}) {
  const hasRules = Boolean(field.detectedRuleYPositions && field.detectedRuleYPositions.length > 0);
  const textareaStyle: CSSProperties = hasRules
    ? {
        fontSize: `${RULED_FONT_SIZE_PX}px`,
        lineHeight: `${RULED_LINE_HEIGHT_PX}px`,
        backgroundColor: 'rgba(255,255,255,0.97)',
        backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${RULED_LINE_HEIGHT_PX - 1}px, rgba(100,116,139,0.55) ${RULED_LINE_HEIGHT_PX - 1}px, rgba(100,116,139,0.55) ${RULED_LINE_HEIGHT_PX}px)`,
      }
    : {};

  return (
    <div className="absolute" style={boxStyle(coordinates)}>
      {tag}
      {handle}
      {children}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={textareaStyle}
        className={`w-full h-full resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-sm font-body-md text-on-surface p-1 ${hasRules ? '' : 'bg-transparent'}`}
      />
    </div>
  );
}
