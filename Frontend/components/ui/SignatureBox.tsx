'use client';

import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface SignatureBoxProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  /** Shown as a one-click "use this" shortcut — typically the name already typed elsewhere in the form. */
  suggestedName?: string;
}

/**
 * A typed e-signature: whatever the signer types renders live in a script font. Editable at
 * any time (no lock-in step) so a unique signature isn't forced on anyone. See brief section 9
 * on visual-vs-legal signature disclosure — the caption below makes that distinction explicit.
 */
export function SignatureBox({ id = 'signature', label = 'Signature', value, onChange, suggestedName }: SignatureBoxProps) {
  const hasSignature = value.trim().length > 0;
  const showSuggestion = suggestedName && suggestedName.trim().length > 0 && value.trim() !== suggestedName.trim();

  return (
    <div>
      <div className="flex items-center justify-between mb-xs ml-1">
        <label htmlFor={id} className="font-label-md text-label-md text-on-surface-variant">
          {label}
        </label>
        {showSuggestion && (
          <button
            type="button"
            onClick={() => onChange(suggestedName!.trim())}
            className="font-label-sm text-label-sm text-primary hover:underline"
          >
            Use &ldquo;{suggestedName!.trim()}&rdquo;
          </button>
        )}
      </div>

      <div
        className={cn(
          'w-full min-h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors px-6 py-4 relative',
          hasSignature ? 'border-primary bg-primary-fixed/10' : 'border-outline-variant bg-surface-container',
        )}
      >
        <Icon name="draw" className={cn('text-[22px] transition-colors', hasSignature ? 'text-primary' : 'text-outline')} />
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your full name to sign"
          autoComplete="off"
          className="w-full max-w-sm bg-transparent text-center focus:outline-none font-signature text-4xl leading-tight text-primary placeholder:font-body-md placeholder:text-base placeholder:text-outline"
        />
        {hasSignature && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear signature"
            className="absolute top-2 right-2 p-1 rounded-full text-outline hover:text-primary hover:bg-surface-container-high transition-colors"
          >
            <Icon name="close" className="text-[16px]" />
          </button>
        )}
      </div>

      <p className="font-label-sm text-label-sm text-outline mt-1 ml-1">
        Typing your name creates a visual signature for administrative convenience — not a legally binding e-signature.
      </p>
    </div>
  );
}
