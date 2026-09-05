'use client';

interface PagePickerProps {
  page: number;
  onChange: (page: number) => void;
  /** Full 1..pageCount range — the field-position editor's usual case. */
  pageCount?: number;
  /** An explicit, possibly non-contiguous subset of pages to offer instead (e.g. the fill canvas
   * scoping a guest's share to only the pages their section's fields actually appear on). Takes
   * precedence over pageCount when both are given. */
  pages?: number[];
}

/** The numbered page-jump row shared by the field-position editor and the fill canvas. */
export function PagePicker({ page, onChange, pageCount, pages }: PagePickerProps) {
  const options = pages ?? Array.from({ length: pageCount ?? 0 }, (_, i) => i + 1);
  if (options.length <= 1) return null;

  return (
    <div className="flex items-center gap-xs overflow-x-auto pb-1">
      {options.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`shrink-0 px-3 py-1.5 rounded-full font-label-sm text-label-sm transition-colors ${
            n === page ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Page {n}
        </button>
      ))}
    </div>
  );
}
