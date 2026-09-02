import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, label, id, children, ...props },
  ref,
) {
  return (
    <div className="flex flex-col gap-xs">
      {label && (
        <label className="font-label-md text-label-md text-on-surface-variant ml-1" htmlFor={id}>
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={cn(
          'w-full bg-surface-container-low border border-surface-dim rounded px-4 py-3 font-body-md text-body-md text-on-background transition-all shadow-sm appearance-none',
          'focus:outline-none focus:border-secondary-container focus:ring-1 focus:ring-secondary-container',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
});
