import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, hint, id, ...props },
  ref,
) {
  return (
    <div className="flex flex-col gap-xs">
      {label && (
        <label className="font-label-md text-label-md text-on-surface-variant ml-1" htmlFor={id}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          'w-full bg-surface-container-low border border-surface-dim rounded px-4 py-3 font-body-md text-body-md text-on-background transition-all shadow-sm',
          'placeholder:text-outline-variant',
          'focus:outline-none focus:border-secondary-container focus:ring-1 focus:ring-secondary-container',
          className,
        )}
        {...props}
      />
      {hint && <p className="font-label-sm text-label-sm text-outline">{hint}</p>}
    </div>
  );
});
