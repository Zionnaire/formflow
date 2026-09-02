import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-surface-container-lowest rounded-lg shadow-card border border-transparent', className)}
      {...props}
    />
  );
}
