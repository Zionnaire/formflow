import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'amber' | 'neutral' | 'error' | 'primary';

const toneClasses: Record<Tone, string> = {
  amber: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  neutral: 'bg-surface-variant text-on-surface-variant',
  error: 'bg-error-container text-on-error-container',
  primary: 'bg-primary-container text-on-primary-container',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 px-3 py-1 rounded-full font-label-sm text-label-sm', toneClasses[tone], className)}
      {...props}
    />
  );
}
