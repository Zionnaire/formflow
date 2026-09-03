import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, label, helperText, id, ...props },
  ref,
) {
  return (
    <div className="flex flex-col gap-xs">
      {label && (
        <label className="font-label-md text-label-md text-on-surface-variant ml-1" htmlFor={id}>
          {label}
        </label>
      )}
      {helperText && <p className="font-body-sm text-body-sm text-on-surface-variant/80 ml-1 -mt-1">{helperText}</p>}
      <textarea
        ref={ref}
        id={id}
        className={cn(
          'w-full bg-surface-container-low border border-surface-dim rounded px-4 py-3 font-body-md text-body-md text-on-background transition-all shadow-sm resize-y',
          'placeholder:text-outline-variant',
          'focus:outline-none focus:border-secondary-container focus:ring-1 focus:ring-secondary-container',
          className,
        )}
        {...props}
      />
    </div>
  );
});
