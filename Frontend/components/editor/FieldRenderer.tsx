'use client';

import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { SignatureBox } from '@/components/ui/SignatureBox';
import { Icon } from '@/components/ui/Icon';
import type { FieldDefinition } from '@/lib/api';

interface FieldRendererProps {
  field: FieldDefinition;
  value: string;
  onChange: (value: string) => void;
  suggestedSignature?: string;
}

/** Renders one field per FieldDefinition.type — see Backend/src/Types/index.ts for the vocabulary. */
export function FieldRenderer({ field, value, onChange, suggestedSignature }: FieldRendererProps) {
  switch (field.type) {
    case 'text':
      return <Input id={field.id} label={field.label} required={field.required} value={value} onChange={(e) => onChange(e.target.value)} />;

    case 'date':
      return (
        <Input id={field.id} type="date" label={field.label} required={field.required} value={value} onChange={(e) => onChange(e.target.value)} />
      );

    case 'checkbox':
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            id={field.id}
            type="checkbox"
            checked={value === 'true'}
            onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
            className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-secondary-container"
          />
          <span className="font-label-md text-label-md text-on-surface-variant">
            {field.label}
            {field.required && ' *'}
          </span>
        </label>
      );

    case 'long_text_ruled':
      return (
        <Textarea
          id={field.id}
          label={field.label}
          required={field.required}
          rows={Math.max(4, Math.min(field.ruledLineCount ?? 6, 14))}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'signature':
      return <SignatureBox id={field.id} label={field.label} value={value} onChange={onChange} suggestedName={suggestedSignature} />;

    case 'rating_grid':
      return <RatingGrid field={field} value={value} onChange={onChange} />;

    case 'stamp':
      return (
        <div className="flex items-center gap-sm p-4 rounded-lg border border-dashed border-outline-variant bg-surface-container text-on-surface-variant">
          <Icon name="approval" />
          <span className="font-body-md text-body-md">{field.label} — not digitally fillable, leave blank for a physical stamp.</span>
        </div>
      );

    case 'computed':
      return (
        <div className="flex flex-col gap-xs">
          <label className="font-label-md text-label-md text-on-surface-variant ml-1">{field.label}</label>
          <div className="px-4 py-3 rounded bg-surface-container-low border border-surface-dim text-on-surface-variant italic">
            Calculated automatically
          </div>
        </div>
      );

    default:
      return null;
  }
}

function RatingGrid({ field, value, onChange }: { field: FieldDefinition; value: string; onChange: (value: string) => void }) {
  const criteria = field.gridCriteria ?? [];
  const options = field.gridOptions ?? ['Excellent', 'Very Good', 'Good', 'Fair', 'Poor'];
  const selections: Record<string, string> = safeParse(value);

  function select(criterion: string, option: string) {
    onChange(JSON.stringify({ ...selections, [criterion]: option }));
  }

  return (
    <div className="flex flex-col gap-xs">
      <label className="font-label-md text-label-md text-on-surface-variant ml-1">{field.label}</label>
      <div className="overflow-x-auto rounded-lg border border-surface-variant">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface-container-high">
              <th className="text-left p-sm font-label-md text-label-md text-on-surface">Criteria</th>
              {options.map((opt) => (
                <th key={opt} className="p-sm font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap">
                  {opt}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criteria.map((criterion) => (
              <tr key={criterion} className="border-t border-surface-variant">
                <td className="p-sm font-body-md text-body-md text-on-surface">{criterion}</td>
                {options.map((opt) => (
                  <td key={opt} className="p-sm text-center">
                    <input
                      type="radio"
                      name={`${field.id}-${criterion}`}
                      checked={selections[criterion] === opt}
                      onChange={() => select(criterion, opt)}
                      className="w-4 h-4 text-primary focus:ring-secondary-container"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function safeParse(value: string): Record<string, string> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
