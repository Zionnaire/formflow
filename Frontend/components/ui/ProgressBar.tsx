import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  className?: string;
  trackClassName?: string;
  barClassName?: string;
}

export function ProgressBar({ value, className, trackClassName, barClassName }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('h-1.5 rounded-full overflow-hidden bg-surface-container-high', trackClassName, className)}>
      <div
        className={cn('h-full rounded-full bg-tertiary transition-all duration-500 ease-out', barClassName)}
        style={{ width: `${clamped}%` }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
