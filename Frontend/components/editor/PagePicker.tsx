'use client';

/** The numbered page-jump row shared by the field-position editor and the fill canvas. */
export function PagePicker({ pageCount, page, onChange }: { pageCount: number; page: number; onChange: (page: number) => void }) {
  if (pageCount <= 1) return null;

  return (
    <div className="flex items-center gap-xs overflow-x-auto pb-1">
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
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
