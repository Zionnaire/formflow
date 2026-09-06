'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { PageImageCanvas } from '@/components/editor/PageImageCanvas';
import { PagePicker } from '@/components/editor/PagePicker';
import { getCellCenter } from '@/lib/ratingGridGeometry';
import { api, type ApiFormTemplate, type FieldDefinition } from '@/lib/api';

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

/**
 * Renders the real rasterized page as a background and every field as a live input positioned
 * exactly where it lands in the generated PDF — the Adobe-Acrobat-style "what you see is what you
 * get" experience, replacing the previous schema-driven field list (Frontend's DynamicFormEditor /
 * DynamicSharedFillForm + FieldRenderer). Reuses the exact page-image container, page picker, and
 * rating-grid cell math the field-position editor already uses (PageImageCanvas, PagePicker,
 * lib/ratingGridGeometry) — the same box a person drags to correct a field's position is the same
 * box they now type directly into.
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
}: PageOverlayFillEditorProps) {
  const relevantPages = Array.from(new Set(fields.map((f) => f.page))).sort((a, b) => a - b);
  const [requestedPage, setPage] = useState(relevantPages[0] ?? 1);
  // Derived, not effect-synced: if `fields` ever changes shape (a different section, a
  // different template) and the previously-requested page no longer applies, fall back to the
  // first relevant page during render instead of chasing it with a setState-in-effect.
  const page = relevantPages.includes(requestedPage) ? requestedPage : (relevantPages[0] ?? 1);

  const pageImage = template.pageImages?.find((p) => p.page === page);
  const pageFields = fields.filter((f) => f.page === page);

  return (
    <div className="w-full flex flex-col gap-md">
      <PagePicker pages={relevantPages} page={page} onChange={setPage} />

      <div className="w-full bg-surface-container-lowest rounded-lg shadow-card p-md overflow-x-auto">
        {pageImage ? (
          <PageImageCanvas
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
                value={values[field.id] ?? ''}
                onChange={(v) => onChange(field.id, v)}
                suggestedSignature={suggestedSignature}
                onSuggest={onSuggest}
                suggesting={suggestingFieldId === field.id}
                saving={savingFieldId === field.id}
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

function boxStyle(field: FieldDefinition): CSSProperties {
  return {
    left: `${field.coordinates.x * 100}%`,
    top: `${field.coordinates.y * 100}%`,
    width: `${field.coordinates.width * 100}%`,
    height: `${field.coordinates.height * 100}%`,
  };
}

/** The small persistent label above every field box — what a plain box floating on a page image needs to stay legible. */
function FieldTag({ field, saving }: { field: FieldDefinition; saving?: boolean }) {
  return (
    <span className="absolute -top-5 left-0 whitespace-nowrap font-label-sm text-label-sm bg-surface-container-highest text-on-surface px-1.5 py-0.5 rounded shadow-sm z-10">
      {field.label}
      {field.required && ' *'}
      {saving && '  • saving…'}
    </span>
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
  value: string;
  onChange: (value: string) => void;
  suggestedSignature?: string;
  onSuggest?: (fieldId: string) => void;
  suggesting?: boolean;
  saving?: boolean;
}

function FieldOverlay({ field, value, onChange, suggestedSignature, onSuggest, suggesting, saving }: FieldOverlayProps) {
  const canAskAi = onSuggest && (field.type === 'text' || field.type === 'long_text_ruled');

  if (field.type === 'stamp') {
    return (
      <div className="absolute border border-dashed border-outline-variant rounded-sm flex items-center justify-center bg-surface-container/60" style={boxStyle(field)}>
        <FieldTag field={field} />
        <span className="font-label-sm text-label-sm text-on-surface-variant text-center px-1">Not digitally fillable</span>
      </div>
    );
  }

  if (field.type === 'computed') {
    return (
      <div className="absolute border border-outline-variant rounded-sm flex items-center px-1 bg-surface-container-low/80 italic" style={boxStyle(field)}>
        <FieldTag field={field} />
        <span className="font-label-sm text-label-sm text-on-surface-variant truncate">Calculated automatically</span>
      </div>
    );
  }

  if (field.type === 'rating_grid') {
    const criteria = field.gridCriteria ?? [];
    const options = field.gridOptions ?? [];
    const selections = safeParseGrid(value);

    return (
      <div className="absolute" style={boxStyle(field)}>
        <FieldTag field={field} saving={saving} />
        {criteria.flatMap((criterion, ri) =>
          options.map((option, oi) => {
            const cell = getCellCenter(field, field.gridCellOverrides, criterion, option, ri, oi);
            // Cell coordinates are absolute (fraction of the whole page); this wrapper div is
            // already positioned+sized to the field's own box, so re-express each cell relative
            // to the box's own top-left/width/height instead of the page.
            const relX = ((cell.x - field.coordinates.x) / field.coordinates.width) * 100;
            const relY = ((cell.y - field.coordinates.y) / field.coordinates.height) * 100;
            const selected = selections[criterion] === option;
            return (
              <button
                key={`${criterion}::${option}`}
                type="button"
                title={`${criterion} — ${option}`}
                onClick={() => onChange(JSON.stringify({ ...selections, [criterion]: option }))}
                className={`absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 transition-colors ${
                  selected ? 'bg-primary border-primary' : 'bg-surface-container-lowest/70 border-outline-variant hover:border-primary'
                }`}
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
        style={boxStyle(field)}
      >
        <FieldTag field={field} saving={saving} />
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
      <div className="absolute flex items-start" style={boxStyle(field)}>
        <FieldTag field={field} saving={saving} />
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
      <RuledTextField field={field} value={value} onChange={onChange} saving={saving}>
        {canAskAi && <AskAiButton onClick={() => onSuggest!(field.id)} loading={Boolean(suggesting)} />}
      </RuledTextField>
    );
  }

  // text | date — same top-aligned convention as signature above.
  return (
    <div className="absolute flex items-start" style={boxStyle(field)}>
      <FieldTag field={field} saving={saving} />
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

/**
 * Aligns each wrapped line to the field's own real detected printed rules (Backend's
 * Services/ruleDetection.service.ts, same data pdf.service.ts's drawWrappedTextOnDetectedRules
 * already anchors to) instead of the browser's default line spacing — a plain textarea has no
 * idea where this page's rules actually are, so its lines drift off them as text wraps. Falls
 * back to ordinary line spacing when detection found nothing to anchor to (pdf.service.ts falls
 * back to masking in that same case).
 */
function RuledTextField({
  field,
  value,
  onChange,
  saving,
  children,
}: {
  field: FieldDefinition;
  value: string;
  onChange: (value: string) => void;
  saving?: boolean;
  children?: ReactNode;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [boxHeightPx, setBoxHeightPx] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height;
      if (height) setBoxHeightPx(height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const rules = field.detectedRuleYPositions;
  let textareaStyle: CSSProperties = {};
  if (rules && rules.length > 0 && boxHeightPx) {
    const sorted = [...rules].sort((a, b) => a - b);
    // Each rule is a fraction of the whole *page* height — re-express relative to this field's
    // own box (already the coordinate space boxStyle positions it in) to get a pixel offset from
    // the box's own top edge, using the box's current *rendered* height (responsive layout, not
    // the page's raw pixel size).
    const relPx = sorted.map((r) => ((r - field.coordinates.y) / field.coordinates.height) * boxHeightPx);
    const firstLinePx = relPx[0]!;
    const gapPx = relPx.length > 1 ? (relPx[relPx.length - 1]! - firstLinePx) / (relPx.length - 1) : firstLinePx;
    const fontSizePx = Math.max(9, Math.min(15, gapPx * 0.55));
    // A line box's baseline sits close to its own bottom edge (minus a small descent) for most
    // fonts — so setting line-height to the real rule spacing and pushing the *bottom* of the
    // first line box to the first detected rule (paddingTop = firstLinePx - lineHeight) lands
    // each wrapped line close to its own real rule, the same anchor pdf.service.ts's
    // drawWrappedTextOnDetectedRules uses server-side.
    textareaStyle = {
      fontSize: `${fontSizePx}px`,
      lineHeight: `${gapPx}px`,
      paddingTop: `${Math.max(0, firstLinePx - gapPx)}px`,
      paddingBottom: 0,
    };
  }

  return (
    <div ref={wrapperRef} className="absolute" style={boxStyle(field)}>
      <FieldTag field={field} saving={saving} />
      {children}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={textareaStyle}
        className="w-full h-full bg-transparent resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-sm font-body-md text-on-surface px-1"
      />
    </div>
  );
}
