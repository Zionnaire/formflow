import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'text';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-surface-tint shadow-card active:scale-95',
  secondary:
    'bg-surface-container-highest text-on-surface hover:bg-surface-variant border border-outline-variant active:scale-95',
  outline: 'bg-transparent border border-outline-variant text-on-surface hover:bg-surface-container-low active:scale-95',
  ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container-low active:scale-95',
  text: 'bg-transparent text-primary hover:underline p-0',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-4 py-2 text-label-sm',
  md: 'px-6 py-3 text-label-md',
  lg: 'px-8 py-3 text-label-md',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-label-md transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none',
        variant !== 'text' && sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
});
